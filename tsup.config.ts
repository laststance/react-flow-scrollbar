import { copyFileSync } from 'node:fs'
import { defineConfig } from 'tsup'

// Build ESM + CJS + d.ts and ship a standalone dist/styles.css that consumers
// import explicitly (`import 'react-flow-scrollbar/styles.css'`), mirroring how
// @xyflow/react ships its own stylesheet. The JS bundles stay CSS-free so the
// component tree-shakes cleanly when a consumer brings their own theme.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  // Keep the peer runtime out of the bundle.
  external: ['react', 'react-dom', 'react/jsx-runtime', '@xyflow/react'],
  outExtension({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.js' }
  },
  // Copy the hand-authored stylesheet verbatim after the JS build succeeds.
  onSuccess: async () => {
    copyFileSync('src/styles.css', 'dist/styles.css')
  },
})
