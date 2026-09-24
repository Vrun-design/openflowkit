import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // One browser at a time: two headed WebGL canvases starve each other and
  // canvas specs fail with "no empty point". Serial is slower, never flaky.
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 4173',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'node e2e/stubProviderServer.mjs 4399',
      url: 'http://127.0.0.1:4399/health',
      reuseExistingServer: !process.env.CI,
      timeout: 20_000,
    },
  ],
});
