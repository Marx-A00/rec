import path from 'path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Global test settings
    globals: true,
    environment: 'node', // Default to node for unit tests

    // Test file patterns
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    exclude: ['node_modules', 'tests/*.spec.ts'], // Exclude Playwright E2E tests

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.d.ts',
        'src/generated/**', // Exclude generated GraphQL code
        'src/app/**', // Exclude Next.js app routes (tested via E2E)
        'src/components/**', // Components tested separately
      ],
    },

    // Setup files
    setupFiles: ['./tests/setup.ts'],

    // Timeout for slow tests
    testTimeout: 10000,

    // Reporter
    reporters: ['verbose'],
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
