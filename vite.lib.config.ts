import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
    plugins: [react()],
    publicDir: false,
    build: {
        lib: {
            entry: resolve(__dirname, 'src/lib/index.ts'),
            name: 'OpenFlowKitCore',
            fileName: (format) => `openflowkit-core.${format}.js`,
            formats: ['es', 'cjs']
        },
        outDir: 'src/lib/dist',
        rollupOptions: {
            external: ['react', 'react-dom', 'reactflow'],
            output: {
                globals: {
                    react: 'React',
                    'react-dom': 'ReactDOM',
                    'reactflow': 'ReactFlow'
                }
            }
        }
    }
});
