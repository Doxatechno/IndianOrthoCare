// Sync sales orders from GrowsmartSMB portal → Supabase
// Reverse-engineered the portal's internal JSON API:
//   POST /login (form-encoded) → connect.sid cookie
//   GET  /api/orders?field=...&pagelength=N → { message, main: [...] }
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const PORTAL = 'https://ios.growsmartsmb.in';
const FIELDS = [
  'id', 'orderno',
  'partners/name/customerid',
  'customerid', 'orderdate', 'deliverydate',
  'status', 'deliveredpct', 'invoicedpct', 'deliveryfor',
].join(',');

function parseDate(v: unknown): string | null {
  if (!v || typeof v !== 'string') return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

async function loginAndFetch(email: string, password: string, limit = 500) {
  const jar = new Map<string, string>();
  const collect = (res: Response) => {
    const setCookies = (res.headers as any).getSetCookie?.() || [];
    for (const c of setCookies) {
      const [kv] = c.split(';');
      const [k, v] = kv.split('=');
      if (k && v) jar.set(k.trim(), v);
    }
  };
  const cookie = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');

  // Seed session
  collect(await fetch(`${PORTAL}/spa`, { redirect: 'manual' }));

  // Login
  const loginRes = await fetch(`${PORTAL}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: cookie() },
    body: new URLSearchParams({ email, password }),
    redirect: 'manual',
  });
  collect(loginRes);
  const loc = loginRes.headers.get('location') ?? '';
  if (loginRes.status !== 302 || loc.includes('login')) {
    throw new Error(`Portal login failed (status=${loginRes.status}, redirect=${loc})`);
  }

  // Fetch orders
  const url = `${PORTAL}/api/orders?field=${encodeURIComponent(FIELDS)}&pagelength=${limit}`;
  const ordersRes = await fetch(url, {
    headers: { cookie: cookie(), accept: 'application/json' },
  });
  if (!ordersRes.ok) throw new Error(`Orders API ${ordersRes.status}`);
  const json = await ordersRes.json();
  if (!Array.isArray(json?.main)) throw new Error(`Unexpected API shape: ${JSON.stringify(json).slice(0, 200)}`);
  return json.main as Record<string, any>[];
}

function normalise(raw: Record<string, any>) {
  return {
    id: String(raw.orderno ?? raw.id),
    portal_id: String(raw.id ?? ''),
    customer_name: String(raw.customerid_name ?? raw.partners_name ?? ''),
    order_date: parseDate(raw.orderdate),
    delivery_date: parseDate(raw.deliverydate),
    status: String(raw.status ?? ''),
    delivery_for: String(raw.deliveryfor ?? ''),
    delivered_pct: Number(raw.deliveredpct) || 0,
    invoiced_pct: Number(raw.invoicedpct) || 0,
    synced_at: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const email = Deno.env.get('PORTAL_EMAIL');
    const password = Deno.env.get('PORTAL_PASSWORD');
    if (!email || !password) return json(500, { error: 'PORTAL_EMAIL / PORTAL_PASSWORD not configured' });

    const t0 = Date.now();
    const raw = await loginAndFetch(email, password, 1000);
    const records = raw.map(normalise).filter((r) => r.id);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let inserted = 0;
    for (let i = 0; i < records.length; i += 200) {
      const chunk = records.slice(i, i + 200);
      const { error } = await supabase.from('sales_orders').upsert(chunk, { onConflict: 'id' });
      if (error) throw new Error(`Upsert batch ${i}: ${error.message}`);
      inserted += chunk.length;
    }

    await supabase.from('sync_log').insert({
      orders_count: inserted,
      status: 'success',
      error_msg: null,
    });

    return json(200, { ok: true, synced: inserted, ms: Date.now() - t0 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      await supabase.from('sync_log').insert({ orders_count: 0, status: 'error', error_msg: msg });
    } catch (_) { /* ignore */ }
    return json(500, { ok: false, error: msg });
  }
});
