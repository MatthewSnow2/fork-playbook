import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // Use happy-dom for faster DOM testing
    environment: 'happy-dom',

    // Global test setup
    globals: true,

    // Setup files for testing-library matchers
    setupFiles: ['./tests/setup.js'],

    // Include patterns
    include: [
      'tests/**/*.test.js',
      'tests/**/*.test.jsx',
      'cli/**/*.test.js',
      'src/**/*.test.js',
      'src/**/*.test.jsx'
    ],

    // Exclude patterns
    exclude: [
      'node_modules',
      'dist',
      '.git'
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'cli/lib/**/*.js',
        'src/utils/**/*.js',
        'src/contexts/**/*.jsx',
        'src/components/adaptive/**/*.jsx'
      ],
      exclude: [
        'node_modules',
        'tests',
        '**/*.test.js',
        '**/*.test.jsx'
      ]
    }
  }
});
