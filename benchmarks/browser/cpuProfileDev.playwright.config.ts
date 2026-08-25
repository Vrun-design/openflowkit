import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'cpuProfile.perf.spec.ts',
  outputDir: '../../test-results/browser-cpu-profile',
  timeout: 900_000,
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: 'line',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4177',
    viewport: { width: 1440, height: 900 },
    headless: false,
    channel: 'chrome',
    launchOptions: {
      args: ['--enable-precise-memory-info', '--enable-webgl', '--ignore-gpu-blocklist'],
    },
    // Tracing snapshots the DOM on every action. The OpenCanvas viewport
    // rewrites data-camera-* attributes each frame, which invalidates that
    // snapshot and forces a full re-walk of the semantic a11y tree, adding
    // up to 150 ms per frame at 1,000 nodes. Measuring with tracing on
    // measures the harness, not the renderer.
    trace: 'off',
    screenshot: 'off',
  },
  webServer: {
    command: 'VITE_OPEN_CANVAS_DOCUMENT_V1=1 VITE_OPEN_CANVAS_RENDERER_V1=1 VITE_OPEN_CANVAS_CONNECTORS_V1=1 VITE_OPEN_CANVAS_NODE_LAYOUT_V1=1 VITE_OPEN_CANVAS_BASIC_NODES_V1=1 VITE_OPEN_CANVAS_FREEFORM_NODES_V1=1 VITE_OPEN_CANVAS_ARCHITECTURE_NODES_V1=1 VITE_OPEN_CANVAS_CONTAINER_NODES_V1=1 VITE_OPEN_CANVAS_CLASS_ENTITY_NODES_V1=1 VITE_OPEN_CANVAS_MINDMAP_JOURNEY_NODES_V1=1 VITE_OPEN_CANVAS_SEQUENCE_NODES_V1=1 VITE_OPEN_CANVAS_WIREFRAME_NODES_V1=1 VITE_OPEN_CANVAS_A11Y_V1=1 npm run dev -- --host 127.0.0.1 --port 4177',
    url: 'http://127.0.0.1:4177',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
