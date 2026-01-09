/**
 * Vitest global setup file
 *
 * This file runs before all tests and sets up the test environment.
 */

import { beforeAll, afterAll, afterEach } from 'vitest';

// Set test environment
process.env.NODE_ENV = 'test';

beforeAll(() => {
  // Global setup before all tests
  console.log('🧪 Starting Vitest test suite...');
});

afterAll(() => {
  // Global cleanup after all tests
  console.log('✅ Vitest test suite complete');
});

afterEach(() => {
  // Clean up after each test if needed
});
