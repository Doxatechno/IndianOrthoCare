import { expect, test } from '@playwright/test';

// Regression cover for the route guards. These need no backend: with no
// session the app must send every admin route to /login and the technician
// portal to /technician-login.
const ADMIN_ROUTES = ['/', '/customers', '/equipment', '/tickets', '/amc', '/pm-schedules', '/technicians', '/sales-orders'];

test.describe('unauthenticated access', () => {
  for (const route of ADMIN_ROUTES) {
    test(`${route} redirects to /login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login$/);
    });
  }

  test('/technician-portal redirects to /technician-login', async ({ page }) => {
    await page.goto('/technician-portal');
    await expect(page).toHaveURL(/\/technician-login$/);
  });

  test('an unknown route does not render the admin shell', async ({ page }) => {
    await page.goto('/no-such-page');
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe('admin login form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('renders email and password fields', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('submitting empty does not navigate away', async ({ page }) => {
    await page.locator('button[type="submit"]').first().click();
    await expect(page).toHaveURL(/\/login$/);
  });
});

test('technician login form renders', async ({ page }) => {
  await page.goto('/technician-login');
  await expect(page.locator('input[type="password"]')).toBeVisible();
});
