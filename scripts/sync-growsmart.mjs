/**
 * GrowsmartSMB → Supabase Sync
 * Login → navigate to spa#/list/orders → intercept API responses → sync to Supabase
 */

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const PORTAL_URL   = 'https://ios.growsmartsmb.in';
const EMAIL        = process.env.PORTAL_EMAIL;
const PASSWORD     = process.env.PORTAL_PASSWORD;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://axjwkwkoksognhxycvvh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!EMAIL || !PASSWORD) { console.error('❌ Missing PORTAL_EMAIL or PORTAL_PASSWORD'); process.exit(1); }
if (!SUPABASE_KEY)       { console.error('❌ Missing SUPABASE_SERVICE_KEY');              process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
function log(msg) { console.log(`[${new Date().toLocaleTimeString('en-IN')}] ${msg}`); }

function parseDate(str) {
  if (!str?.trim()) return null;
  const M = { Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12 };
  const d = str.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (d) return `${d[3]}-${String(M[d[2]]).padStart(2,'0')}-${String(d[1]).padStart(2,'0')}`;
  const s = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (s) return `${s[3]}-${s[2]}-${s[1]}`;
  return null;
}

// ─── Step 1: Login ────────────────────────────────────────────────────────────

async function login(page) {
  log('🔐 Logging in...');
  await page.goto(`${PORTAL_URL}/spa`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(2000);

  await page.evaluate(({ email, password }) => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const eField = inputs.find(i => i.type==='email' || i.type==='text' || /email|user/i.test(i.name+i.id+i.placeholder));
    const pField = inputs.find(i => i.type==='password');
    if (!eField || !pField) throw new Error('Login fields not found');
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
    set.call(eField, email);  eField.dispatchEvent(new Event('input',{bubbles:true}));  eField.dispatchEvent(new Event('change',{bubbles:true}));
    set.call(pField, password); pField.dispatchEvent(new Event('input',{bubbles:true})); pField.dispatchEvent(new Event('change',{bubbles:true}));
  }, { email: EMAIL, password: PASSWORD });

  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const btn = document.querySelector('button[type="submit"],input[type="submit"]') ||
      [...document.querySelectorAll('button')].find(b => /login|sign in/i.test(b.textContent));
    if (btn) btn.click(); else document.querySelector('input[type="password"]')?.form?.submit();
  });

  // Wait for SPA to move away from login — hash changes from #/login to #/dashboard or similar
  await page.waitForFunction(
    () => !window.location.href.includes('login') && !window.location.href.includes('signin'),
    { timeout: 25000 }
  );
  log(`✅ Logged in — at: ${page.url()}`);
}

// ─── Step 2: Navigate + capture API calls ─────────────────────────────────────

async function fetchSalesOrdersData(page) {
  log('\n📦 Loading sales orders page...');

  const captured = [];

  // Intercept ALL responses — log everything, capture JSON
  page.on('response', async response => {
    const url    = response.url();
    const status = response.status();
    const ct     = response.headers()['content-type'] || '';

    // Skip static assets
    if (/\.(js|css|png|jpg|jpeg|gif|ico|woff|woff2|svg|map)(\?|$)/i.test(url)) return;

    log(`  📡 ${status} [${ct.split(';')[0].trim()}] ${url.replace(PORTAL_URL, '')}`);

    try {
      const text = await response.text();
      if ((text.startsWith('{') || text.startsWith('[')) && text.length > 10) {
        const json = JSON.parse(text);
        captured.push({ url, status, data: json });
        log(`     └─ JSON captured (${text.length} bytes)`);
      }
    } catch { /* not JSON */ }
  });

  // Navigate to the correct SPA hash route
  await page.goto(`${PORTAL_URL}/spa#/list/orders`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  log(`  → navigated, waiting for data...`);
  await page.waitForTimeout(5000); // give the SPA time to load data

  // Take screenshot
  await page.screenshot({ path: 'debug-sales-orders.png', fullPage: false });
  const info = await page.evaluate(() => ({
    title: document.title,
    url: location.href,
    bodySnippet: document.body?.innerText?.slice(0, 200),
  }));
  log(`  → page title: "${info.title}"`);
  log(`  → body snippet: ${info.bodySnippet?.replace(/\n/g,' ').slice(0,150)}`);
  log(`  → captured ${captured.length} JSON API responses`);

  return captured;
}

// ─── Step 3: Extract orders from API responses ────────────────────────────────

function extractOrders(captured) {
  if (captured.length === 0) {
    log('\n⚠️  Zero API calls captured. Possible causes:');
    log('   1. Session cookie not sent to /spa route');
    log('   2. Portal uses WebSocket instead of REST');
    log('   3. Data already cached, no new requests fired');
    log('   Check debug-sales-orders.png artifact to see what the page shows.');
    return [];
  }

  log(`\n🔎 Scanning ${captured.length} API responses for sales orders...`);

  for (const { url, data } of captured) {
    const candidates = [
      Array.isArray(data) ? data : null,
      data?.data,  data?.orders,  data?.results,
      data?.records, data?.items, data?.list, data?.rows,
    ].filter(a => Array.isArray(a) && a.length > 0);

    for (const arr of candidates) {
      const sample = arr[0];
      if (!sample || typeof sample !== 'object') continue;
      const keys = Object.keys(sample).join(' ').toLowerCase();
      log(`  → ${url.replace(PORTAL_URL,'')} [${arr.length}] keys: ${keys.slice(0,120)}`);

      if (/order|invoice|customer|delivery|so-/i.test(keys)) {
        log(`  ✅ MATCH — sample: ${JSON.stringify(sample).slice(0,200)}`);
        return arr;
      }
    }
  }

  log('  ⚠️  No sales order data matched. Full response preview:');
  captured.forEach(({ url, data }) => {
    log(`    ${url.replace(PORTAL_URL,'')} → ${JSON.stringify(data).slice(0,120)}`);
  });
  return [];
}

// ─── Step 4: Sync to Supabase ─────────────────────────────────────────────────

function normalise(raw) {
  const g = (...keys) => { for (const k of keys) if (raw[k]!=null) return String(raw[k]); return ''; };
  return {
    id:            g('order_no','orderNo','order_number','name','id'),
    portal_id:     g('id','pk','_id'),
    customer_name: g('customer_name','customerName','customer','party_name','partyName'),
    order_date:    parseDate(g('order_date','orderDate','date')),
    delivery_date: parseDate(g('delivery_date','deliveryDate','expected_delivery')),
    status:        g('status','state','order_status'),
    delivery_for:  g('delivery_for','deliveryFor','purpose','type'),
    delivered_pct: parseFloat(g('delivered_pct','deliveredPercent')) || 0,
    invoiced_pct:  parseFloat(g('invoiced_pct','invoicedPercent'))   || 0,
    synced_at:     new Date().toISOString(),
  };
}

async function syncToSupabase(orders) {
  if (!orders.length) { log('\n⚠️  No orders to sync.'); return; }
  log(`\n💾 Syncing ${orders.length} orders to Supabase...`);
  const records = orders.map(normalise).filter(r => r.id);
  for (let i = 0; i < records.length; i += 200) {
    const chunk = records.slice(i, i + 200);
    const { error } = await supabase.from('sales_orders').upsert(chunk, { onConflict: 'id' });
    if (error) log(`  ❌ Batch ${Math.floor(i/200)+1}: ${error.message}`);
    else       log(`  ✅ Batch ${Math.floor(i/200)+1}: ${chunk.length} records`);
  }
}

async function writeSyncLog(ordersCount, status, errorMsg) {
  try {
    await supabase.from('sync_log').insert({
      synced_at: new Date().toISOString(), orders_count: ordersCount,
      customer_count: 0, status, error_msg: errorMsg || null,
    });
  } catch { /* ignore */ }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const t0 = Date.now();
  console.log('\n' + '='.repeat(52));
  log('🚀  GrowsmartSMB → Supabase Sync');
  console.log('='.repeat(52));

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  let orders = [];

  try {
    const page = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
      viewport: { width: 1366, height: 768 },
    }).then(ctx => ctx.newPage());

    page.setDefaultTimeout(45000);

    await login(page);
    const captured = await fetchSalesOrdersData(page);
    orders = extractOrders(captured);
    await syncToSupabase(orders);
    await writeSyncLog(orders.length, 'success', null);

    console.log('\n' + '='.repeat(52));
    log(`✅  Done in ${((Date.now()-t0)/1000).toFixed(1)}s — Orders: ${orders.length}`);
    console.log('='.repeat(52) + '\n');

  } catch (err) {
    console.error('\n❌  Sync failed:', err.message);
    await writeSyncLog(orders.length, 'error', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
