import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * Vitest configuration for Next.js project
 * 
 * This configuration sets up:
 * - React plugin for JSX support
 * - jsdom environment for DOM testing
 * - Path aliases matching Next.js tsconfig
 * - Global test setup file
 */
export default defineConfig({
  plugins: [react()],
  test: {
    // Use jsdom environment to simulate browser DOM for component tests
    environment: 'jsdom',
    // Enable global test APIs (describe, it, expect, etc.)
    globals: true,
    // Setup file that runs before all tests (for global test utilities)
    setupFiles: ['./vitest.setup.ts'],
    // Match test files (either __tests__ folder or .test.ts/.spec.ts files)
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    // Coverage configuration (optional, enable with --coverage flag)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/',
        '**/.next/',
        '**/coverage/',
      ],
    },
  },
  resolve: {
    // Match Next.js path aliases from tsconfig.json
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})

