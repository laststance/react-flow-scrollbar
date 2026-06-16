'use client';

import dynamic from 'next/dynamic';

// Must equal the pane height in QuickStart.tsx (`height: 480`). Deliberately a separate literal, not
// imported from the shown demo file: that file is displayed verbatim as a copy-paste example and
// must stay library-focused, free of website lazy-loading plumbing. This placeholder only needs to
// reserve the same vertical space so swapping it for the real demo causes no layout shift.
const DEMO_HEIGHT_PX = 480;

// React Flow measures DOM and uses browser-only APIs, so it must not server-render. `ssr: false`
// (only allowed inside a Client Component) defers it to the client; the sized `loading` placeholder
// reserves the demo's height so there is no layout shift or hydration flash (design task T5).
const QuickStart = dynamic(() => import('./QuickStart'), {
  ssr: false,
  loading: () => (
    <div
      style={{ height: DEMO_HEIGHT_PX }}
      className="flex items-center justify-center text-sm text-fd-muted-foreground"
    >
      Loading demo…
    </div>
  ),
});

/** Client wrapper that lazy-loads the React Flow Quick Start demo (no SSR). */
export function QuickStartLazy() {
  return <QuickStart />;
}
