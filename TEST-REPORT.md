# IndianOrthoCare — End-to-End Functional & Operational Test Report

**Application:** Doxa CareX — Medical Equipment Service Platform (AMC / PM / Tickets / Technicians / Sales Orders)
**Stack:** React 18 + Vite 5 + TypeScript + shadcn-ui + Supabase (PostgreSQL 17 + RLS + Edge Functions)
**Commit tested:** `8bcc1d1` ("Cleared demo data") on `claude/confident-goldberg-oorfxc`
**Date:** 9 October 2026
**Checks executed:** 123 (static analysis, 16 DB migrations, 60 RLS permission probes, 63 real-browser E2E assertions)

---

## 1. Verdict

**Not production-ready.** The build is clean and the admin console works well, but four defects break core
operations or expose data:

| # | Severity | Defect | Impact |
|---|---|---|---|
| 1 | **CRITICAL** | Technician portal can never show assigned work | Entire field-engineer workflow is dead |
| 2 | **CRITICAL** | `bootstrap-default-users` is publicly callable with the service-role key | Anyone can mint an admin or reset any account's password |
| 3 | **CRITICAL** | App re-seeds 84 demo rows into an empty database | The "Cleared demo data" commit is undone on the next admin login |
| 4 | **HIGH** | `create-technician-user` never grants the `technician` role | Every technician login created from the UI has zero data access |

The admin side is genuinely solid: auth guards, RLS isolation between technicians, privilege-escalation
blocking, and the AMC→PM business rule all passed. The failures are concentrated in the technician path,
the public QR path, and provisioning.

### Test-environment caveat (read this before acting)

This container's egress policy **denied `axjwkwkoksognhxycvvh.supabase.co`**, so the live project could not
be reached. Everything below was tested against a faithful local replica: a fresh PostgreSQL 16 with the
repository's **own 16 migrations applied unmodified**, a Supabase-compatible `auth` schema
(`auth.uid()`/`auth.role()`/`auth.users`), the real `anon`/`authenticated`/`service_role` roles, and a
PostgREST/GoTrue-compatible gateway so the real app ran in a real Chromium against real RLS.

What this means for confidence:
- Findings 1, 3, 4, 5, 6, 7, 8, 11 were **reproduced end-to-end** and are behavioural facts of this code.
- Finding 2 is read from `supabase/config.toml` + the function source. The code and config are
  unambiguous; what I could **not** verify is whether that function is currently deployed. **Verify and
  remediate it first** — see §8.
- Production runs PostgreSQL 17 vs. 16 locally. No finding here depends on that difference.

To re-run this suite against the live project, add `axjwkwkoksognhxycvvh.supabase.co` to the environment's
allowed domains (cloud environment menu → Edit → Network access).

---

## 2. Static analysis & build

| Check | Result | Detail |
|---|---|---|
| `tsc --noEmit` | **PASS** | 0 type errors |
| `npm run build` | **PASS** | 2977 modules, 12.1s |
| `npm test` (vitest) | **PASS (vacuous)** | 1 test: `expect(true).toBe(true)` — zero real coverage |
| `npm run lint` | **FAIL** | 35 errors, 10 warnings |
| `npx playwright test` | **FAIL** | config imports `lovable-agent-playwright-config`, which is not a dependency |
| Migrations on fresh PG | **PASS** | 16/16 applied cleanly, in order, no manual fixes |
| Bundle size | **WARN** | `index.js` 1,677 kB (480 kB gzip), no code splitting |

The 35 lint errors are almost entirely `@typescript-eslint/no-explicit-any`. That is not cosmetic here: the
repo generates full Supabase types in `src/integrations/supabase/types.ts`, and then `DataContext.tsx:52`
does `const sb = supabase as any`, discarding them for every query in the app. **Finding 4 (a missing
`user_roles` insert) and finding 1 (name vs. ID) are exactly the class of bug those types would have
caught.**

---

## 3. CRITICAL — Technician portal can never display assigned work

**Root cause: the UI and the database disagree about what `assigned_technician` holds.**

The admin UI writes the technician's **name**:

- `src/pages/Tickets.tsx:203` — `<SelectItem key={t.id} value={t.name}>`
- `src/components/pm/PMKanbanBoard.tsx:66` — `value={t.name}`
- `src/components/pm/PMListView.tsx:67` — `value={t.name}`
- `src/pages/PMSchedules.tsx:98` — `updatePMSchedule(pm.id, { assignedTechnician: tech.name, ... })`

The RLS policies compare it to the technician's **ID**
(`supabase/migrations/20260421171407_*.sql:122-134`, `146-160`):

```sql
CREATE FUNCTION public.current_technician_id() RETURNS TEXT AS $$
  SELECT id FROM public.technicians WHERE user_id = auth.uid() LIMIT 1   -- returns 'TECH-001'
$$;

CREATE POLICY "Technicians view assigned tickets" ON public.tickets
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'technician') AND assigned_technician = current_technician_id());
```

And `TechnicianPortal.tsx:41,46` filters by **name** again:

```js
tickets.filter(t => t.assignedTechnician === selectedTech?.name)
pmSchedules.filter(p => p.assignedTechnician === selectedTech?.name)
```

So the three layers require two mutually exclusive values. **Both directions fail, which is why there is no
data shape that works:**

```
Stored value = 'Uthayakumar B'  (what the admin UI actually writes — verified)
  tickets visible to technician    = 0   ← RLS rejects it
  PM rows visible to technician    = 0   ← RLS rejects it
  technician can close ticket      = 0 rows, and NO error returned to the client
  Browser: portal shows  0 TICKETS / 0 PM DUE / 0 DONE, "No tickets assigned"

Stored value = 'TECH-001'  (what RLS expects)
  RLS passes the row through, but TechnicianPortal.tsx:41 name-filter never matches
  Browser: portal shows  0 TICKETS / 0 PM DUE / 0 DONE, "No tickets assigned"
```

Verified against the real write path — assigning a technician in the admin UI produced
`PATCH /rest/v1/tickets?id=eq.TK-900 → 200` and wrote:

```
TK-900 | Assigned | Dhinakar Justus Raj A     ← name
current_technician_id() for that user = TECH-010   ← ID
```

**Fix (one consistent choice; the ID is the correct one):** store `technicians.id` in
`tickets.assigned_technician` and `pm_schedules.assigned_technician`. Change the four write sites to
`value={t.id}` / `assignedTechnician: tech.id`, change `TechnicianPortal.tsx:41,46` to compare against
`technicianId`, resolve the name only for display, migrate existing rows
(`UPDATE tickets t SET assigned_technician = x.id FROM technicians x WHERE t.assigned_technician = x.name`),
and add a FK so this cannot drift again (§7, finding 21). `PMSchedules.tsx:53,89,183` also group workload by
name and need the same change.

---

## 4. CRITICAL — `bootstrap-default-users` grants admin to unauthenticated callers

`supabase/config.toml`:

```toml
[functions.bootstrap-default-users]
verify_jwt = false
```

`supabase/functions/bootstrap-default-users/index.ts` runs with `SUPABASE_SERVICE_ROLE_KEY` (line 20), takes
`adminEmail` / `adminPassword` straight from the request body (line 27), and has **no authentication, no
authorization, no shared secret, and no idempotency guard**. It then:

1. `createUser({ email, password, email_confirm: true })` — creates a confirmed account, and
2. `user_roles.upsert({ user_id, role: 'admin' })` — grants that account full admin.

Worse, `findOrCreateUser` (lines 41-50) handles an existing email by **overwriting its password**:

```js
const existing = list.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
if (existing) {
  await supabaseAdmin.auth.admin.updateUserById(existing.id, { password });  // ← account takeover
  return { id: existing.id, created: false };
}
```

So an unauthenticated POST can either mint a brand-new admin, or **reset the real administrator's password
to an attacker-chosen value and keep their admin role**. Admin role grants full read/write on every table,
including all customer PII. The function is a one-time ops tool and is not called anywhere in `src/`.

**Fix:** delete the function (preferred — it has served its purpose), or at minimum set `verify_jwt = true`,
require `has_role(auth.uid(),'admin')` inside it, and remove the password-overwrite branch. Then **rotate
the admin password and audit `auth.users` and `user_roles` for accounts you did not create.**

---

## 5. CRITICAL — The app re-seeds demo data into an empty database

`DataContext.tsx:138-141` runs `seedIfEmpty()` on every mount, before anything else:

```js
const { count } = await sb.from('customers').select('*', { count:'exact', head:true });
if ((count ?? 0) > 0) return;
// ...otherwise insert the entire contents of src/data/mockData.ts
```

The final migration `20260528111528_*.sql` is five bare `DELETE FROM` statements that empty the business
tables. So the schema now ships in exactly the state that triggers re-seeding.

**Reproduced:** emptied the tables, logged in as admin, loaded the dashboard, touched nothing else:

```
POST /rest/v1/customers     -> 201
POST /rest/v1/equipment     -> 201
POST /rest/v1/tickets       -> 201
POST /rest/v1/amc_contracts -> 201
POST /rest/v1/pm_schedules  -> 201

Resulting row counts:  customers=7  equipment=52  tickets=5  amc=8  pm=12
Sample: C001 | Omandurar Government Estate, Chennai | +91 98765 43210 | admin@omandurar.gov.in
        C002 | Thanjavur Medical College & Hospital  | +91 87654 32109 | admin@thanjavurmc.gov.in
```

84 fabricated rows carrying real-looking government-hospital names, phone numbers and `.gov.in` email
addresses are written into the live database by the act of opening the app. Anyone auditing the system sees
fake contracts and fake equipment as real records.

**Fix:** delete `seedIfEmpty` and its call site. Seeding belongs in a migration or a deliberate script, never
in an app-load path. Keep the empty-state UI instead. If you want demo data, gate it behind an explicit
`import.meta.env.DEV` check.

---

## 6. HIGH severity

### 6.1 `create-technician-user` never grants the `technician` role

`supabase/functions/create-technician-user/index.ts` creates the auth user and links
`technicians.user_id`, but — unlike `bootstrap-default-users`, which does it correctly — **never inserts into
`user_roles`**. No frontend code does it either (`grep -rn "user_roles" src/` → only a read in
`AuthContext.tsx:28`).

Every RLS policy for technicians is gated on `has_role(auth.uid(),'technician')`, so the account is inert.
Verified against the real policies:

```
UI-created technician (no user_roles row):
  has_role(technician)?           rows=0
  own technicians row             rows=1   ← so AuthContext sets isTechnician = true
  MY assigned tickets             rows=0
  MY assigned PMs                 rows=0
  customers                       rows=0
  equipment                       rows=0
  UPDATE my ticket status         rows=0

Correctly bootstrapped technician (control):
  my tickets                      rows=1
  my PMs                          rows=1
```

Because `AuthContext.tsx:33` derives `isTechnician` from the `technicians.user_id` link rather than the role,
the user *is* let into the portal — they just see nothing. Meanwhile `Technicians.tsx:115` shows
`toast.success('Login created for …')`. The admin is told it worked.

**Fix:** add the role insert to the function, next to the `technicians` update:
```ts
await supabaseAdmin.from("user_roles").upsert({ user_id: userData.user.id, role: "technician" }, { onConflict: "user_id,role" });
```
Backfill any technicians already created this way. Also gate the function on an admin check — it currently
accepts any authenticated caller (§7, finding 13) and can create arbitrary users with chosen passwords.

### 6.2 Anonymous users can read all customer PII, all equipment and all sales orders

The `anon` key is hardcoded in `src/integrations/supabase/client.ts:5-6` and ships in the JS bundle, so
"anon" means "anyone on the internet". Measured against the real policies:

```
ANON  read customers (PII)    rows=2  ← ALL rows: name, contact person, phone, email, address
ANON  read equipment          rows=2  ← ALL rows incl. model + serial numbers
ANON  read sales_orders       rows=1  ← order pipeline, customers, status, delivery %
ANON  read sync_log           rows=1
ANON  read tickets            rows=0  ✓
ANON  read amc_contracts      rows=0  ✓
ANON  read pm_schedules       rows=0  ✓
ANON  read technicians        rows=0  ✓
ANON  read user_roles         rows=0  ✓
```

Root cause: `"Anon read customers for QR"` and `"Anon read equipment for QR"` are
`FOR SELECT TO anon USING (true)` — unrestricted full-table reads, created so the public QR page could fetch
one equipment row. `sales_orders_read_all` / `sync_log_read_all` grant `anon, authenticated` blanket reads
with no QR justification at all.

Together this is your full customer list, your entire installed base with serial numbers, and your sales
pipeline — readable by anyone who views source. For a hospital-equipment vendor that is both a commercial
intelligence leak and a privacy problem.

**Fix:** the QR page needs one equipment row, not the table. Replace the two `USING (true)` policies with a
`SECURITY DEFINER` RPC that takes an equipment ID and returns only the fields the QR form renders (name,
model, serial, customer name) — no addresses, no phone numbers, no contact persons, no table scan. Restrict
`sales_orders` and `sync_log` to `authenticated` at minimum, ideally to admins.

### 6.3 Public QR "Raise Ticket" is broken after the first submission

`src/pages/RaiseTicket.tsx:44-46`:

```js
const { data: lastTicket } = await sb.from('tickets').select('id').order('id',{ascending:false}).limit(1);
const lastNum = lastTicket?.[0]?.id ? parseInt(lastTicket[0].id.replace('TK-','')) : 0;
const newId = `TK-${String(lastNum + 1).padStart(3,'0')}`;
```

This runs as `anon`, and `anon` has **no SELECT policy on `tickets`** (correctly). RLS returns an empty set
rather than an error, so `lastNum` is always `0` and `newId` is always `TK-001`. Reproduced:

```
STEP1 equipment visible to anon: 1
STEP2 rows returned by ticket-id probe (anon): 0      ← always empty
QR_SUBMIT_1 = FAILED -> duplicate key value violates unique constraint "tickets_pkey"
QR_SUBMIT_2 = FAILED -> duplicate key value violates unique constraint "tickets_pkey"
```

The customer sees `alert('Failed to submit. Please try again.')` and retrying can never succeed. Every QR
code on every installed machine leads to a dead form as soon as `TK-001` exists.

**Fix:** stop generating IDs on the client. Give `tickets.id` a database default
(`'TK-' || lpad(nextval('ticket_seq')::text, 3, '0')`) and omit `id` from the insert, or create the ticket
through a `SECURITY DEFINER` RPC that allocates the ID server-side. That also removes the
read-before-write entirely.

### 6.4 Opening the AMC page silently writes contracts, then force-reloads the browser

`src/pages/AMCContracts.tsx:158-162` fires an unconditional effect on mount:

```js
useEffect(() => { if (equipment.length > 0) autoCreateAMCForExpiringEquipment(); }, [equipment.length]);
```

It inserts an AMC contract for every piece of equipment whose warranty expires within 180 days — with
`price: 0` and `status: 'Quotation Sent'` — then calls `window.location.reload()` (line 151).

**Reproduced:** navigating to `/amc` with no interaction produced `POST /rest/v1/amc_contracts → 201` and
created `AMC-002 | E002 | Fortis Clinic | 2027-02-01 | 2028-02-01 | 0.00 | Quotation Sent`.

Three problems: (a) viewing a page is not consent to create commercial contracts; (b) zero-price contracts
pollute revenue reporting, and I confirmed one can then be walked all the way to **"Payment Received" at
₹0.00** with no validation; (c) `window.location.reload()` discards all app state and re-fetches everything
— the comment block at lines 145-150 shows this was knowingly left in as a workaround. Two admins opening
the page at once both compute the same `maxNum`, so one insert fails on the PK and the whole batch is lost
to a `console.error` (line 153).

**Fix:** make it an explicit action — a "Generate renewal quotations" button with a confirmation listing what
will be created — and refresh via the DataContext instead of `window.location.reload()`. Reject
`Payment Received` on a contract with `price = 0`.

---

## 7. Medium & low severity

| # | Sev | Finding | Evidence / root cause |
|---|---|---|---|
| 8 | Med | Anyone can forge tickets, including pre-assigned and pre-completed ones | `"Anon create ticket from QR"` is `WITH CHECK (true)`. Verified: `ANON INSERT ticket pre-ASSIGNED to a tech → rows=1` with `status='Completed'`, `assigned_technician='TECH-005'`. No rate limit. Restrict the check to `status='Pending' AND assigned_technician IS NULL`, or route QR submissions through an RPC. |
| 9 | Low | Data-wiping statements committed as migrations | **Corrected after verification — I originally named only one file and overstated the impact.** There are five such migrations, not one: `20260415191423` (`TRUNCATE` of all five business tables), `20260415192730` (`TRUNCATE technicians`), `20260415204438` and `20260415205607` (each a bare `DELETE FROM` appended to a policy change), and `20260528111528` (five bare `DELETE FROM`). But I then applied the whole chain to a fresh database and measured the net effect: `technicians = 12` (the real staff, re-seeded afterwards by `20260415193512`) and the business tables empty — which is the intended outcome. The four 2026-04-15 files are historical reset-before-reseed steps that truncate already-empty tables on a fresh environment, and migrations run once per environment, so they are harmless where they sit. The genuine residual risk is narrower than "wipes data every time": `20260528111528` is the newest migration and has no re-seed after it, so restoring a production backup into an environment whose migration history is behind it would wipe the restored rows. That one is now a documented no-op (the file is kept so recorded history stays consistent); the older four are left alone. |
| 10 | Low | Tracked `.env`, and dead/misleading config | **Corrected after verification — this is lower severity than first written, and no rotation is needed.** I decoded the committed keys: the one in `client.ts:5-6` carries `role: "anon"` for project `axjwkwkoksognhxycvvh`, and the one in `.env` is an `sb_publishable_…` key. Both are *public by design* — the anon key ships inside the JS bundle regardless, and access is governed by RLS, not key secrecy. **No service-role key is committed anywhere**; every service-role use goes through `Deno.env.get` or GitHub Actions secrets, which is correct. What remains is real but minor: `.env` was tracked while `.gitignore` did not list it, nothing in `src/` reads `import.meta.env.VITE_*`, and its values point at a different project than `client.ts` — so it was dead, misleading config sitting exactly where a service-role key eventually gets added by accident. Untrack it, ignore it, replace with `.env.example`. |
| 11 | Med | RLS-blocked writes report success to the user | PostgREST returns `200` with zero rows when RLS filters an UPDATE, so `error` is `null`. Verified: `TECH_UPDATE_CUSTOMER: no SQL error raised, rows affected = 0`. Every `updateTicket`/`updatePMSchedule`/`updateCustomer` path in `DataContext.tsx` checks only `error`, never the row count — so denied writes show a success toast and the UI optimistically updates to a state the database rejected. Use `.select()` on mutations and treat an empty result as failure. |
| 12 | Med | Login dead-ends silently for a user with no role | `AdminLogin.tsx:37-39` navigates only `if (user && isAdmin)` or `if (user && isTechnician)`. A valid login with neither leaves the user on the login screen with no error — credentials accepted, nothing happens. This is exactly the state finding 6.1 creates. Add an else-branch. |
| 13 | Med | `create-technician-user` and `sync-sales-orders` have no admin gate | Both only inherit the default `verify_jwt`, so **any** authenticated user — including a technician — can call them. The first creates arbitrary auth users with chosen passwords and relinks technician records; the second launches a 45-minute portal scrape (trigger-spam / cost vector). Add `has_role(auth.uid(),'admin')` checks. |
| 14 | Low | CI publishes portal screenshots as artifacts | `.github/workflows/sync-growsmart.yml` uploads `debug-*.png` with `if: always()`. Those are screenshots of a logged-in sales portal and may contain customer and order data, downloadable by anyone with repo read access. Upload only on failure, or drop it. |
| 15 | Low | Real employee PII in the repo | `20260330164733_*.sql` seeds 12 real staff names into `technicians`. Fine if intended; worth a conscious decision since the repo may be shared. |
| 16 | Low | Effectively no automated test coverage | One placeholder assertion. `npx playwright test` cannot even start (config imports `lovable-agent-playwright-config`, absent from `package.json`). Every defect in this report was reachable by a first test. |
| 17 | Low | No FK on the assignment columns | `tickets.assigned_technician` and `pm_schedules.assigned_technician` are free-text with no constraint — which is what let finding 1 drift undetected. Add `REFERENCES technicians(id)` once the values are IDs. |
| 18 | Low | Client-side `max+1` ID generation races | `DataContext.tsx:57-63` computes IDs from local state for customers, equipment, tickets, AMCs. Two concurrent admins collide on the PK. Move to DB sequences/defaults (same fix as 6.3). |
| 19 | Low | Duplicate profile fetch on every load | `AuthContext.tsx:37-55` calls `loadProfile` from both the `onAuthStateChange` handler (which fires for `INITIAL_SESSION`) and the `getSession().then()` path. Measured 35 `GET /user_roles` and 54 `GET /technicians` across ~19 page loads. Guard on the event type. |
| 20 | Low | `DataContext` ignores `INITIAL_SESSION` | `DataContext.tsx:267-272` reloads only on `SIGNED_IN`/`SIGNED_OUT`/`TOKEN_REFRESHED`, while `init()` fires immediately on mount without waiting for session restore. Data did load correctly in every test, so this is latent rather than active — but it is a race, not a design. |
| 21 | Low | Inconsistent date formatting | `Tickets.tsx:137,191` render `{t.createdDate}` raw (`2026-03-02`) while `SalesOrders.tsx:82` and the PM board use `toLocaleDateString('en-IN')` (`02 Mar 2026`). |
| 22 | Low | 1.68 MB main bundle | No route-level code splitting; `jspdf` + `html2canvas` + `recharts` are all in the initial chunk. `React.lazy` on the routes would cut first load substantially. |

---

## 8. What passed — verified working

Worth stating plainly, because the admin console is in good shape and the hardening migration
(`20260421171407`) did its job.

**Authentication & authorization (16/16 public checks passed)**
- `/`, `/customers`, `/equipment`, `/tickets`, `/amc`, `/pm-schedules`, `/technicians`, `/sales-orders` all
  redirect to `/login` when unauthenticated; `/technician-portal` redirects to `/technician-login`.
- Invalid credentials show an error and stay on the page; empty submit does not navigate.
- Session survives a full page reload; sign-out works and post-logout routes are blocked again.
- A technician who reaches an admin route is redirected to their portal, not shown admin data.

**RLS isolation — 60 permission probes against the real policies**
- Privilege escalation via `user_roles` is blocked for `anon`, technicians, and no-role users (all `BLOCKED`).
- Cross-technician isolation holds: `TECH2 update TECH1 ticket → rows=0`, `TECH2 update TECH1 pm → rows=0`.
- Technicians cannot write customers, cannot insert tickets, cannot reassign their own tickets to someone
  else, and cannot edit their own technician record.
- `anon` cannot insert customers or sales orders, and cannot update or delete anything.
- Admin CRUD works across all tables (insert/update/delete all confirmed).

**Core business logic**
- The AMC lifecycle offers all four statuses (`Quotation Sent → PO Released → Invoice Generated → Payment
  Received`), and setting **Payment Received correctly auto-generated exactly 4 quarterly PM schedules** at
  3-month intervals (`PM-002-Q1` 2027-02-01, `Q2` 2027-05-01, `Q3` 2027-08-01, `Q4` 2027-11-01) — verified
  in the DB. The `pm_schedules_amc_pm_unique (amc_id, pm_number)` constraint and the existing-PM guard make
  it idempotent.
- Admin ticket assignment persists (`PATCH → 200`). Customer creation persists and appears in the list.
- Dashboard renders with 4 chart surfaces and live DB data. PM Kanban correctly computes
  TOTAL/PENDING/ASSIGNED/COMPLETED/UNASSIGNED/OVERDUE and flags overdue items.
- QR page loads valid equipment and shows a proper "Equipment not found" state for an unknown ID.
- All 16 migrations apply cleanly in order; schema has sensible FKs with `ON DELETE RESTRICT`, `set_updated_at`
  triggers on all 7 business tables, and indexes on the columns actually filtered.
- `has_role()` and `current_technician_id()` are both `SECURITY DEFINER` with `SET search_path = public` —
  correctly written.

---

## 9. Recommended order of work

**Before any further production use**
1. Settle `assigned_technician` on IDs across the four write sites, `TechnicianPortal.tsx:41,46`, and
   `PMSchedules.tsx:53,89,183`; migrate existing rows; add the FK. *(Finding 1 — the technician portal is
   dead until this is done.)*
2. Delete `bootstrap-default-users`, then rotate the admin password and audit `auth.users` / `user_roles`
   for accounts you did not create. *(Finding 2)*
3. Remove `seedIfEmpty` from `DataContext.tsx` and purge any demo rows it has already written.
   *(Finding 3)*
4. Add the `user_roles` insert to `create-technician-user` and backfill existing technician accounts.
   *(Finding 4)*

**Next**
5. Replace the two `USING (true)` anon policies with a narrow QR RPC; restrict `sales_orders` / `sync_log`.
   *(6.2)*
6. Move ticket-ID generation into the database. *(6.3, 18)*
7. Make AMC auto-creation an explicit, confirmed action and drop `window.location.reload()`. *(6.4)*
8. Tighten the anon ticket-insert check; add admin gates to both remaining edge functions. *(8, 13)*
9. `git rm --cached .env`, add it to `.gitignore`. *(10 — no key rotation needed; see the corrected finding)*
10. Treat zero-row mutations as failures instead of successes. *(11)*

**Then**
11. Fix the Playwright config and write regression tests for findings 1, 3, 4, 6.2 and 6.3 first — each is a
    few lines and each would have caught a critical defect. Clear the 35 lint errors and drop
    `supabase as any` so the generated types start earning their keep.

---

## 10. How this was tested

| Layer | Method |
|---|---|
| Static | `tsc --noEmit`, `eslint`, `vite build`, `vitest run` |
| Schema | All 16 repo migrations applied unmodified to a fresh PostgreSQL 16 with a Supabase-compatible `auth` schema and the real `anon`/`authenticated`/`service_role` roles |
| Authorization | 60 probes executing real statements under `SET LOCAL role` + `request.jwt.claims`, across 5 principals: anon, admin, two technicians, and an authenticated user with no role |
| Application | Real Chromium (Playwright) driving the actual Vite dev build, with Supabase traffic routed to a PostgREST/GoTrue-compatible gateway over the local database — so every page, form and workflow ran against real RLS |
| Coverage | 13 routes, 7 admin pages, both login flows, the public QR flow, the technician portal, and the AMC→PM and ticket-assignment workflows end to end |

Not covered, and why: the live Supabase project (egress-denied — see §1); the deployed state of the three
Edge Functions (same reason — they were reviewed as source); the GrowsmartSMB portal scrape, which needs
`PORTAL_EMAIL`/`PORTAL_PASSWORD` and reaches a third-party site; and PDF quotation rendering, which was
confirmed present but not opened.
