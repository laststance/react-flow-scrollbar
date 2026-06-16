import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';

// Merges Fumadocs' default MDX components (callouts, code blocks, tables…) with any per-page
// overrides. Passed to every rendered MDX page in app/docs/[[...slug]]/page.tsx.
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    ...components,
  };
}
