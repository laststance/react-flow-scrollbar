import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMDX } from 'fumadocs-mdx/next';

// Absolute path to the MONOREPO ROOT (parent of this website/ dir). website/ is a pnpm-workspace
// member, so pnpm hoists shared deps (next, react, …) into the repo-root `.pnpm` store and the demo
// imports the workspace `react-flow-scrollbar` package whose source also lives at the repo root —
// i.e. next + the workspace lib are physically OUTSIDE website/. Turbopack's workspace-root
// auto-inference turns fatal under Vercel/CI builds ("couldn't find next/package.json from
// website/app"), so we pin `turbopack.root` below to the monorepo root; anything narrower (e.g.
// website/) puts next and the workspace lib out of scope and the production build fails.
const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Wraps the Next config so Fumadocs MDX is compiled and the `.source` index is (re)generated on
// dev/build. Works under both Turbopack (Next 16 default) and webpack — the live-demo source shown
// in <DemoBlock> is read via Node `fs` at build time (see components/QuickStartDemo.tsx), so no
// bundler-specific `?raw` loader rule is needed.
//
// NOTE: `@xyflow/react` must resolve to a SINGLE physical copy across the website and the (workspace)
// library, or React Flow ends up with two zustand stores and the live demo crashes with error #001.
// That is handled at the dependency layer (aligned `@types/react` ranges → identical pnpm peer hash →
// one instance), NOT with a bundler alias here: Turbopack's `resolveAlias` mis-handles absolute paths.
const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Pin Turbopack's workspace root to the monorepo root (see monorepoRoot note above) so root
  // auto-inference can't fail to resolve `next` / the workspace lib during the Vercel build.
  turbopack: {
    root: monorepoRoot,
  },
  // `vercel build` injects `outputFileTracingRoot = website/`, and Next 16 requires it to equal
  // `turbopack.root`; when they differ it silently prefers outputFileTracingRoot, re-narrowing the
  // root back to website/ and breaking `next` resolution. Pin it to the monorepo root to match.
  outputFileTracingRoot: monorepoRoot,
};

export default withMDX(config);
