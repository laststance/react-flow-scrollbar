import { defineConfig, defineDocs } from 'fumadocs-mdx/config';

// The `content/docs` MDX collection. `fumadocs-mdx` (postinstall + the next plugin) parses these
// files into the generated `.source` index that `lib/source.ts` loads.
export const docs = defineDocs({
  dir: 'content/docs',
});

export default defineConfig();
