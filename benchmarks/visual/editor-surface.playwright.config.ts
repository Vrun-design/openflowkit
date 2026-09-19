import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '**/opencanvas.editor-surface.spec.ts',
  outputDir: '../../test-results/opencanvas-editor-surface',
  timeout: 120_000,
  workers: 1,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4178',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader'],
        },
      },
    },
  ],
  webServer: {
    // No flag overrides: this spec proves the default build ships the surface.
    command: 'npm run dev -- --host 127.0.0.1 --port 4178',
    url: 'http://127.0.0.1:4178',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
