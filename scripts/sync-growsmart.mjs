/**
 * GrowsmartSMB → Supabase Sync Script
 *
 * Uses Playwright (already in devDependencies) to:
 *   1. Log in to ios.growsmartsmb.in
 *   2. Scrape Sales Orders (all pages)
 *   3. Scrape Customers (all pages)
 *   4. Upsert into Supabase
 *
 * Run manually:  node scripts/sync-growsmart.mjs
 * Runs on schedule via: .github/workflows/sync-growsmart.yml
 */

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// ─── Config ──────────────────────────────────────────────────────────────
const PORTAL_URL = 'https://ios.growsmartsmb.in/';
const EMAIL      = process.env.PORTAL_EMAIL;
const PASSWORD   = process.env.PORTAL_PASSWORD;

// Supabase — use service role key for upserts (bypasses RLS)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://axjwkwkoksognhxycvvh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY; // MUST be service role key

// Create screenshots directory for debugging
const SCREENSHOTS_DIR = './screenshots';
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

if (!EMAIL || !PASSWORD) {
  console.error('❌  Missing PORTAL_EMAIL or PORTAL_PASSWORD environment variables');
  process.exit(1);
}
if (!SUPABASE_KEY) {
  console.error('❌  Missing SUPABASE_SERVICE_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Convert "15-May-2026" or "15/05/2026" → "2026-05-15" */
function parseDate(str) {
  if (!str || str.trim() === '') return null;
  const months = { Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12 };
  const dash = str.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (dash) {
    const [, d, m, y] = dash;
    return `${y}-${String(months[m]).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  const slash = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slash) {
    const [, d, m, y] = slash;
    return `${y}-${m}-${d}`;
  }
  return null;
}

function log(msg) {
  console.log(`[${new Date().toLocaleTimeString('en-IN')}] ${msg}`);
}

// ─── Login ────────────────────────────────────────────────────────────────

async function login(page) {
  log('🔐 Navigating to portal...');
  
  try {
    await page.goto(PORTAL_URL, { waitUntil: 'networkidle', timeout: 60000 });
  } catch (err) {
    log(`⚠️  Page didn't fully load (networkidle), but continuing...`);
    await page.goto(PORTAL_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  }

  // Diagnostic logging
  log(`📍 Current URL: ${page.url()}`);
  log(`📄 Page title: ${await page.title()}`);

  // Take screenshot for debugging
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-login-page.png') });

  // Wait for input fields to appear
  try {
    await page.waitForSelector('input', { timeout: 20000 });
  } catch (err) {
    log('❌ No input fields found on page');
    // List all visible elements for debugging
    const elementCount = await page.locator('*').count();
    log(`📊 Found ${elementCount} total elements on page`);
    throw new Error('Login form not found on portal');
  }

  // Fill email field
  log('📝 Filling email field...');
  const emailField = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i], input[placeholder*="username" i], input[placeholder*="Email" i]').first();
  
  try {
    await emailField.fill(EMAIL, { timeout: 10000 });
    log('✅ Email filled');
  } catch (err) {
    log('❌ Could not fill email field');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-email-error.png') });
    throw err;
  }

  // Fill password field
  log('📝 Filling password field...');
  const passField = page.locator('input[type="password"]').first();
  
  try {
    await passField.fill(PASSWORD, { timeout: 10000 });
    log('✅ Password filled');
  } catch (err) {
    log('❌ Could not fill password field');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-password-error.png') });
    throw err;
  }

  // Find and click login button
  log('🔘 Looking for login button...');
  const loginBtn = page.locator(
    'button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign In"), button:has-text("Log In"), button:has-text("LOGIN"), a:has-text("Login")'
  ).first();

  try {
    await loginBtn.scroll({ timeout: 5000 });
    await loginBtn.click({ timeout: 60000 });
    log('✅ Login button clicked');
  } catch (err) {
    log('❌ Could not click login button - timeout or not found');
    
    // Debug: List all buttons
    const buttons = await page.locator('button, input[type="submit"]').all();
    log(`📊 Found ${buttons.length} clickable elements`);
    
    for (let i = 0; i < Math.min(buttons.length, 5); i++) {
      const text = await buttons[i].textContent().catch(() => '');
      const type = await buttons[i].getAttribute('type').catch(() => 'unknown');
      log(`  → Button ${i}: type="${type}" text="${text}"`);
    }
    
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-login-button-error.png') });
    throw err;
  }

  // Wait for navigation after login
  log('⏳ Waiting for login redirect...');
  try {
    await page.waitForURL(url => !url.includes('login') && !url.includes('signin') && !url.includes('account'), 
      { timeout: 30000 }
    );
    log('✅ Logged in successfully');
  } catch (err) {
    log(`⚠️  Login may have succeeded, but redirect didn't match expected pattern`);
    log(`📍 Current URL after login: ${page.url()}`);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-post-login.png') });
  }
}

// ─── Sales Orders ─────────────────────────────────────────────────────────

async function scrapeSalesOrders(page) {
  log('\n📦 Scraping Sales Orders...');

  try {
    await page.goto(`${PORTAL_URL}sales/orders`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    log(`📍 Navigated to sales/orders`);
  } catch (err) {
    log(`⚠️  Could not navigate to sales/orders: ${err.message}`);
    return [];
  }

  // Try to set page size to 500 to reduce page-flipping
  try {
    const btn500 = page.locator('button:has-text("500"), a:has-text("500")').first();
    if (await btn500.isVisible({ timeout: 3000 })) {
      await btn500.click();
      await page.waitForTimeout(1500);
      log('  → Set page size to 500');
    }
  } catch { /* no 500 button, use default */ }

  const allOrders = [];
  let pageNum = 1;
  let consecutiveErrors = 0;

  while (true) {
    log(`  → Page ${pageNum}`);
    
    try {
      await page.waitForSelector('table tbody tr', { timeout: 20000 });

      const rows = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('table tbody tr')).map(row => {
          const cells = row.querySelectorAll('td');
          return {
            order_no:      cells[0]?.innerText?.trim(),
            customer_name: cells[1]?.innerText?.trim(),
            order_date:    cells[2]?.innerText?.trim(),
            delivery_date: cells[3]?.innerText?.trim(),
            status:        cells[4]?.innerText?.trim(),
            delivery_for:  cells[5]?.innerText?.trim(),
            delivered_pct: cells[6]?.innerText?.trim(),
            invoiced_pct:  cells[7]?.innerText?.trim(),
            portal_id:     cells[8]?.innerText?.trim(),
          };
        }).filter(r => r.order_no && r.order_no.startsWith('SO-'));
      });

      if (rows.length === 0) {
        log(`  ⚠️  No orders found on page ${pageNum}`);
        break;
      }

      allOrders.push(...rows);
      log(`  ✅ Scraped ${rows.length} orders`);
      consecutiveErrors = 0;

      // Check if a "next page" button exists and is enabled
      const nextBtn = page.locator('.pagination a:has-text("›"), a[aria-label="Next page"], button[aria-label="Next"]').first();
      const isDisabled = await nextBtn.evaluate(el =>
        el.classList.contains('disabled') || el.closest('li')?.classList.contains('disabled') || el.hasAttribute('disabled')
      , null).catch(() => true);

      if (isDisabled) {
        log(`  → Reached last page`);
        break;
      }

      await nextBtn.click();
      await page.waitForTimeout(2000);
      pageNum++;

    } catch (err) {
      consecutiveErrors++;
      log(`  ❌ Error on page ${pageNum}: ${err.message}`);
      
      if (consecutiveErrors >= 2) {
        log(`  ⚠️  Too many consecutive errors, stopping scrape`);
        break;
      }
      
      await page.waitForTimeout(1000);
      pageNum++;
    }
  }

  log(`  ✅ ${allOrders.length} sales orders scraped`);
  return allOrders;
}

// ─── Customers ────────────────────────────────────────────────────────────

async function scrapeCustomers(page) {
  log('\n👥 Scraping Customers...');

  // Try known URL patterns
  const urls = [`${PORTAL_URL}customers`, `${PORTAL_URL}contacts`, `${PORTAL_URL}crm/customers`, `${PORTAL_URL}master/customers`];
  let found = false;

  for (const url of urls) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForSelector('table', { timeout: 8000 });
      log(`  ✅ Found customers page at: ${url}`);
      found = true;
      break;
    } catch { 
      log(`  ⚠️  ${url} - not found`);
      continue;
    }
  }

  if (!found) {
    log('  ⚠️  Could not locate customers page — skipping');
    return [];
  }

  try {
    const btn500 = page.locator('button:has-text("500"), a:has-text("500")').first();
    if (await btn500.isVisible({ timeout: 2000 })) {
      await btn500.click();
      await page.waitForTimeout(1200);
      log('  → Set page size to 500');
    }
  } catch { /* ignore */ }

  const allCustomers = [];
  let pageNum = 1;
  let consecutiveErrors = 0;

  while (true) {
    log(`  → Page ${pageNum}`);
    
    try {
      await page.waitForSelector('table tbody tr', { timeout: 15000 });

      const rows = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('table tbody tr')).map(row => {
          const cells = row.querySelectorAll('td');
          // NOTE: Column indices may need adjusting — check portal layout
          return {
            portal_id:      cells[0]?.innerText?.trim() || '',
            name:           cells[1]?.innerText?.trim() || cells[0]?.innerText?.trim() || '',
            contact_person: cells[2]?.innerText?.trim() || '',
            phone:          cells[3]?.innerText?.trim() || '',
            email:          cells[4]?.innerText?.trim() || '',
            address:        cells[5]?.innerText?.trim() || '',
          };
        }).filter(r => r.name);
      });

      if (rows.length === 0) {
        log(`  ⚠️  No customers found on page ${pageNum}`);
        break;
      }

      allCustomers.push(...rows);
      log(`  ✅ Scraped ${rows.length} customers`);
      consecutiveErrors = 0;

      const nextBtn = page.locator('.pagination a:has-text("›"), a[aria-label="Next page"]').first();
      const isDisabled = await nextBtn.evaluate(el =>
        el.classList.contains('disabled') || el.closest('li')?.classList.contains('disabled')
      , null).catch(() => true);

      if (isDisabled) {
        log(`  → Reached last page`);
        break;
      }

      await nextBtn.click();
      await page.waitForTimeout(1500);
      pageNum++;

    } catch (err) {
      consecutiveErrors++;
      log(`  ❌ Error on page ${pageNum}: ${err.message}`);
      
      if (consecutiveErrors >= 2) {
        log(`  ⚠️  Too many consecutive errors, stopping scrape`);
        break;
      }
      
      await page.waitForTimeout(1000);
      pageNum++;
    }
  }

  log(`  ✅ ${allCustomers.length} customers scraped`);
  return allCustomers;
}

// ─── Supabase Sync ────────────────────────────────────────────────────────

async function syncSalesOrders(orders) {
  if (!orders.length) return;
  log(`\n💾 Upserting ${orders.length} sales orders...`);

  const records = orders.map(o => ({
    id:            o.order_no,
    portal_id:     o.portal_id || '',
    customer_name: o.customer_name || '',
    order_date:    parseDate(o.order_date),
    delivery_date: parseDate(o.delivery_date),
    status:        o.status || '',
    delivery_for:  o.delivery_for || '',
    delivered_pct: parseFloat(o.delivered_pct) || 0,
    invoiced_pct:  parseFloat(o.invoiced_pct) || 0,
    synced_at:     new Date().toISOString(),
  }));

  // Batch upsert in chunks of 200 to avoid request size limits
  for (let i = 0; i < records.length; i += 200) {
    const chunk = records.slice(i, i + 200);
    const { error } = await supabase.from('sales_orders').upsert(chunk, { onConflict: 'id' });
    if (error) {
      console.error(`  ❌ Sales orders batch ${i/200 + 1} error:`, error.message);
    } else {
      log(`  ✅ Batch ${i/200 + 1}: ${chunk.length} records synced`);
    }
  }
}

async function syncCustomers(customers) {
  if (!customers.length) return;
  log(`\n💾 Upserting ${customers.length} customers...`);

  // Use portal_id as the Supabase id, prefixed to avoid collisions with manually added records
  const records = customers
    .filter(c => c.name)
    .map((c, idx) => ({
      id:             c.portal_id ? `GSM-${c.portal_id}` : `GSM-${idx}`,
      name:           c.name,
      contact_person: c.contact_person || '',
      phone:          c.phone || '',
      email:          c.email || '',
      address:        c.address || '',
    }));

  for (let i = 0; i < records.length; i += 200) {
    const chunk = records.slice(i, i + 200);
    const { error } = await supabase.from('customers').upsert(chunk, { onConflict: 'id' });
    if (error) {
      console.error(`  ❌ Customers batch error:`, error.message);
    } else {
      log(`  ✅ Batch ${i/200 + 1}: ${chunk.length} customers synced`);
    }
  }
}

async function logSyncRun({ ordersCount, customerCount, status, errorMsg }) {
  await supabase.from('sync_log').insert({
    synced_at:      new Date().toISOString(),
    orders_count:   ordersCount,
    customer_count: customerCount,
    status,
    error_msg:      errorMsg || null,
  }).catch(() => {});
}

// ─── Main ──────────────────────────────────────────────────────────────────

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
