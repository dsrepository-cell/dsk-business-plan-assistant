import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // kit/ holds the reference copies; the app's own copies under src/ are what we test.
    exclude: ['node_modules', '.next', 'kit/**', 'e2e/**'],
    coverage: { provider: 'v8', include: ['src/lib/**'] },
  },
});
