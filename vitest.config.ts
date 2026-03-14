import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'scripts/**/*.test.ts'],
    exclude: ['node_modules', 'out', 'dist'],
    environmentMatchGlobs: [
      // React component tests need DOM APIs
      ['src/**/*.test.tsx', 'jsdom'],
    ],
  },
})
