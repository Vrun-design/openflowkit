import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.visual.spec.ts',
  outputDir: '../../test-results/opencanvas-visual',
  timeout: 300_000,
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: 'line',
  expect: {
    timeout: 20_000,
    toHaveScreenshot: {
      animations: 'disabled',
      maxDiffPixelRatio: 0.015,
    },
  },
  use: {
    baseURL: 'http://127.0.0.1:4175',
    colorScheme: 'light',
    locale: 'en-US',
    timezoneId: 'UTC',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      launchOptions: {
        args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader'],
      },
    },
  }],
  webServer: {
    command: [
      'VITE_OPEN_CANVAS_DOCUMENT_V1=1',
      'VITE_OPEN_CANVAS_RENDERER_V1=1',
      'VITE_OPEN_CANVAS_CONNECTORS_V1=1',
      'VITE_OPEN_CANVAS_NODE_LAYOUT_V1=1',
      'VITE_OPEN_CANVAS_ORGANIZATION_V1=1',
      'VITE_OPEN_CANVAS_BASIC_NODES_V1=1',
      'VITE_OPEN_CANVAS_FREEFORM_NODES_V1=1',
      'VITE_OPEN_CANVAS_ARCHITECTURE_NODES_V1=1',
      'VITE_OPEN_CANVAS_CONTAINER_NODES_V1=1',
      'VITE_OPEN_CANVAS_CLASS_ENTITY_NODES_V1=1',
      'VITE_OPEN_CANVAS_MINDMAP_JOURNEY_NODES_V1=1',
      'VITE_OPEN_CANVAS_SEQUENCE_NODES_V1=1',
      'VITE_OPEN_CANVAS_WIREFRAME_NODES_V1=1',
      'VITE_OPEN_CANVAS_A11Y_V1=1',
      'npm run dev -- --host 127.0.0.1 --port 4175',
    ].join(' '),
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
