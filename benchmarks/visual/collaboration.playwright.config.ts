import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '**/opencanvas.collaboration.spec.ts',
  outputDir: '../../test-results/opencanvas-collaboration',
  timeout: 120_000,
  workers: 1,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4176',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      launchOptions: { args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader'] },
    },
  }],
  webServer: {
    command: [
      'VITE_OPEN_CANVAS_DOCUMENT_V1=1',
      'VITE_OPEN_CANVAS_RENDERER_V1=1',
      'VITE_OPEN_CANVAS_CONNECTORS_V1=1',
      'VITE_OPEN_CANVAS_NODE_LAYOUT_V1=1',
      'VITE_OPEN_CANVAS_BASIC_NODES_V1=1',
      'VITE_OPEN_CANVAS_A11Y_V1=1',
      'VITE_COLLABORATION_ENABLED=1',
      'VITE_OPEN_CANVAS_CANONICAL_COLLABORATION=1',
      'npm run dev -- --host 127.0.0.1 --port 4176',
    ].join(' '),
    url: 'http://127.0.0.1:4176',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
