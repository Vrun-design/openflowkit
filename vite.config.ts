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

            if (id.includes('/node_modules/reactflow/')) {
              return 'vendor-reactflow';
            }

            if (id.includes('/node_modules/elkjs/')) {
              // Split the in-process fallback (elk.bundled) from the worker-mode API
              // so production loads only the small api shim; the bundled engine is
              // fetched only when the worker path is unavailable.
              if (id.includes('elk.bundled')) return 'vendor-elk-bundled';
              return 'vendor-elk';
            }

            if (
              id.includes('/node_modules/react-markdown/') ||
              id.includes('/node_modules/remark-gfm/') ||
              id.includes('/node_modules/remark-breaks/') ||
              id.includes('/node_modules/rehype-slug/') ||
              id.includes('/node_modules/react-syntax-highlighter/')
            ) {
              return 'vendor-markdown';
            }

            if (
              id.includes('/node_modules/i18next') ||
              id.includes('/node_modules/react-i18next/')
            ) {
              return 'vendor-i18n';
            }

            if (id.includes('/node_modules/lucide-react/')) {
              return 'vendor-lucide';
            }

            if (id.includes('/node_modules/framer-motion/')) {
              return 'vendor-motion';
            }

            if (id.includes('/node_modules/@google/genai/')) {
              return 'vendor-ai';
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
      exclude: ['e2e/**', 'benchmarks/browser/**', 'node_modules/**', 'dist/**', 'mcp-server/**'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov'],
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.d.ts', 'src/i18n/**'],
      },
    },
  };
});
