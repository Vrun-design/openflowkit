import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    // Workers are not in the dev server's startup scan: their deps (gifenc, mediabunny) were found on the
    // first encode, and Vite reloaded every open page mid-session (CI's motion-dialog flake).
    optimizeDeps: { entries: ['index.html', 'src/**/*.worker.ts'] },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    base: './',
    build: {
      chunkSizeWarningLimit: 900,
      modulePreload: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Collapse the per-SVG `?url` lazy stubs (1600+ icons) into a small
            // number of bucketed chunks, one per provider pack. Without this,
            // Vite emits one tiny JS module per icon and Cloudflare Pages
            // upload chokes on the file count.
            if (id.includes('/assets/third-party-icons/') && id.includes('.svg')) {
              const match = id.match(/assets\/third-party-icons\/([^/]+)\//);
              return match ? `icon-urls-${match[1]}` : 'icon-urls';
            }

            if (!id.includes('node_modules')) {
              return undefined;
            }

            if (id.includes('/node_modules/elkjs/')) {
              // Split the in-process fallback (elk.bundled) from the worker-mode API
              // so production loads only the small api shim; the bundled engine is
              // fetched only when the worker path is unavailable.
              if (id.includes('elk.bundled')) return 'vendor-elk-bundled';
              return 'vendor-elk';
            }

            return undefined;
          },
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './vitest.setup.ts',
      testTimeout: 10000,
      maxWorkers: 2,
      // scripts/** uses node:test and mcp-server/** has its own vitest run.
      exclude: [
        'e2e/**',
        'scripts/**',
        '**/node_modules/**',
        'dist/**',
        'mcp-server/**',
      ],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov'],
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.d.ts', 'src/i18n/**'],
      },
    },
  };
});
