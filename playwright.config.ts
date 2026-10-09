import { defineConfig, devices } from '@playwright/test';

// Self-contained: the previous config imported `lovable-agent-playwright-config`,
// which is not a dependency, so `npx playwright test` could not start at all.
//
// These specs cover what can be asserted without a backend: route guards,
// client-side form validation and unknown routes. With no reachable Supabase
// the client simply resolves to "no session", which is exactly the state these
// assertions need. Flows that require data live in the SQL suite under
// supabase/tests/ (see supabase/tests/README.md).
const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 8080);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Escape hatch for environments that already ship a Chromium whose build
    // differs from the one this @playwright/test version downloads.
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `npx vite --port ${PORT} --host 127.0.0.1`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
