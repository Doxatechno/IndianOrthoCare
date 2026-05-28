/**
 * GrowsmartSMB → Supabase Sync
 *
 * Strategy: Login via browser, then INTERCEPT the API calls
 * the portal makes internally to get clean JSON — no HTML table scraping.
 */

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const PORTAL_URL   = 'https://ios.growsmartsmb.in/';
const EMAIL        = process.env.PORTAL_EMAIL;
const PASSWORD     = process.env.PORTAL_PASSWORD;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://axjwkwkoksognhxycvvh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!EMAIL || !PASSWORD) { console.error('❌  Missing PORTAL_EMAIL or PORTAL_PASSWORD'); process.exit(1); }
if (!SUPABASE_KEY)       { console.error('❌  Missing SUPABASE_SERVICE_KEY');              process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function parseDate(str) {
  if (!str?.trim()) return null;
  const months = { Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12 };
  const dash = str.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (dash) { const [,d,m,y] = dash; return `${y}-${String(months[m]).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
  const slash = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slash) { const [,d,m,y] = slash; return `${y}-${m}-${d}`; }
  return null;
}

function log(msg) { console.log(`[${new Date().toLocaleTimeString('en-IN')}] ${msg}`); }

// ─── Login ────────────────────────────────────────────────────────────────────

async function login(page) {
  log('🔐 Logging in...');
  await page.goto(PORTAL_URL, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(2000);

  // Fill via JS injection (proven working from previous runs)
  const filled = await page.evaluate(({ email, password }) => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const emailInput = inputs.find(i =>
      i.type === 'email' || i.name?.toLowerCase().includes('email') ||
      i.name?.toLowerCase().includes('user') || i.placeholder?.toLowerCase().includes('email') ||
      i.placeholder?.toLowerCase().includes('user') || i.id?.toLowerCase().includes('email') ||
      i.type === 'text'
    );
    const passInput = inputs.find(i => i.type === 'password');
    if (!emailInput || !passInput) return { ok: false };
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(emailInput, email);
    emailInput.dispatchEvent(new Event('input', { bubbles: true }));
    emailInput.dispatchEvent(new Event('change', { bubbles: true }));
    setter.call(passInput, password);
    passInput.dispatchEvent(new Event('input', { bubbles: true }));
    passInput.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true };
  }, { email: EMAIL, password: PASSWORD });

  if (!filled.ok) throw new Error('Could not fill login form');

  await page.waitForTimeout(400);
  const submitted = await page.evaluate(() => {
    const btn = document.querySelector('button[type="submit"], input[type="submit"]') ||
      Array.from(document.querySelectorAll('button')).find(b => /login|sign in/i.test(b.textContent));
    if (btn) { btn.click(); return true; }
    return false;
  });
  if (!submitted) await page.keyboard.press('Enter');

  await page.waitForURL(
    url => !url.toString().includes('login') && !url.toString().includes('signin'),
    { timeout: 25000 }
  );
  log(`✅ Logged in — at: ${page.url()}`);
}

// ─── Intercept API calls ──────────────────────────────────────────────────────

async function interceptAndFetch(page, triggerUrl, dataLabel) {
  log(`\n🔍 Intercepting API calls for: ${dataLabel}`);

  const captured = [];

  // Listen for all JSON API responses
  page.on('response', async response => {
    const url = response.url();
    const ct  = response.headers()['content-type'] || '';

    // Only capture JSON API responses (skip static assets)
    if (!ct.includes('application/json') && !ct.includes('text/json')) return;
    if (url.includes('.js') || url.includes('.css')) return;

    try {
      const json = await response.json();
      captured.push({ url, status: response.status(), data: json });
      log(`  📡 captured: ${url.replace(PORTAL_URL, '/')} (${response.status()})`);
    } catch { /* not JSON */ }
  });

  // Navigate to trigger the page's own API calls
  await page.goto(triggerUrl, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(3000); // wait for lazy-loaded data

  // Scroll to bottom to trigger any virtual-scroll data loads
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1500);

  log(`  → captured ${captured.length} API response(s)`);

  // Screenshot for reference
  await page.screenshot({ path: `debug-${dataLabel.replace(/\s/g,'-')}.png` });

  return captured;
}

// ─── Parse captured API responses for Sales Orders ────────────────────────────

function extractSalesOrders(captured) {
  for (const { url, data } of captured) {
    // Look for response that contains an array of order-like objects
    const arr = Array.isArray(data) ? data
      : data?.data     ? (Array.isArray(data.data)     ? data.data     : null)
      : data?.orders   ? (Array.isArray(data.orders)   ? data.orders   : null)
      : data?.results  ? (Array.isArray(data.results)  ? data.results  : null)
      : data?.records  ? (Array.isArray(data.records)  ? data.records  : null)
      : data?.items    ? (Array.isArray(data.items)    ? data.items    : null)
      : null;

    if (!arr || arr.length === 0) continue;

    // Check if objects look like sales orders
    const sample = arr[0];
    const hasSalesFields = sample && (
      'order_no' in sample || 'orderNo' in sample || 'order_number' in sample ||
      'SO' in sample || (typeof sample === 'object' && Object.keys(sample).some(k => k.toLowerCase().includes('order')))
    );

    if (hasSalesFields) {
      log(`  ✅ Found sales orders in: ${url} (${arr.length} records)`);
      log(`  → sample keys: ${Object.keys(arr[0]).join(', ')}`);
      return { url, orders: arr };
    }
  }

  // If no perfect match, return all captured for debugging
  log('  ⚠️  Could not auto-detect sales orders. All captured API keys:');
  for (const { url, data } of captured) {
    const keys = typeof data === 'object' ? Object.keys(data).join(', ') : typeof data;
    log(`    ${url.replace(PORTAL_URL, '/')} → ${keys}`);
  }
  return null;
}

// ─── Fetch ALL pages of sales orders via API ──────────────────────────────────

async function fetchAllSalesOrders(page, apiUrl, captured) {
  // Try to determine pagination pattern from first call
  // Common patterns: ?page=1&limit=20, ?offset=0&count=20, ?start=0
  const url = new URL(apiUrl);
  const params = Object.fromEntries(url.searchParams.entries());
  log(`  → API params: ${JSON.stringify(params)}`);

  const baseUrl  = apiUrl.split('?')[0];
  const allOrders = [];

  // Try fetching more pages by calling the API directly
  const cookies = await page.context().cookies();
  const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  // Get auth token from localStorage/sessionStorage if present
  const authHeaders = await page.evaluate(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken') ||
                  localStorage.getItem('access_token') || sessionStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  });

  let pageNum = 0;
  let hasMore  = true;

  while (hasMore) {
    // Build paginated URL
    const fetchUrl = new URL(apiUrl);
    if ('page' in params)   fetchUrl.searchParams.set('page',   String(pageNum + 1));
    if ('offset' in params) fetchUrl.searchParams.set('offset', String(pageNum * (parseInt(params.limit || params.count || 20))));
    if ('start' in params)  fetchUrl.searchParams.set('start',  String(pageNum * (parseInt(params.limit || 20))));

    log(`  → fetching page ${pageNum + 1}: ${fetchUrl.toString().replace(PORTAL_URL, '/')}`);

    try {
      const resp = await page.evaluate(async ({ url, headers, cookieStr }) => {
        const r = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...headers,
          },
          credentials: 'include',
        });
        const text = await r.text();
        return { ok: r.ok, status: r.status, body: text };
      }, { url: fetchUrl.toString(), headers: authHeaders, cookieStr });

      if (!resp.ok) { log(`  ⚠️  API returned ${resp.status}, stopping pagination`); break; }

      const json = JSON.parse(resp.body);
      const arr = Array.isArray(json) ? json
        : json?.data    ? (Array.isArray(json.data)    ? json.data    : [])
        : json?.orders  ? (Array.isArray(json.orders)  ? json.orders  : [])
        : json?.results ? (Array.isArray(json.results) ? json.results : [])
        : json?.records ? (Array.isArray(json.records) ? json.records : [])
        : [];

      if (arr.length === 0) { hasMore = false; break; }

      allOrders.push(...arr);
      log(`  → page ${pageNum + 1}: +${arr.length} (total: ${allOrders.length})`);

      // Stop if fewer results than expected (last page)
      const limit = parseInt(params.limit || params.count || params.size || 20);
      if (arr.length < limit) hasMore = false;
      else pageNum++;

    } catch (e) {
      log(`  ⚠️  Fetch error on page ${pageNum + 1}: ${e.message}`);
      break;
    }
  }

  return allOrders;
}

// ─── Map raw API fields to our DB schema ─────────────────────────────────────

function normaliseOrder(raw) {
  // Handle various field name conventions (snake_case, camelCase, etc.)
  const get = (...keys) => { for (const k of keys) { if (raw[k] !== undefined && raw[k] !== null) return String(raw[k]); } return ''; };
  return {
    id:            get('order_no', 'orderNo', 'order_number', 'name', 'id'),
    portal_id:     get('id', 'pk', '_id'),
    customer_name: get('customer_name', 'customerName', 'customer', 'party_name', 'partyName'),
    order_date:    parseDate(get('order_date', 'orderDate', 'date', 'created_at')),
    delivery_date: parseDate(get('delivery_date', 'deliveryDate', 'expected_delivery')),
    status:        get('status', 'state', 'order_status'),
    delivery_for:  get('delivery_for', 'deliveryFor', 'purpose', 'type'),
    delivered_pct: parseFloat(get('delivered_pct', 'deliveredPercent', 'delivered_percent')) || 0,
    invoiced_pct:  parseFloat(get('invoiced_pct',  'invoicedPercent',  'invoiced_percent'))  || 0,
    synced_at:     new Date().toISOString(),
  };
}

// ─── Supabase Sync ────────────────────────────────────────────────────────────

async function syncSalesOrders(orders) {
  if (!orders.length) return;
  log(`\n💾 Upserting ${orders.length} sales orders...`);
  const records = orders.map(normaliseOrder).filter(r => r.id);
  for (let i = 0; i < records.length; i += 200) {
    const chunk = records.slice(i, i + 200);
    const { error } = await supabase.from('sales_orders').upsert(chunk, { onConflict: 'id' });
    if (error) console.error(`  ❌ Batch error:`, error.message);
    else log(`  ✅ Batch ${Math.floor(i/200)+1}: ${chunk.length} records`);
  }
}

async function logSyncRun({ ordersCount, status, errorMsg }) {
  try {
    await supabase.from('sync_log').insert({
      synced_at: new Date().toISOString(),
      orders_count: ordersCount, customer_count: 0,
      status, error_msg: errorMsg || null,
    });
  } catch { /* ignore */ }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const start = Date.now();
  console.log('\n' + '='.repeat(55));
  log('🚀  GrowsmartSMB → Supabase sync (API intercept mode)');
  console.log('='.repeat(55));

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  let allOrders = [];

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
      viewport: { width: 1366, height: 768 },
    });
    const page = await context.newPage();
    page.setDefaultTimeout(45000);

    await login(page);

    // Intercept API calls on the Sales Orders page
    const captured = await interceptAndFetch(
      page,
      `${PORTAL_URL}sales/orders`,
      'sales-orders'
    );

    // Find the sales orders API response
    const result = extractSalesOrders(captured);

    if (result) {
      // Fetch all pages via the discovered API
      allOrders = await fetchAllSalesOrders(page, result.url, captured);
      if (allOrders.length === 0) allOrders = result.orders; // fallback to first page
    } else {
      log('\n⚠️  API intercept found no sales orders data.');
      log('    Check debug-sales-orders.png artifact + API log above.');
      log('    Share with developer to map correct fields.');
    }

    if (allOrders.length > 0) {
      await syncSalesOrders(allOrders);
    }

    await logSyncRun({ ordersCount: allOrders.length, status: 'success' });

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log('\n' + '='.repeat(55));
    log(`✅  Done in ${elapsed}s — Orders synced: ${allOrders.length}`);
    console.log('='.repeat(55) + '\n');

  } catch (err) {
    console.error('\n❌  Sync failed:', err.message);
    await logSyncRun({ ordersCount: allOrders.length, status: 'error', errorMsg: err.message });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
