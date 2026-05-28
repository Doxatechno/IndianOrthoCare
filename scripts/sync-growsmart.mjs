import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const PORTAL_URL = 'https://ios.growsmartsmb.in/';
const EMAIL      = process.env.PORTAL_EMAIL;
const PASSWORD   = process.env.PORTAL_PASSWORD;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://axjwkwkoksognhxycvvh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!EMAIL || !PASSWORD) { console.error('❌  Missing PORTAL_EMAIL or PORTAL_PASSWORD'); process.exit(1); }
if (!SUPABASE_KEY)       { console.error('❌  Missing SUPABASE_SERVICE_KEY'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function parseDate(str) {
  if (!str || !str.trim()) return null;
  const months = { Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12 };
  const dash = str.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (dash) { const [,d,m,y] = dash; return `${y}-${String(months[m]).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
  const slash = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slash) { const [,d,m,y] = slash; return `${y}-${m}-${d}`; }
  return null;
}

function log(msg) { console.log(`[${new Date().toLocaleTimeString('en-IN')}] ${msg}`); }

// ─── Login ───────────────────────────────────────────────────────────────────

async function login(page) {
  log('🔐 Navigating to portal...');
  await page.goto(PORTAL_URL, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(2000);

  const inputInfo = await page.evaluate(() =>
    Array.from(document.querySelectorAll('input')).map(i => ({
      type: i.type, name: i.name, id: i.id, placeholder: i.placeholder,
      visible: i.offsetParent !== null,
    }))
  );
  log(`  → inputs: ${JSON.stringify(inputInfo)}`);

  const filled = await page.evaluate(({ email, password }) => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const emailInput = inputs.find(i =>
      i.type === 'email' ||
      i.name?.toLowerCase().includes('email') ||
      i.name?.toLowerCase().includes('user') ||
      i.placeholder?.toLowerCase().includes('email') ||
      i.placeholder?.toLowerCase().includes('user') ||
      i.id?.toLowerCase().includes('email') ||
      (i.type === 'text')
    );
    const passInput = inputs.find(i => i.type === 'password');
    if (!emailInput) return { ok: false, reason: 'no email input' };
    if (!passInput)  return { ok: false, reason: 'no password input' };
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(emailInput, email);
    emailInput.dispatchEvent(new Event('input',  { bubbles: true }));
    emailInput.dispatchEvent(new Event('change', { bubbles: true }));
    setter.call(passInput, password);
    passInput.dispatchEvent(new Event('input',  { bubbles: true }));
    passInput.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true, emailField: emailInput.name || emailInput.id || emailInput.type };
  }, { email: EMAIL, password: PASSWORD });

  log(`  → fill result: ${JSON.stringify(filled)}`);
  if (!filled.ok) throw new Error(`Form fill failed: ${filled.reason}`);
  await page.waitForTimeout(400);

  const submitted = await page.evaluate(() => {
    const btn =
      document.querySelector('button[type="submit"]') ||
      document.querySelector('input[type="submit"]') ||
      Array.from(document.querySelectorAll('button')).find(b =>
        /login|sign in|log in|submit/i.test(b.textContent)
      );
    if (btn) { btn.click(); return btn.textContent?.trim() || btn.type; }
    return null;
  });

  if (submitted) { log(`  → clicked: "${submitted}"`); }
  else           { log('  → pressing Enter'); await page.keyboard.press('Enter'); }

  await page.waitForURL(
    url => !url.toString().includes('login') && !url.toString().includes('signin'),
    { timeout: 25000 }
  );
  log(`✅ Logged in — now at: ${page.url()}`);
}

// ─── Sales Orders ─────────────────────────────────────────────────────────────

async function scrapeSalesOrders(page) {
  log('\n📦 Scraping Sales Orders...');
  log(`  → post-login URL: ${page.url()}`);

  // Strategy 1: click Sales menu → Sales Orders
  let onOrdersPage = false;
  try {
    await page.click('text=Sales', { timeout: 5000 });
    await page.waitForTimeout(600);
    await page.click('text=Sales Orders', { timeout: 5000 });
    await page.waitForTimeout(1500);
    log(`  → navigated via menu: ${page.url()}`);
    onOrdersPage = true;
  } catch (e) {
    log(`  → menu click failed (${e.message}), trying direct URLs`);
  }

  // Strategy 2: try URL patterns
  if (!onOrdersPage) {
    const urlsToTry = [
      `${PORTAL_URL}sales/orders`,
      `${PORTAL_URL}sales-orders`,
      `${PORTAL_URL}salesorders`,
      `${PORTAL_URL}order/list`,
      `${PORTAL_URL}orders`,
    ];
    for (const url of urlsToTry) {
      try {
        log(`  → trying: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
        const tables = await page.locator('table').count();
        log(`  → found ${tables} table(s) at ${page.url()}`);
        if (tables > 0) { onOrdersPage = true; break; }
      } catch { continue; }
    }
  }

  // Screenshot regardless — uploaded as artifact, helps debug
  await page.screenshot({ path: 'debug-sales-page.png', fullPage: false });
  log(`  → screenshot saved (title: "${await page.title()}", url: ${page.url()})`);

  if (!onOrdersPage) throw new Error('Could not navigate to Sales Orders page — see debug-sales-page.png artifact');

  // Try to set 500 rows per page
  try {
    const btn500 = page.locator('button:has-text("500"), a:has-text("500")').first();
    if (await btn500.isVisible({ timeout: 3000 })) {
      await btn500.click();
      await page.waitForTimeout(1500);
    }
  } catch { /* ignore */ }

  const allOrders = [];
  let pageNum = 1;

  while (true) {
    log(`  → scraping page ${pageNum}...`);

    // Retry table load 3 times
    let tableLoaded = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await page.waitForSelector('table tbody tr', { timeout: 30000 });
        tableLoaded = true;
        break;
      } catch {
        log(`  ⚠️  Table not loaded (attempt ${attempt}/3)`);
        if (attempt < 3) {
          await page.reload({ waitUntil: 'networkidle' });
          await page.waitForTimeout(3000 * attempt);
        }
      }
    }
    if (!tableLoaded) {
      await page.screenshot({ path: `debug-table-fail-p${pageNum}.png` });
      throw new Error(`Table not found on page ${pageNum} after 3 attempts — check artifact screenshots`);
    }

    const rows = await page.evaluate(() =>
      Array.from(document.querySelectorAll('table tbody tr')).map(row => {
        const c = row.querySelectorAll('td');
        return {
          order_no:      c[0]?.innerText?.trim(),
          customer_name: c[1]?.innerText?.trim(),
          order_date:    c[2]?.innerText?.trim(),
          delivery_date: c[3]?.innerText?.trim(),
          status:        c[4]?.innerText?.trim(),
          delivery_for:  c[5]?.innerText?.trim(),
          delivered_pct: c[6]?.innerText?.trim(),
          invoiced_pct:  c[7]?.innerText?.trim(),
          portal_id:     c[8]?.innerText?.trim(),
        };
      }).filter(r => r.order_no && r.order_no.startsWith('SO-'))
    );

    log(`  → page ${pageNum}: ${rows.length} orders`);
    allOrders.push(...rows);

    const nextBtn = page.locator('.pagination a:has-text("›"), a[aria-label="Next page"], button[aria-label="Next"]').first();
    const done = await nextBtn.evaluate(
      el => el.classList.contains('disabled') || el.closest('li')?.classList.contains('disabled') || el.hasAttribute('disabled'),
      null
    ).catch(() => true);
    if (done) break;
    await nextBtn.click();
    await page.waitForTimeout(1000);
    pageNum++;
  }

  log(`  ✅ ${allOrders.length} total sales orders`);
  return allOrders;
}

// ─── Customers ───────────────────────────────────────────────────────────────

async function scrapeCustomers(page) {
  log('\n👥 Scraping Customers...');
  const urls = [`${PORTAL_URL}customers`, `${PORTAL_URL}contacts`, `${PORTAL_URL}crm/customers`];
  let found = false;
  for (const url of urls) {
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForSelector('table', { timeout: 8000 });
      found = true; break;
    } catch { continue; }
  }
  if (!found) { log('  ⚠️  Customers page not found — skipping'); return []; }

  try {
    const btn500 = page.locator('button:has-text("500"), a:has-text("500")').first();
    if (await btn500.isVisible({ timeout: 2000 })) { await btn500.click(); await page.waitForTimeout(1200); }
  } catch { /* ignore */ }

  const allCustomers = [];
  let pageNum = 1;
  while (true) {
    log(`  → page ${pageNum}`);
    await page.waitForSelector('table tbody tr', { timeout: 20000 });
    const rows = await page.evaluate(() =>
      Array.from(document.querySelectorAll('table tbody tr')).map(row => {
        const c = row.querySelectorAll('td');
        return {
          portal_id:      c[0]?.innerText?.trim() || '',
          name:           c[1]?.innerText?.trim() || c[0]?.innerText?.trim() || '',
          contact_person: c[2]?.innerText?.trim() || '',
          phone:          c[3]?.innerText?.trim() || '',
          email:          c[4]?.innerText?.trim() || '',
          address:        c[5]?.innerText?.trim() || '',
        };
      }).filter(r => r.name)
    );
    allCustomers.push(...rows);
    const nextBtn = page.locator('.pagination a:has-text("›"), a[aria-label="Next page"]').first();
    const done = await nextBtn.evaluate(
      el => el.classList.contains('disabled') || el.closest('li')?.classList.contains('disabled'),
      null
    ).catch(() => true);
    if (done) break;
    await nextBtn.click();
    await page.waitForTimeout(1000);
    pageNum++;
  }
  log(`  ✅ ${allCustomers.length} customers`);
  return allCustomers;
}

// ─── Supabase Sync ────────────────────────────────────────────────────────────

async function syncSalesOrders(orders) {
  if (!orders.length) return;
  log(`\n💾 Upserting ${orders.length} sales orders...`);
  const records = orders.map(o => ({
    id: o.order_no, portal_id: o.portal_id || '',
    customer_name: o.customer_name || '',
    order_date: parseDate(o.order_date), delivery_date: parseDate(o.delivery_date),
    status: o.status || '', delivery_for: o.delivery_for || '',
    delivered_pct: parseFloat(o.delivered_pct) || 0,
    invoiced_pct:  parseFloat(o.invoiced_pct)  || 0,
    synced_at: new Date().toISOString(),
  }));
  for (let i = 0; i < records.length; i += 200) {
    const chunk = records.slice(i, i + 200);
    const { error } = await supabase.from('sales_orders').upsert(chunk, { onConflict: 'id' });
    if (error) console.error(`  ❌ Batch error:`, error.message);
    else log(`  ✅ Batch ${Math.floor(i/200)+1}: ${chunk.length} records`);
  }
}

async function syncCustomers(customers) {
  if (!customers.length) return;
  log(`\n💾 Upserting ${customers.length} customers...`);
  const records = customers.filter(c => c.name).map((c, idx) => ({
    id: c.portal_id ? `GSM-${c.portal_id}` : `GSM-${idx}`,
    name: c.name, contact_person: c.contact_person || '',
    phone: c.phone || '', email: c.email || '', address: c.address || '',
  }));
  for (let i = 0; i < records.length; i += 200) {
    const chunk = records.slice(i, i + 200);
    const { error } = await supabase.from('customers').upsert(chunk, { onConflict: 'id' });
    if (error) console.error(`  ❌ Customers batch error:`, error.message);
    else log(`  ✅ Batch ${Math.floor(i/200)+1}: ${chunk.length} customers`);
  }
}

async function logSyncRun({ ordersCount, customerCount, status, errorMsg }) {
  try {
    await supabase.from('sync_log').insert({
      synced_at: new Date().toISOString(),
      orders_count: ordersCount, customer_count: customerCount,
      status, error_msg: errorMsg || null,
    });
  } catch (e) { console.error('  ⚠️  sync_log write failed:', e.message); }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const start = Date.now();
  console.log('\n' + '='.repeat(52));
  log('🚀  GrowsmartSMB → Supabase sync starting');
  console.log('='.repeat(52));

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  let orders = [], customers = [];

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
      viewport: { width: 1366, height: 768 },
    });
    const page = await context.newPage();
    page.setDefaultTimeout(45000);

    await login(page);
    orders    = await scrapeSalesOrders(page);
    customers = await scrapeCustomers(page);

    await syncSalesOrders(orders);
    await syncCustomers(customers);
    await logSyncRun({ ordersCount: orders.length, customerCount: customers.length, status: 'success' });

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log('\n' + '='.repeat(52));
    log(`✅  Done in ${elapsed}s — Orders: ${orders.length} | Customers: ${customers.length}`);
    console.log('='.repeat(52) + '\n');

  } catch (err) {
    console.error('\n❌  Sync failed:', err.message);
    await logSyncRun({ ordersCount: orders.length, customerCount: customers.length, status: 'error', errorMsg: err.message });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
