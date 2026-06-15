import { defineConfig } from 'vitest/config'

// The ported metric spec uses bare `describe`/`it`/`expect` (globals: true) and
// exercises pure functions against the real @xyflow/react `getNodesBounds`, so a
// plain node environment is enough — no DOM. Component behavior is covered by the
// Playwright component tests, not here.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
