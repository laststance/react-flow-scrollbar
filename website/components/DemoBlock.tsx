import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import type { ReactNode } from 'react';

interface DemoBlockProps {
  /** Source code shown beneath/beside the demo — byte-for-byte the file that renders `children`. */
  source: string;
  /** The live, interactive demo node. */
  children: ReactNode;
  /** Highlight language for the source. Defaults to `tsx`. */
  lang?: string;
  /** `stacked` (default): preview over code. `side-by-side`: preview left / code right at ≥ md. */
  layout?: 'stacked' | 'side-by-side';
}

/**
 * Frames a live demo above (or beside) its own source in one bordered `not-prose` card — the design
 * doc's DemoBlock (§13.4). The `source` string is read from the demo's real file at build time, so
 * what's shown can never drift from what runs.
 * @param source - The demo file's text.
 * @param children - The rendered live demo.
 * @param lang - Highlight language (default `tsx`).
 * @param layout - `stacked` (default) or `side-by-side`.
 * @example
 * <DemoBlock source={quickStartSource}><QuickStartLazy /></DemoBlock>
 */
export function DemoBlock({
  source,
  children,
  lang = 'tsx',
  layout = 'stacked',
}: DemoBlockProps) {
  const isSideBySide = layout === 'side-by-side';
  return (
    <div className="not-prose my-6 overflow-hidden rounded-lg border border-fd-border">
      <div
        className={
          isSideBySide ? 'grid md:grid-cols-2 md:divide-x md:divide-fd-border' : ''
        }
      >
        {/* Live preview */}
        <div className="bg-fd-card p-4">{children}</div>
        {/* Source — horizontal hairline when stacked; the grid's divide-x handles side-by-side */}
        <div className={isSideBySide ? '' : 'border-t border-fd-border'}>
          <DynamicCodeBlock lang={lang} code={source} />
        </div>
      </div>
    </div>
  );
}
