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
    command: [
      'VITE_OPEN_CANVAS_EDITOR_SURFACE_V1=1',
      'VITE_OPEN_CANVAS_DOCUMENT_V1=1',
      'VITE_OPEN_CANVAS_RENDERER_V1=1',
      'VITE_OPEN_CANVAS_CONNECTORS_V1=1',
      'VITE_OPEN_CANVAS_NODE_LAYOUT_V1=1',
      'VITE_OPEN_CANVAS_BASIC_NODES_V1=1',
      'VITE_OPEN_CANVAS_FREEFORM_NODES_V1=1',
      'VITE_OPEN_CANVAS_ARCHITECTURE_NODES_V1=1',
      'VITE_OPEN_CANVAS_CONTAINER_NODES_V1=1',
      'VITE_OPEN_CANVAS_CLASS_ENTITY_NODES_V1=1',
      'VITE_OPEN_CANVAS_MINDMAP_JOURNEY_NODES_V1=1',
      'VITE_OPEN_CANVAS_SEQUENCE_NODES_V1=1',
      'VITE_OPEN_CANVAS_WIREFRAME_NODES_V1=1',
      'npm run dev -- --host 127.0.0.1 --port 4178',
    ].join(' '),
    url: 'http://127.0.0.1:4178',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
