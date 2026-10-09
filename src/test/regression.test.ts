import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Source-level guards for the four defects that broke production behaviour.
// Each asserts the specific invariant the bug violated. They are cheap, need
// no backend, and fail loudly if the same mistake is reintroduced.

const root = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const migrations = () => {
  const dir = join(root, 'supabase', 'migrations');
  return readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .map(f => ({ name: f, sql: readFileSync(join(dir, f), 'utf8') }));
};

describe('technician assignment stores ids, not names', () => {
  // The admin UI used to write technicians.name into assigned_technician while
  // the RLS policies compared it to current_technician_id(), which returns
  // technicians.id. The two could never match, so the portal was always empty.
  const assignmentFiles = [
    'src/pages/Tickets.tsx',
    'src/components/pm/PMKanbanBoard.tsx',
    'src/components/pm/PMListView.tsx',
  ];

  for (const file of assignmentFiles) {
    it(`${file} does not put a technician name in a SelectItem value`, () => {
      expect(read(file)).not.toMatch(/value=\{(t|tech)\.name\}/);
    });
  }

  it('PMSchedules auto-assign passes an id', () => {
    const src = read('src/pages/PMSchedules.tsx');
    expect(src).not.toMatch(/assignedTechnician:\s*tech\.name/);
    expect(src).toMatch(/assignedTechnician:\s*tech\.id/);
  });

  it('nothing compares assignedTechnician against a name', () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) walk(rel);
        else if (/\.tsx?$/.test(entry.name)) {
          const src = readFileSync(join(root, rel), 'utf8');
          if (/assignedTechnician\s*===\s*\w+(\?)?\.name/.test(src)) offenders.push(rel);
        }
      }
    };
    walk('src');
    expect(offenders).toEqual([]);
  });

  it('the technician portal filters by the id the JWT resolves to', () => {
    const src = read('src/pages/TechnicianPortal.tsx');
    expect(src).toMatch(/assignedTechnician\s*===\s*technicianId/);
  });

  it('a migration constrains assigned_technician to technicians(id)', () => {
    const all = migrations().map(m => m.sql).join('\n');
    expect(all).toMatch(/tickets_assigned_technician_fkey[\s\S]*REFERENCES public\.technicians\(id\)/);
    expect(all).toMatch(/pm_schedules_assigned_technician_fkey[\s\S]*REFERENCES public\.technicians\(id\)/);
  });
});

describe('the app never seeds the database', () => {
  // seedIfEmpty() inserted the whole of mockData.ts whenever customers was
  // empty, so an admin simply opening the app wrote back 84 fabricated rows.
  it('DataContext has no seeding path', () => {
    const src = read('src/context/DataContext.tsx');
    expect(src).not.toMatch(/seedIfEmpty/);
    expect(src).not.toMatch(/seedCustomers|seedEquipment|seedTickets|seedAMCContracts|seedPMSchedules|seedTechnicians/);
  });

  it('no module imports demo rows', () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) walk(rel);
        else if (/\.tsx?$/.test(entry.name)) {
          const src = readFileSync(join(root, rel), 'utf8');
          if (/from '@\/data\/mockData'/.test(src)) offenders.push(rel);
        }
      }
    };
    walk('src');
    expect(offenders).toEqual([]);
  });

  it('the types module carries no data arrays', () => {
    const src = read('src/data/types.ts');
    expect(src).not.toMatch(/^export const \w+(:| =)/m);
  });
});

describe('technician provisioning grants the technician role', () => {
  // The edge function created the auth user and linked technicians.user_id but
  // never inserted into user_roles, so every RLS policy for technicians failed
  // and the account saw nothing.
  const fn = () => read('supabase/functions/create-technician-user/index.ts');

  it('upserts the technician role', () => {
    expect(fn()).toMatch(/from\("user_roles"\)[\s\S]{0,200}role:\s*"technician"/);
  });

  it('requires an admin caller', () => {
    const src = fn();
    expect(src).toMatch(/has_role/);
    expect(src).toMatch(/Admin role required/);
  });

  it('a migration backfills the role for already-linked accounts', () => {
    const all = migrations().map(m => m.sql).join('\n');
    expect(all).toMatch(/INSERT INTO public\.user_roles[\s\S]{0,400}'technician'/);
  });
});

describe('the anonymous surface stays narrow', () => {
  it('the two unrestricted anon SELECT policies are dropped', () => {
    // Asserting the *net* policy set needs the database; that lives in
    // supabase/tests/rls.sql. Here we pin the two specific policies that
    // exposed all customer PII and the whole installed base.
    const all = migrations().map(m => m.sql).join('\n');
    expect(all).toMatch(/DROP POLICY IF EXISTS "Anon read customers for QR"/);
    expect(all).toMatch(/DROP POLICY IF EXISTS "Anon read equipment for QR"/);
  });

  it('sales orders and the sync log are admin-gated', () => {
    const all = migrations().map(m => m.sql).join('\n');
    expect(all).toMatch(/DROP POLICY IF EXISTS "sales_orders_read_all"/);
    expect(all).toMatch(/DROP POLICY IF EXISTS "sync_log_read_all"/);
    expect(all).toMatch(/CREATE POLICY "sales_orders_read_admin"[\s\S]{0,200}has_role\(auth\.uid\(\), 'admin'\)/);
    expect(all).toMatch(/CREATE POLICY "sync_log_read_admin"[\s\S]{0,200}has_role\(auth\.uid\(\), 'admin'\)/);
  });

  it('the QR page reads one row through a function, not the table', () => {
    const src = read('src/pages/RaiseTicket.tsx');
    expect(src).toMatch(/rpc\('get_equipment_for_qr'/);
    expect(src).not.toMatch(/from\('equipment'\)/);
  });

  it('anon cannot insert tickets directly', () => {
    const all = migrations().map(m => m.sql).join('\n');
    expect(all).toMatch(/DROP POLICY IF EXISTS "Anon create ticket from QR"/);
  });

  it('the QR lookup returns no customer contact fields', () => {
    const all = migrations().map(m => m.sql).join('\n');
    const fn = all.slice(all.indexOf('FUNCTION public.get_equipment_for_qr'));
    const body = fn.slice(0, fn.indexOf('$$;'));
    for (const leaked of ['address', 'contact_person', 'phone', 'email']) {
      expect(body).not.toMatch(new RegExp(`\\b${leaked}\\b`));
    }
  });
});

describe('ids come from the database', () => {
  // Client-side max+1 always produced TK-001 on the QR page, because anon
  // cannot read tickets - so every public request after the first collided.
  it('no client-side id sequence helper remains', () => {
    expect(read('src/context/DataContext.tsx')).not.toMatch(/const nextId\s*=/);
  });

  it('the QR page does not compute a ticket id', () => {
    const src = read('src/pages/RaiseTicket.tsx');
    expect(src).not.toMatch(/TK-\$\{/);
    expect(src).toMatch(/rpc\('create_ticket_from_qr'/);
  });

  it('a migration sets id defaults from sequences', () => {
    const all = migrations().map(m => m.sql).join('\n');
    for (const table of ['customers', 'equipment', 'tickets', 'amc_contracts', 'technicians']) {
      expect(all).toMatch(new RegExp(`ALTER TABLE public\\.${table}\\s+ALTER COLUMN id SET DEFAULT`));
    }
  });

  it('the QR function fixes status and assignment itself', () => {
    const all = migrations().map(m => m.sql).join('\n');
    const fn = all.slice(all.indexOf('FUNCTION public.create_ticket_from_qr'));
    expect(fn).toMatch(/'Pending',\s*--\s*never caller-controlled/);
    expect(fn).toMatch(/NULL,\s*--\s*never caller-controlled/);
  });
});

describe('failures are not presented as successes', () => {
  it('single-row updates require an affected row', () => {
    const src = read('src/context/DataContext.tsx');
    expect(src).toMatch(/const requireRowsUpdated/);
    // Every .eq('id', ...) update should be wrapped.
    const bare = src.match(/const \{ error \} = await sb[\s\S]{0,400}?\.eq\('id'/g) ?? [];
    expect(bare).toEqual([]);
  });

  it('the technician portal reports update failures', () => {
    const src = read('src/pages/TechnicianPortal.tsx');
    expect(src).toMatch(/catch/);
    expect(src).toMatch(/toast\.error/);
  });

  it('login does not dead-end an account with no role', () => {
    const src = read('src/pages/AdminLogin.tsx');
    expect(src).toMatch(/profileLoaded/);
    expect(src).toMatch(/no access yet/);
  });

  it('AMC contracts are not created by rendering the page', () => {
    const src = read('src/pages/AMCContracts.tsx');
    expect(src).not.toMatch(/useEffect\([\s\S]{0,200}autoCreateAMC/);
    expect(src).not.toMatch(/window\.location\.reload/);
    expect(src).toMatch(/createRenewalContracts/);
  });
});
