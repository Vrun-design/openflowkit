import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'evals/**/*.test.ts'],
    environment: 'node',
    globals: false,
  },
});
