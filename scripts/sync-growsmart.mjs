/**
 * GrowsmartSMB → Supabase Sync
 * Uses menu navigation + API interception (SPA-aware)
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
  await page.goto('https://ios.growsmartsmb.in/spa', { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(2000);

  await page.evaluate(({ email, password }) => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const emailInput = inputs.find(i =>
      i.type === 'email' || i.type === 'text' ||
      /email|user/i.test(i.name + i.id + i.placeholder)
    );
    const passInput = inputs.find(i => i.type === 'password');
    if (!emailInput || !passInput) throw new Error('inputs not found');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(emailInput, email);
    emailInput.dispatchEvent(new Event('input',  { bubbles: true }));
    emailInput.dispatchEvent(new Event('change', { bubbles: true }));
    setter.call(passInput, password);
    passInput.dispatchEvent(new Event('input',  { bubbles: true }));
    passInput.dispatchEvent(new Event('change', { bubbles: true }));
  }, { email: EMAIL, password: PASSWORD });

  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const btn = document.querySelector('button[type="submit"], input[type="submit"]') ||
      Array.from(document.querySelectorAll('button')).find(b => /login|sign in/i.test(b.textContent));
    if (btn) btn.click(); else document.querySelector('input[type="password"]')?.form?.submit();
  });

  await page.waitForURL(url => !url.toString().includes('login') && !url.toString().includes('signin'), { timeout: 25000 });
  log(`✅ Logged in — URL: ${page.url()}`);

  // Log current page hash and all nav links to understand routing
  const navInfo = await page.evaluate(() => ({
    hash: window.location.hash,
    pathname: window.location.pathname,
    href: window.location.href,
    navLinks: Array.from(document.querySelectorAll('a, [href]'))
      .map(a => a.href || a.getAttribute('href'))
      .filter(h => h && h.length > 1 && !h.startsWith('javascript'))
      .slice(0, 30),
  }));
  log(`  → hash: "${navInfo.hash}" | path: "${navInfo.pathname}"`);
  log(`  → nav links: ${JSON.stringify(navInfo.navLinks.slice(0, 15))}`);
}

// ─── Set up API interceptor ───────────────────────────────────────────────────

function setupInterceptor(page) {
  const captured = [];
  page.on('response', async response => {
    const url    = response.url();
    const status = response.status();
    const ct     = response.headers()['content-type'] || '';

    // Log every non-static response to understand what the portal calls
    if (!url.match(/\.(js|css|png|jpg|ico|woff|svg|gif)(\?|$)/i)) {
      log(`  📡 ${status} ${ct.split(';')[0].trim().padEnd(25)} ${url.replace(PORTAL_URL,'/')}`);
    }

    // Capture JSON responses
    if (ct.includes('json') || ct.includes('javascript')) {
      try {
        const text = await response.text();
        if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
          captured.push({ url, status, data: JSON.parse(text) });
        }
      } catch { /* not JSON */ }
    }
  });
  return captured;
}

// ─── Navigate to Sales Orders via menu ───────────────────────────────────────

async function navigateToSalesOrders(page) {
  log('\n📦 Navigating to Sales Orders (spa#/list/orders)...');

  // Navigate directly to the correct SPA hash route
  await page.goto('https://ios.growsmartsmb.in/spa#/list/orders', { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(4000); // allow SPA to render + API calls to complete
  log(`  → URL: ${page.url()}`);

  await page.screenshot({ path: 'debug-01-sales-orders.png' });

  const pageInfo = await page.evaluate(() => ({
    title: document.title,
    heading: document.querySelector('h1, h2, .page-title, [class*="title"]')?.textContent?.trim(),
    rowCount: document.querySelectorAll('table tbody tr').length,
    tableCount: document.querySelectorAll('table').length,
  }));
  log(`  → title: "${pageInfo.title}" | heading: "${pageInfo.heading}" | tables: ${pageInfo.tableCount} | rows: ${pageInfo.rowCount}`);
}

// ─── Extract orders from captured API responses ───────────────────────────────

function extractOrders(captured) {
  log(`\n🔎 Analysing ${captured.length} captured API responses...`);

  for (const { url, data } of captured) {
    const arr = Array.isArray(data) ? data
      : data?.data    ? (Array.isArray(data.data)    ? data.data    : null)
      : data?.orders  ? (Array.isArray(data.orders)  ? data.orders  : null)
      : data?.results ? (Array.isArray(data.results) ? data.results : null)
      : data?.records ? (Array.isArray(data.records) ? data.records : null)
      : data?.items   ? (Array.isArray(data.items)   ? data.items   : null)
      : data?.list    ? (Array.isArray(data.list)     ? data.list    : null)
      : null;

    if (!arr || arr.length === 0) continue;

    const sample = arr[0];
    const keys   = Object.keys(sample || {}).join(', ').toLowerCase();
    log(`  → ${url.replace(PORTAL_URL,'/')} → [${arr.length}] keys: ${keys.slice(0,100)}`);

    // Match if keys suggest order data
    if (/order|so-|invoice|customer|delivery/i.test(keys)) {
      log(`  ✅ Matched as sales orders! Sample: ${JSON.stringify(sample).slice(0,200)}`);
      return { url, orders: arr, sampleKeys: Object.keys(sample) };
    }
  }

  // If no match, show all keys for manual inspection
  if (captured.length > 0) {
    log('  ⚠️  No auto-match. All responses:');
    for (const { url, data } of captured) {
      const preview = JSON.stringify(data).slice(0, 150);
      log(`    ${url.replace(PORTAL_URL,'/')} → ${preview}`);
    }
  } else {
    log('  ⚠️  Zero API calls captured — portal may use WebSocket or different auth');
  }
  return null;
}

// ─── Supabase Sync ────────────────────────────────────────────────────────────

function normaliseOrder(raw) {
  const get = (...keys) => { for (const k of keys) if (raw[k] != null) return String(raw[k]); return ''; };
  return {
    id:            get('order_no','orderNo','order_number','name','id'),
    portal_id:     get('id','pk','_id'),
    customer_name: get('customer_name','customerName','customer','party_name','partyName'),
    order_date:    parseDate(get('order_date','orderDate','date')),
    delivery_date: parseDate(get('delivery_date','deliveryDate','expected_delivery')),
    status:        get('status','state','order_status'),
    delivery_for:  get('delivery_for','deliveryFor','purpose','type'),
    delivered_pct: parseFloat(get('delivered_pct','deliveredPercent')) || 0,
    invoiced_pct:  parseFloat(get('invoiced_pct','invoicedPercent'))   || 0,
    synced_at:     new Date().toISOString(),
  };
}

async function syncSalesOrders(orders) {
  if (!orders.length) return;
  log(`\n💾 Upserting ${orders.length} sales orders...`);
  const records = orders.map(normaliseOrder).filter(r => r.id);
  for (let i = 0; i < records.length; i += 200) {
    const chunk = records.slice(i, i + 200);
    const { error } = await supabase.from('sales_orders').upsert(chunk, { onConflict: 'id' });
    if (error) console.error(`  ❌`, error.message);
    else log(`  ✅ ${chunk.length} records`);
  }
}

async function logSyncRun({ ordersCount, status, errorMsg }) {
  try {
    await supabase.from('sync_log').insert({
      synced_at: new Date().toISOString(), orders_count: ordersCount,
      customer_count: 0, status, error_msg: errorMsg || null,
    });
  } catch { /* ignore */ }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const start = Date.now();
  console.log('\n' + '='.repeat(55));
  log('🚀  GrowsmartSMB → Supabase sync');
  console.log('='.repeat(55));

  const browser = await chromium.launch({
    headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  let allOrders = [];

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
      viewport: { width: 1366, height: 768 },
    });
    const page = await context.newPage();
    page.setDefaultTimeout(45000);

    // Start intercepting BEFORE login so we catch everything
    const captured = setupInterceptor(page);

    await login(page);
    await navigateToSalesOrders(page);

    const result = extractOrders(captured);

    if (result) {
      allOrders = result.orders;
      await syncSalesOrders(allOrders);
    }

    await logSyncRun({ ordersCount: allOrders.length, status: 'success' });

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log('\n' + '='.repeat(55));
    log(`✅  Done in ${elapsed}s — Orders: ${allOrders.length}`);
    console.log('='.repeat(55) + '\n');

  } catch (err) {
    console.error('\n❌  Sync failed:', err.message);
    await logSyncRun({ ordersCount: 0, status: 'error', errorMsg: err.message });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
