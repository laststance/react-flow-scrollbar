import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Example app for manual play + Playwright e2e. The package name is aliased to source so the example
// reads like real consumer code (`import { ... } from 'react-flow-scrollbar'`) while exercising the
// live src — no build step sits between an edit and the e2e run. The styles.css alias is listed first
// because alias matching is first-match-wins and the bare name is a prefix of the stylesheet path.
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: 'react-flow-scrollbar/styles.css',
        replacement: resolve(__dirname, '../../src/styles.css'),
      },
      {
        find: 'react-flow-scrollbar',
        replacement: resolve(__dirname, '../../src/index.ts'),
      },
    ],
  },
  // Pin to IPv4 127.0.0.1: Vite would otherwise bind IPv6 [::1] only, and Node 17+ resolves
  // `localhost` to 127.0.0.1 first — so Playwright's health check (and CI) could never reach it.
  // strictPort: fail loudly if 5173 is taken instead of silently moving to 5174 (which would leave
  // Playwright polling a dead port for the full 120s timeout).
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
});
