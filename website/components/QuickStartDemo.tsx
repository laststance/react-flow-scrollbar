import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DemoBlock } from './DemoBlock';
import { QuickStartLazy } from './demos/QuickStartLazy';

// Read the demo's own source at build time so the code shown is byte-for-byte the file that runs
// (drift-proof). This is a Server Component, so Node `fs` is available; the docs pages are statically
// generated, so the read happens during `next build`, not per request. Chosen over `?raw` imports so
// it works identically under Turbopack and webpack with zero bundler-loader config.
const QUICK_START_SOURCE = readFileSync(
  join(process.cwd(), 'components/demos/QuickStart.tsx'),
  'utf8',
);

/** The Quick Start live demo + its source, composed for use in MDX (`<QuickStartDemo />`). */
export function QuickStartDemo() {
  return (
    <DemoBlock source={QUICK_START_SOURCE}>
      <QuickStartLazy />
    </DemoBlock>
  );
}
