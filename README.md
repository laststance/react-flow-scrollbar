# react-flow-scrollbar

[![npm version](https://img.shields.io/npm/v/react-flow-scrollbar.svg)](https://www.npmjs.com/package/react-flow-scrollbar)
[![npm downloads](https://img.shields.io/npm/dm/react-flow-scrollbar.svg)](https://www.npmjs.com/package/react-flow-scrollbar)
[![license](https://img.shields.io/npm/l/react-flow-scrollbar.svg)](./LICENSE)

Custom, viewport-synced **scrollbars** and **bounded panning** (`translateExtent`) for
[React Flow / @xyflow/react](https://reactflow.dev) **v12**.

React Flow ships a MiniMap, Controls, Background, and Panel — but **no scrollbar**. This
package adds draggable, click-to-jump scrollbars that stay in two-way sync with the React
Flow viewport, plus the `translateExtent` pan-clamp that keeps the canvas inside its bounds
so the bars never lie about where you are.

```bash
npm install react-flow-scrollbar
# or: pnpm add react-flow-scrollbar
# or: yarn add react-flow-scrollbar
```

> **Peer dependencies:** `@xyflow/react >=12` and `react ^18 || ^19`. They are not bundled —
> you already have them in a React Flow app.

## Documentation

Full docs live in [`docs/`](./docs), organized by the [Diátaxis](https://diataxis.fr/)
framework:

- 📘 **[Tutorial](./docs/tutorial.md)** — from an empty canvas to working scrollbars in six steps.
- 🛠️ **[How-to guides](./docs/how-to.md)** — recipes: programmatic scroll, theming, focus a node, test the bars.
- 📑 **[Reference](./docs/reference.md)** — the canonical, exhaustive API: every export, type, default, CSS variable.
- 💡 **[Explanation](./docs/explanation.md)** — why a single controller, how the zoom-aware pan-clamp works.

The sections below are a quick-start summary; the docs are the source of truth.

## Features

- 🖱️ **Draggable thumbs** — grab and drag, exactly like a native scrollbar.
- 👆 **Click-to-jump** — click an empty part of the track to page toward it.
- 🔄 **Two-way viewport sync** — pan or zoom the canvas and the bars follow; drag a bar and the canvas follows.
- 🔍 **Zoom-aware bounds** — the `translateExtent` pan-clamp is computed in world coordinates at the **current zoom**, so panning doesn't snap or drift when zoomed in/out.
- 🧩 **Subflow-correct** — bounds resolve absolute node positions through React Flow's internal node lookup, so nodes inside groups are measured where they actually render.
- 🎨 **Themeable** — plain CSS variables on a single root class; no CSS-in-JS, no runtime style engine.
- ⚡ **One pass per change** — the O(n) bounds calculation runs once per node change; per-frame updates are O(1) and coalesced into a single `requestAnimationFrame`.
- 📦 **Tiny & typed** — ships ESM + CJS + `.d.ts`, tree-shakeable, side-effect-free except the stylesheet.

## Quick start

`useBoundedReactFlowViewport` reads the React Flow store (it calls hooks like `useReactFlow`
internally), so the component that calls it **must live under a `<ReactFlowProvider>`**. Wire
the controller's `translateExtent` onto `<ReactFlow>` yourself, and drop `<ReactFlowScrollbars>`
in as a child.

```tsx
import { ReactFlow, ReactFlowProvider, useNodesState } from '@xyflow/react';
import {
  ReactFlowScrollbars,
  useBoundedReactFlowViewport,
} from 'react-flow-scrollbar';
import '@xyflow/react/dist/style.css';
import 'react-flow-scrollbar/styles.css';

const INITIAL_NODES = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'A' } },
  { id: '2', position: { x: 480, y: 320 }, data: { label: 'B' } },
  { id: '3', position: { x: 1200, y: 720 }, data: { label: 'C' } },
];

function Flow() {
  const [nodes, , onNodesChange] = useNodesState(INITIAL_NODES);

  // The single source of truth: scrollbars, pan-clamp, and focus all derive from these node bounds.
  const controller = useBoundedReactFlowViewport({ nodes });

  return (
    <ReactFlow
      nodes={nodes}
      onNodesChange={onNodesChange}
      // ⚠️ Required — without this the scrollbars work but panning snaps back to center.
      translateExtent={controller.translateExtent}
    >
      <ReactFlowScrollbars controller={controller} />
    </ReactFlow>
  );
}

export default function App() {
  return (
    // The provider must wrap the component that calls useBoundedReactFlowViewport.
    <ReactFlowProvider>
      <div style={{ width: '100%', height: 600 }}>
        <Flow />
      </div>
    </ReactFlowProvider>
  );
}
```

That's it — both bars appear as soon as the content overflows the pane (React Flow measures
unsized nodes asynchronously; the bars wait for that and then show). For a step-by-step
walkthrough, see the **[Tutorial](./docs/tutorial.md)**.

## Why a controller?

The scrollbars, the pan-clamp (`translateExtent`), and "focus this node" all derive from the
**same** node bounds. If they read from different sources they drift apart — the bar says one
thing, the clamp does another, and panning snaps. So a single controller hook —
`useBoundedReactFlowViewport` — owns the bounds and is the source of truth. You pass its
`translateExtent` to `<ReactFlow>` and hand the whole controller to `<ReactFlowScrollbars>`.
One calculation, one truth, no drift. → [Explanation](./docs/explanation.md#why-a-single-controller).

## API

> This is a condensed summary of the two main exports. The **canonical, exhaustive API** —
> including the four pure helpers, every type, the default constants, and the development
> warnings — lives in **[docs/reference.md](./docs/reference.md)**.

### `useBoundedReactFlowViewport(options?)`

Returns a `BoundedReactFlowViewportController`. Call it inside a component under
`<ReactFlowProvider>`.

#### Options

| Option         | Type     | Default | Description                                                                        |
| -------------- | -------- | ------- | ---------------------------------------------------------------------------------- |
| `nodes`        | `Node[]` | store   | Nodes whose bounds define the scroll area. Defaults to the store nodes (`useNodes()`). Pass your controlled array for the most robust first-render bounds. |
| `margin`       | `number` | `30`    | Content-edge inset in **flow coordinates** — breathing room around the outermost nodes. |
| `trackSize`    | `number` | `8`     | Scrollbar track thickness in **px**. The component renders the track at this size so geometry matches. |
| `minThumbSize` | `number` | `32`    | Minimum thumb length in **px**, so the thumb stays grabbable on huge canvases.      |

#### Returns — `BoundedReactFlowViewportController`

| Member            | Type                                                  | Description                                                                            |
| ----------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `translateExtent` | `CoordinateExtent \| undefined`                       | Pass to `<ReactFlow translateExtent={...}>`. `undefined` when there's nothing to bound. |
| `metrics`         | `ReactFlowScrollMetrics`                              | Current scrollbar geometry + scroll range, recomputed reactively.                       |
| `trackSize`       | `number`                                              | The configured bar thickness (px), echoed back for the component.                       |
| `scrollTo`        | `(ratios: { xRatio?: number; yRatio?: number }) => void` | Scroll to absolute ratios (`0..1`); an omitted axis keeps its position.              |
| `scrollBy`        | `(delta: { x?: number; y?: number }) => void`         | Scroll by a flow-coordinate delta on either axis.                                       |

The viewport writes from `scrollTo` / `scrollBy` are coalesced into a single
`requestAnimationFrame`, so the new transform lands a frame or two later — handy to know when
asserting on it in tests (use `expect.poll`).

### `<ReactFlowScrollbars />`

Renders the overlay with the bars. Returns `null` until there is something to scroll. Render
it as a child of `<ReactFlow>`.

| Prop          | Type                                       | Default  | Description                                                |
| ------------- | ------------------------------------------ | -------- | --------------------------------------------------------- |
| `controller`  | `BoundedReactFlowViewportController`       | —        | **Required.** The controller from the hook above.         |
| `orientation` | `'both' \| 'horizontal' \| 'vertical'`     | `'both'` | Which bars to render.                                     |
| `className`   | `string`                                   | —        | Extra class on the overlay root (e.g. for theming).       |
| `style`       | `CSSProperties`                            | —        | Inline style merged onto the overlay root (CSS vars welcome). |

> **Dev warning:** if you pass a `controller` but forget `translateExtent={controller.translateExtent}`
> on `<ReactFlow>`, the component logs a one-time console warning in development — panning would
> otherwise snap back to center.

### Pure helpers

The math is exported framework-free, so you can compute bounds, metrics, focus viewports, or
the pan-clamp without the hook (useful for tests or custom UIs):

```ts
import {
  getReactFlowScrollMetrics,
  getReactFlowTranslateExtent,
  getReactFlowFocusViewport,
  getReactFlowViewportFromScrollRatios,
  DEFAULT_SCROLL_AREA_MARGIN_PX,
} from 'react-flow-scrollbar';
```

Each helper takes an optional `getBounds` seam; **pass `useReactFlow().getNodesBounds` if your
graph has subflows**, or nested nodes resolve to the wrong place. Full signatures →
[reference](./docs/reference.md#pure-helpers); a worked focus/standalone recipe →
[how-to](./docs/how-to.md#use-the-math-without-the-hook).

## Theming

The static look — colors, radius, track thickness — is plain CSS variables on the
`.react-flow-scrollbars` root. Per-frame geometry (track length, thumb size/offset) is applied
inline by the component and is intentionally **not** themeable. Override the variables with your
own rule, the `className` / `style` props, or per-axis `[data-axis]` selectors.

| Variable                              | Default                     | Controls                       |
| ------------------------------------- | --------------------------- | ------------------------------ |
| `--rf-scrollbar-track-size`           | `8px`                       | Track thickness                |
| `--rf-scrollbar-hit-size`             | `--rf-scrollbar-track-size` | Thumb grab area (touch)        |
| `--rf-scrollbar-track-color`          | `rgba(0,0,0,0.04)`          | Track background               |
| `--rf-scrollbar-thumb-color`          | `rgba(0,0,0,0.35)`          | Thumb fill                     |
| `--rf-scrollbar-thumb-color-hover`    | `rgba(0,0,0,0.5)`           | Thumb fill on hover            |
| `--rf-scrollbar-radius`               | `6px`                       | Thumb corner radius            |

**Dark mode ships automatically.** When a `.dark` ancestor is present (the Tailwind / shadcn /
next-themes convention) the bars switch to white-translucent — no configuration needed. On coarse
(touch) pointers the thumb grab area widens to ~24px (`--rf-scrollbar-hit-size`) while the bar stays
thin. Override any variable to customize either palette:

```css
/* Customize the dark palette (already applied automatically under `.dark`). */
.dark .react-flow-scrollbars {
  --rf-scrollbar-thumb-color: rgba(255, 255, 255, 0.4);
}
```

Or inline per instance, since CSS variables are valid `style` values:

```tsx
<ReactFlowScrollbars
  controller={controller}
  style={{ '--rf-scrollbar-thumb-color': '#6366f1' } as React.CSSProperties}
/>
```

More theming recipes (per-axis, inline) → [how-to](./docs/how-to.md#theming); the full variable
and selector tables → [reference](./docs/reference.md#theming-reference).

### Stable selectors

For E2E tests or advanced styling, the component sets stable data-attributes you can target
without depending on class names:

| Selector                                          | Element                       |
| ------------------------------------------------- | ----------------------------- |
| `[data-rf-scrollbars]`                            | Overlay root                  |
| `[data-rf-scrollbar-track][data-axis="x"\|"y"]`   | A track (horizontal/vertical) |
| `[data-rf-scrollbar-thumb][data-axis="x"\|"y"]`   | A thumb (horizontal/vertical) |

## Recipes

**Programmatic scroll** — drive the canvas from your own buttons:

```tsx
const controller = useBoundedReactFlowViewport({ nodes });

<button onClick={() => controller.scrollTo({ xRatio: 0 })}>Scroll to start</button>
<button onClick={() => controller.scrollTo({ xRatio: 1 })}>Scroll to end</button>
<button onClick={() => controller.scrollBy({ y: 200 })}>Nudge down</button>
```

**One axis only** — e.g. a wide timeline that scrolls horizontally:

```tsx
<ReactFlowScrollbars controller={controller} orientation="horizontal" />
```

**More breathing room** around the content edges:

```tsx
const controller = useBoundedReactFlowViewport({ nodes, margin: 120 });
```

More recipes — focus a node, use the math without the hook, target the bars in tests →
**[How-to guides](./docs/how-to.md)**.

## How bounded panning works

`translateExtent` tells React Flow how far the canvas may pan. This package computes it in
**world coordinates at the current zoom**: each axis is padded so the full content plus one
viewport's worth of travel is reachable — `max(contentMax, min + containerSize / zoom)`. The
`/ zoom` is what keeps panning honest when you're zoomed in or out (a pixel of pane is a
different number of world units at each zoom level). The extent is also kept referentially
stable while its four numbers are unchanged, so React Flow doesn't re-clamp the viewport on
every zoom frame.

You don't have to think about any of this — just wire `controller.translateExtent` onto
`<ReactFlow>`. It's documented here because it's the part most hand-rolled scrollbars get wrong.
→ Full derivation, the referential-stability memo, and the rest of the design rationale:
**[Explanation](./docs/explanation.md#how-bounded-panning-works)**.

## Example

A runnable playground (the same fixture the E2E suite drives) lives in
[`examples/playground`](./examples/playground):

```bash
pnpm install
pnpm example:dev   # → http://127.0.0.1:5173
```

## Requirements

- **React** 18 or 19
- **@xyflow/react** 12 or later
- The component and hook must run under a `<ReactFlowProvider>` (or inside `<ReactFlow>`, which provides the same context).

## License

[MIT](./LICENSE) © [Laststance.io](https://github.com/laststance)
