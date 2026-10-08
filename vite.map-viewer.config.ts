import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

// Bundles the map viewer for `openflowkit map --html`: one JS and one CSS the CLI inlines into a single page.
// ELK runs in the page (no worker file to fetch), so the editor's runtime module is swapped for the bundled engine.
const map = resolve(__dirname, 'src/opencanvas/presentation/v2/map');
export default defineConfig({
  plugins: [react()],
  define: { 'process.env.NODE_ENV': '"production"' },
  resolve: {
    alias: [
      { find: /^(?:.*\/)?services\/elk-layout\/runtime$/, replacement: resolve(map, 'standaloneElk.ts') },
      { find: '@', replacement: resolve(__dirname, 'src') },
    ],
  },
  publicDir: false,
  build: {
    lib: { entry: resolve(map, 'standalone.tsx'), name: 'OfkMap', fileName: () => 'map-viewer.js', cssFileName: 'map-viewer', formats: ['iife'] },
    outDir: 'mcp-server/src/generated-viewer',
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
  },
});
