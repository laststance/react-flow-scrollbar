import { defineConfig, devices } from '@playwright/test';

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
