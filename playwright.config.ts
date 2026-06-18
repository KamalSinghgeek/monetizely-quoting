import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * E2E runs against a production build + `next start` (closest to deployed behavior),
 * using the local Postgres in .env. CI provides DATABASE_URL via a Postgres service.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'line' : 'list',
  timeout: 120_000,
  // Generous assertion timeout: dev compiles routes on first request, and server-action
  // round-trips take a moment.
  expect: { timeout: 20_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // The e2e runs against the real production build (`next build` + `next start`), the same artifact
  // that deploys to Vercel — one full create-catalog→build-quote→view-share flow on a FRESH server,
  // which mirrors a single Vercel function lifecycle. `npm run build` uses `next build --webpack`
  // (not default Turbopack): a long-lived `next start` has an intermittent Server-Action stall under
  // sustained use, and the Turbopack prod build is worse (can stall on the first request) — the
  // webpack build reliably handles a fresh-server flow. See README decisions for the full diagnosis.
  webServer: {
    command: `npm run build && npx next start --port ${PORT}`,
    url: BASE_URL,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
