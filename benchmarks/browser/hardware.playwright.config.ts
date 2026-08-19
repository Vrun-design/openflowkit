import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'hardware.perf.spec.ts',
  outputDir: '../../test-results/browser-hardware-benchmark',
  timeout: 900_000,
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: 'line',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4176',
    viewport: { width: 1440, height: 900 },
    headless: false,
    channel: 'chrome',
    launchOptions: {
      args: ['--enable-precise-memory-info', '--enable-webgl', '--ignore-gpu-blocklist'],
    },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4176',
    url: 'http://127.0.0.1:4176',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
