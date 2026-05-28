/**
 * GrowsmartSMB → Supabase Sync (v2.0 - Production Grade)
 * 
 * Improvements:
 * 1. Better session management & persistence
 * 2. Robust auth state detection
 * 3. Cookie handling & local storage
 * 4. Multiple fallback strategies
 * 5. Detailed debugging & logging
 * 6. Retry logic with exponential backoff
 * 7. Network interception with filtering
 * 8. Multiple data extraction methods
 */

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// ────────────────────────────────────────────────────────────────[...]
// CONFIG
// ────────────────────────────────────────────────────────────────[...]

const PORTAL_URL = 'https://ios.growsmartsmb.in';
const EMAIL = process.env.PORTAL_EMAIL;
const PASSWORD = process.env.PORTAL_PASSWORD;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://axjwkwkoksognhxycvvh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const DEBUG_MODE = process.env.DEBUG === 'true';

// Paths for session persistence
const COOKIES_FILE = '.playwright-cookies.json';
const STORAGE_FILE = '.playwright-storage.json';

// Validation
if (!EMAIL || !PASSWORD) {
  console.error('❌ Missing PORTAL_EMAIL or PORTAL_PASSWORD');
  process.exit(1);
}
if (!SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ────────────────────────────────────────────────────────────────[...]
// LOGGING & UTILITIES
// ────────────────────────────────────────────────────────────────[...]

function log(msg) {
  console.log(`[${new Date().toLocaleTimeString('en-IN')}] ${msg}`);
}

function debug(msg) {
  if (DEBUG_MODE) console.log(`[DEBUG] ${msg}`);
}

function parseDate(str) {
  if (!str?.trim()) return null;
  const M = {
    Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
    Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
  };
  const d = str.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (d) return `${d[3]}-${String(M[d[2]]).padStart(2, '0')}-${String(d[1]).padStart(2, '0')}`;
  const s = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (s) return `${s[3]}-${s[2]}-${s[1]}`;
  return null;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retry(fn, maxAttempts = 3, delayMs = 1000) {
  let lastError;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < maxAttempts - 1) {
        debug(`Retry ${i + 1}/${maxAttempts - 1} after ${delayMs}ms: ${err.message}`);
        await sleep(delayMs * Math.pow(2, i)); // exponential backoff
      }
    }
  }
  throw lastError;
}

// ────────────────────────────────────────────────────────────────[...]
// BROWSER & SESSION MANAGEMENT
// ────────────────────────────────────────────────────────────────[...]

async function createBrowserContext() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 },
    ignoreHTTPSErrors: true,
  });

  // Try to load previous session cookies
  if (fs.existsSync(COOKIES_FILE)) {
    try {
      const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));
      await context.addCookies(cookies);
      debug(`Loaded ${cookies.length} saved cookies`);
    } catch (err) {
      debug(`Failed to load cookies: ${err.message}`);
    }
  }

  // Try to load previous local storage
  const page = await context.newPage();
  if (fs.existsSync(STORAGE_FILE)) {
    try {
      const storage = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8'));
      await page.evaluate(data => {
        for (const [key, value] of Object.entries(data)) {
          localStorage.setItem(key, value);
        }
      }, storage);
      debug(`Restored ${Object.keys(storage).length} localStorage items`);
    } catch (err) {
      debug(`Failed to restore storage: ${err.message}`);
    }
  }

  return { browser, context, page };
}

async function saveBrowserSession(context) {
  try {
    // Save cookies
    const cookies = await context.cookies();
    fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
    debug(`Saved ${cookies.length} cookies`);

    // Save local storage (from first page in context)
    const pages = context.pages();
    if (pages.length > 0) {
      const storage = await pages[0].evaluate(() => {
        const result = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          result[key] = localStorage.getItem(key);
        }
        return result;
      });
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(storage, null, 2));
      debug(`Saved ${Object.keys(storage).length} localStorage items`);
    }
  } catch (err) {
    debug(`Failed to save session: ${err.message}`);
  }
}

// ────────────────────────────────────────────────────────────────[...]
// AUTHENTICATION
// ────────────────────────────────────────────────────────────────[...]

async function checkAuthState(page) {
  const state = await page.evaluate(() => ({
    url: window.location.href,
    title: document.title,
    isLoginPage: /login|signin|auth/i.test(document.title + document.body.innerText),
    hasUserToken: !!localStorage.getItem('user') || !!localStorage.getItem('auth'),
    sessionCookie: document.cookie,
  }));
  return state;
}

async function login(page) {
  log('🔐 Attempting login...');

  // First check if already authenticated
  await page.goto(`${PORTAL_URL}/spa`, { waitUntil: 'networkidle', timeout: 45000 });
  await sleep(2000);

  const authState = await checkAuthState(page);
  if (!authState.isLoginPage) {
    log(`✅ Already authenticated — at: ${authState.url}`);
    return true;
  }

  debug(`Auth state: ${JSON.stringify(authState)}`);

  // Navigate to login page explicitly
  await page.goto(`${PORTAL_URL}/spa#/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(2000);

  // Wait for login form to appear
  await Promise.race([
    page.waitForSelector('input[type="email"], input[type="text"], input[name*="email"]', { timeout: 15000 }),
    page.waitForSelector('button:has-text("LOGIN")', { timeout: 15000 }).catch(() => null),
  ]).catch(() => {
    debug('Login form timeout — proceeding anyway');
  });

  // Fill email
  await page.evaluate(({ email }) => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const emailInput = inputs.find(
      i =>
        i.type === 'email' ||
        /email|user|login/i.test((i.name || i.id || i.placeholder || '').toLowerCase())
    );
    if (emailInput) {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(emailInput, email);
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      emailInput.dispatchEvent(new Event('change', { bubbles: true }));
      emailInput.dispatchEvent(new Event('blur', { bubbles: true }));
      console.log(`[Browser] Set email field`);
    }
  }, { email: EMAIL });

  await sleep(500);

  // Fill password
  await page.evaluate(({ password }) => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const passInput = inputs.find(i => i.type === 'password');
    if (passInput) {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(passInput, password);
      passInput.dispatchEvent(new Event('input', { bubbles: true }));
      passInput.dispatchEvent(new Event('change', { bubbles: true }));
      passInput.dispatchEvent(new Event('blur', { bubbles: true }));
      console.log(`[Browser] Set password field`);
    }
  }, { password: PASSWORD });

  await sleep(500);

  // Click login button
  await page.evaluate(() => {
    const btn =
      document.querySelector('button[type="submit"]') ||
      document.querySelector('input[type="submit"]') ||
      Array.from(document.querySelectorAll('button')).find(b => /login|sign in/i.test(b.textContent));

    if (btn) {
      console.log('[Browser] Clicking login button');
      btn.click();
    } else {
      console.log('[Browser] No button found, trying form submit');
      document.querySelector('input[type="password"]')?.form?.submit();
    }
  });

  // Wait for auth to complete
  try {
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 25000 }).catch(() => {});
  } catch {
    debug('Navigation timeout — continuing');
  }

  await sleep(3000); // Extra buffer for session establishment

  const finalState = await checkAuthState(page);
  debug(`Final auth state: ${JSON.stringify(finalState)}`);

  if (finalState.isLoginPage) {
    log('⚠️  Still on login page after attempt');
    return false;
  }

  log(`✅ Login successful — at: ${finalState.url}`);
  return true;
}

// ────────────────────────────────────────────────────────────────[...]
// DATA FETCHING WITH NETWORK INTERCEPTION
// ────────────────────────────────────────────────────────────────[...]

async function fetchSalesOrdersData(page) {
  log('\n📦 Loading sales orders page...');

  const captured = [];
  const requestsSeen = new Set();

  // Set up comprehensive network interception
  page.on('response', async response => {
    try {
      const url = response.url();
      const status = response.status();
      const ct = (response.headers()['content-type'] || '').split(';')[0].trim();

      // Skip static assets, images, fonts, maps
      if (/\.(js|css|png|jpg|jpeg|gif|ico|woff|woff2|svg|map|webp)(\?|$)/i.test(url)) return;

      // Skip duplicates
      if (requestsSeen.has(url)) return;
      requestsSeen.add(url);

      // Log all non-asset requests
      log(`  📡 ${status} [${ct}] ${url.replace(PORTAL_URL, '')}`);

      // Try to capture JSON
      if (status >= 200 && status < 300) {
        try {
          const text = await response.text();
          if (text && (text.startsWith('{') || text.startsWith('['))) {
            const json = JSON.parse(text);
            captured.push({ url, status, data: json, size: text.length });
            debug(`Captured JSON: ${text.slice(0, 100)}...`);
          }
        } catch (parseErr) {
          debug(`Failed to parse response: ${parseErr.message}`);
        }
      }
    } catch (err) {
      debug(`Response handler error: ${err.message}`);
    }
  });

  // Navigate to orders page with multiple strategies
  log(`  → Navigating to orders...`);

  // Strategy 1: Navigate to /spa first
  try {
    await page.goto(`${PORTAL_URL}/spa`, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2000);
  } catch (err) {
    debug(`Navigation to /spa failed: ${err.message}`);
  }

  // Strategy 2: Navigate to hash route
  try {
    await page.goto(`${PORTAL_URL}/spa#/list/orders`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
  } catch (err) {
    debug(`Navigation to /spa#/list/orders failed: ${err.message}`);
  }

  log(`  → Waiting for data to load...`);
  await sleep(8000); // Extended wait for SPA to load data

  // Strategy 3: Try to trigger data load manually
  await page.evaluate(() => {
    // Trigger potential React state updates
    const allInputs = document.querySelectorAll('input, select');
    allInputs.forEach(input => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Trigger scroll to load lazy-loaded content
    window.scrollTo(0, document.body.scrollHeight);
  });

  await sleep(3000);

  // Take screenshot for debugging
  await page.screenshot({ path: 'debug-sales-orders.png', fullPage: false });

  // Get page info
  const info = await page.evaluate(() => ({
    title: document.title,
    url: location.href,
    bodyText: document.body?.innerText?.slice(0, 500),
    dataElements: {
      tables: document.querySelectorAll('table').length,
      divs: document.querySelectorAll('[data-testid*="order"], [data-testid*="row"]').length,
    },
  }));

  log(`  → Page title: "${info.title}"`);
  log(`  → Current URL: ${info.url}`);
  log(`  → Tables found: ${info.dataElements.tables}`);
  log(`  → Data elements: ${info.dataElements.divs}`);
  log(`  → API responses captured: ${captured.length}`);

  return captured;
}

// ────────────────────────────────────────────────────────────────[...]
// DATA EXTRACTION & PARSING
// ────────────────────────────────────────────────────────────────[...]

function extractOrders(captured) {
  if (captured.length === 0) {
    log('\n⚠️  Zero API calls captured. Analyzing...');
    log('   Possible causes:');
    log('   1. Session authentication failed');
    log('   2. Portal uses WebSocket/GraphQL instead of REST API');
    log('   3. Data cached in IndexedDB/LocalStorage (not HTTP)');
    log('   4. CORS blocking requests from browser');
    log('   5. API requires custom headers or tokens');
    log('\n   ℹ️  Check debug-sales-orders.png artifact for page state');
    return [];
  }

  log(`\n🔍 Scanning ${captured.length} API responses for order data...`);

  let bestMatch = null;
  let bestScore = 0;

  for (const { url, data } of captured) {
    const candidates = [
      Array.isArray(data) ? data : null,
      data?.data,
      data?.orders,
      data?.results,
      data?.records,
      data?.items,
      data?.list,
      data?.rows,
      data?.sales_orders,
      data?.salesOrders,
    ].filter(a => Array.isArray(a) && a.length > 0);

    for (const arr of candidates) {
      const sample = arr[0];
      if (!sample || typeof sample !== 'object') continue;

      const keys = Object.keys(sample).join(' ').toLowerCase();
      const relevanceScore =
        (keys.match(/order/gi)?.length || 0) * 10 +
        (keys.match(/customer|party/gi)?.length || 0) * 8 +
        (keys.match(/date|status/gi)?.length || 0) * 5 +
        (keys.match(/invoice|delivery/gi)?.length || 0) * 5;

      log(
        `  → ${url.replace(PORTAL_URL, '')} [${arr.length} items] score: ${relevanceScore} keys: ${keys.slice(
          0,
          80
        )}`
      );

      if (relevanceScore >= 10) {
        log(`  ✅ MATCH — Sample: ${JSON.stringify(sample).slice(0, 150)}...`);
        if (relevanceScore > bestScore) {
          bestScore = relevanceScore;
          bestMatch = arr;
        }
      }
    }
  }

  if (bestMatch) {
    log(`\n✅ Selected best match: ${bestMatch.length} records`);
    return bestMatch;
  }

  log('\n⚠️  No order-like data found. Full API responses:');
  captured.forEach(({ url, data, size }) => {
    log(
      `    ${url.replace(PORTAL_URL, '')} (${size} bytes) → ${JSON.stringify(data).slice(
        0,
        100
      )}...`
    );
  });

  return [];
}

// ────────────────────────────────────────────────────────────────[...]
// DATA NORMALIZATION
// ────────────────────────────────────────────────────────────────[...]

function normalise(raw) {
  const g = (...keys) => {
    for (const k of keys) if (raw[k] != null) return String(raw[k]);
    return '';
  };

  return {
    id: g('order_no', 'orderNo', 'order_number', 'name', 'id'),
    portal_id: g('id', 'pk', '_id'),
    customer_name: g(
      'customer_name',
      'customerName',
      'customer',
      'party_name',
      'partyName',
      'customer_party'
    ),
    order_date: parseDate(g('order_date', 'orderDate', 'date', 'created_at')),
    delivery_date: parseDate(g('delivery_date', 'deliveryDate', 'expected_delivery')),
    status: g('status', 'state', 'order_status', 'docstatus'),
    delivery_for: g('delivery_for', 'deliveryFor', 'purpose', 'type', 'po_no'),
    delivered_pct: parseFloat(g('delivered_pct', 'deliveredPercent')) || 0,
    invoiced_pct: parseFloat(g('invoiced_pct', 'invoicedPercent')) || 0,
    synced_at: new Date().toISOString(),
  };
}

// ────────────────────────────────────────────────────────────────[...]
// SUPABASE SYNC
// ────────────────────────────────────────────────────────────────[...]

async function syncToSupabase(orders) {
  if (!orders.length) {
    log('\n⚠️  No orders to sync.');
    return;
  }

  log(`\n💾 Syncing ${orders.length} orders to Supabase...`);

  const records = orders.map(normalise).filter(r => r.id);

  if (records.length === 0) {
    log('   ⚠️  No valid records after normalization');
    return;
  }

  for (let i = 0; i < records.length; i += 200) {
    const chunk = records.slice(i, i + 200);
    const batchNum = Math.floor(i / 200) + 1;

    try {
      const { error } = await supabase.from('sales_orders').upsert(chunk, { onConflict: 'id' });

      if (error) {
        log(`  ❌ Batch ${batchNum}: ${error.message}`);
      } else {
        log(`  ✅ Batch ${batchNum}: ${chunk.length} records synced`);
      }
    } catch (err) {
      log(`  ❌ Batch ${batchNum} failed: ${err.message}`);
    }
  }
}

async function writeSyncLog(ordersCount, status, errorMsg) {
  try {
    await supabase.from('sync_log').insert({
      synced_at: new Date().toISOString(),
      orders_count: ordersCount,
      customer_count: 0,
      status,
      error_msg: errorMsg || null,
    });
  } catch (err) {
    debug(`Failed to write sync log: ${err.message}`);
  }
}

// ────────────────────────────────────────────────────────────────[...]
// MAIN
// ────────────────────────────────────────────────────────────────[...]

async function main() {
  const t0 = Date.now();
  console.log('\n' + '='.repeat(60));
  log('🚀  GrowsmartSMB → Supabase Sync (v2.0)');
  console.log('='.repeat(60));

  let { browser, context, page } = await createBrowserContext();
  let orders = [];
  let syncStatus = 'error';
  let errorMsg = null;

  try {
    page.setDefaultTimeout(45000);
    page.setDefaultNavigationTimeout(45000);

    // LOGIN
    const loggedIn = await retry(() => login(page), 3, 2000);
    if (!loggedIn) {
      throw new Error('Failed to authenticate after 3 attempts');
    }

    // Save session for reuse
    await saveBrowserSession(context);

    // FETCH DATA
    const captured = await fetchSalesOrdersData(page);

    // EXTRACT
    orders = extractOrders(captured);

    // SYNC
    await syncToSupabase(orders);

    syncStatus = 'success';
    log('');
  } catch (err) {
    log(`\n❌ Sync failed: ${err.message}`);
    debug(err.stack);
    errorMsg = err.message;
  } finally {
    await writeSyncLog(orders.length, syncStatus, errorMsg);
    await page.close();
    await context.close();
    await browser.close();

    console.log('\n' + '='.repeat(60));
    log(
      `${syncStatus === 'success' ? '✅' : '❌'} Done in ${(
        (Date.now() - t0) /
        1000
      ).toFixed(1)}s — Orders synced: ${orders.length}`
    );
    console.log('='.repeat(60) + '\n');

    process.exit(syncStatus === 'success' ? 0 : 1);
  }
}

main();
