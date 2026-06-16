import Link from 'next/link';

// Minimal landing hero (vertical-slice scope): headline + subhead + a single indigo CTA to the
// Quick Start. The full split-hero / feature-row treatment (design doc §13.4) is deferred to a
// later PR — this slice proves the pipeline, not the marketing page.
export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <span className="mb-5 inline-flex items-center rounded-full border border-fd-border px-3 py-1 font-mono text-xs text-fd-muted-foreground">
        React Flow / @xyflow/react v12
      </span>
      <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight text-fd-foreground sm:text-5xl">
        Viewport-synced scrollbars for React Flow
      </h1>
      <p className="mt-5 max-w-xl text-balance text-lg text-fd-muted-foreground">
        Draggable, click-to-jump scrollbars that stay in two-way sync with the canvas — plus the
        zoom-aware <code className="font-mono text-[0.95em]">translateExtent</code> pan-clamp that
        keeps the bars from lying about where you are.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <Link
          href="/docs/quick-start"
          className="rounded-md bg-fd-primary px-5 py-2.5 text-sm font-medium text-fd-primary-foreground transition-opacity hover:opacity-90"
        >
          Get started
        </Link>
        <a
          href="https://github.com/laststance/react-flow-scrollbar"
          className="rounded-md border border-fd-border px-5 py-2.5 text-sm font-medium text-fd-foreground transition-colors hover:bg-fd-accent"
        >
          GitHub
        </a>
      </div>
    </main>
  );
}
