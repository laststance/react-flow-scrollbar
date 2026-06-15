import { defineConfig, devices } from '@playwright/test';

// A loopback dev server must never be reached through an HTTP proxy. Sandboxed/firewalled CI and
// corporate setups inject HTTP_PROXY into the test-runner env; Playwright's webServer readiness probe
// resolves it via `getProxyForUrl`, and a proxy that refuses to forward a plain-HTTP GET to a loopback
// target answers 405 — so the probe never reaches Vite and Playwright polls until the 120s timeout.
// Bypassing the proxy for loopback makes the probe (and in-test fetches) connect to Vite directly.
// No effect when no proxy is configured, so it is safe in plain local/CI runs too.
const PROXY_BYPASS_LOOPBACK = '127.0.0.1,localhost,::1';
process.env.NO_PROXY = [process.env.NO_PROXY, PROXY_BYPASS_LOOPBACK]
  .filter(Boolean)
  .join(',');
process.env.no_proxy = [process.env.no_proxy, PROXY_BYPASS_LOOPBACK]
  .filter(Boolean)
  .join(',');

// Drives the Vite playground in a real Chromium so React Flow actually measures nodes and applies the
// d3-zoom transform — the only environment where the async-measure and overlay-pinning behaviours are
// real (jsdom has no layout). Video is recorded for every test so motion/jank is reviewable per frame.
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    // IPv4 literal, matching the Vite server bind — avoids the localhost→::1/127.0.0.1 ambiguity.
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    video: 'on',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm example:dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
