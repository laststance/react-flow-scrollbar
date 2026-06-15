import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { defineConfig } from 'tsup';

/**
 * Prepend the `'use client'` directive to a built bundle (esbuild strips it from a `banner` because
 * it treats it as a module directive), and realign the sourcemap by one generated line so debugging
 * stays accurate.
 *
 * @param jsPath - path to the emitted JS bundle
 * @param mapPath - path to its sourcemap
 */
const prependUseClient = (jsPath: string, mapPath: string): void => {
  const code = readFileSync(jsPath, 'utf8');
  if (/^['"]use client['"]/.test(code)) {
    return;
  }
  writeFileSync(jsPath, `'use client';\n${code}`);
  try {
    const map = JSON.parse(readFileSync(mapPath, 'utf8')) as {
      mappings: string;
    };
    // Mappings are ';'-separated per generated line; a leading ';' shifts them all down one line.
    map.mappings = `;${map.mappings}`;
    writeFileSync(mapPath, JSON.stringify(map));
  } catch {
    // No sourcemap to realign — the directive prepend still stands.
  }
};

// Build ESM + CJS + d.ts and ship a standalone dist/styles.css that consumers import explicitly
// (`import 'react-flow-scrollbar/styles.css'`), mirroring how @xyflow/react ships its stylesheet.
// The JS bundles stay CSS-free so the component tree-shakes cleanly when a consumer brings a theme.
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
    return { js: format === 'cjs' ? '.cjs' : '.js' };
  },
  // After the JS build: copy the stylesheet and stamp the client directive onto both bundles.
  onSuccess: async () => {
    copyFileSync('src/styles.css', 'dist/styles.css');
    prependUseClient('dist/index.js', 'dist/index.js.map');
    prependUseClient('dist/index.cjs', 'dist/index.cjs.map');
  },
});
