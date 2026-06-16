# Reference

The complete, canonical API surface of `react-flow-scrollbar`. Every public export
is listed here with its exact types, defaults, and edge-case behavior. The README
carries a shorter summary of the two most-used exports; **this file is the source of
truth** when the two disagree.

Looking for something else?

- **New to the library?** Start with the [Tutorial](./tutorial.md).
- **Trying to do one specific thing?** See the [How-to recipes](./how-to.md).
- **Want to know _why_ it works this way?** Read the [Explanation](./explanation.md).

Everything is imported from the package root, except the stylesheet:

```ts
import {
  // Controller
  useBoundedReactFlowViewport,
  // Component
  ReactFlowScrollbars,
  // Pure helpers
  getReactFlowScrollMetrics,
  getReactFlowTranslateExtent,
  getReactFlowFocusViewport,
  getReactFlowViewportFromScrollRatios,
  // Constants
  DEFAULT_SCROLL_AREA_MARGIN_PX,
  DEFAULT_SCROLLBAR_TRACK_SIZE_PX,
  DEFAULT_SCROLLBAR_MIN_THUMB_SIZE_PX,
} from 'react-flow-scrollbar';
import type {
  BoundedReactFlowViewportController,
  UseBoundedReactFlowViewportOptions,
  ReactFlowScrollbarsProps,
  ReactFlowScrollMetrics,
  ReactFlowScrollAxisMetrics,
  ReactFlowScrollContentMetrics,
  GetNodesBounds,
} from 'react-flow-scrollbar';

import 'react-flow-scrollbar/styles.css';
```

---

## Contents

- [`useBoundedReactFlowViewport`](#useboundedreactflowviewport) — the controller hook
- [`<ReactFlowScrollbars>`](#reactflowscrollbars) — the overlay component
- [Pure helpers](#pure-helpers)
  - [`getReactFlowScrollMetrics`](#getreactflowscrollmetrics)
  - [`getReactFlowTranslateExtent`](#getreactflowtranslateextent)
  - [`getReactFlowFocusViewport`](#getreactflowfocusviewport)
  - [`getReactFlowViewportFromScrollRatios`](#getreactflowviewportfromscrollratios)
- [Types](#types)
- [Constants](#constants)
- [Theming reference](#theming-reference) — CSS variables and stable selectors
- [Development warnings](#development-warnings)

---

## `useBoundedReactFlowViewport`

```ts
function useBoundedReactFlowViewport(
  options?: UseBoundedReactFlowViewportOptions,
): BoundedReactFlowViewportController
```

The controller hook and **single source of truth**. It owns one node-bounds
calculation and derives the `translateExtent` pan-clamp, the scrollbar metrics, and
the programmatic-scroll methods from it. (See [why a single controller](./explanation.md#why-a-single-controller).)

> **Must run under a `<ReactFlowProvider>`.** It calls `useReactFlow`, `useStore`,
> `useViewport`, `useNodes`, and `useNodesInitialized` internally, so the component
> that calls it has to be inside the provider (or inside `<ReactFlow>`, which supplies
> the same context).

### Options — `UseBoundedReactFlowViewportOptions`

| Option         | Type       | Default              | Description |
| -------------- | ---------- | -------------------- | ----------- |
| `nodes`        | `Node[]`   | the store nodes (`useNodes()`) | Nodes whose bounds define the scroll area. Pass your own controlled array for the most robust first-render bounds; omit it to track the store. Hidden nodes (`node.hidden`) are ignored either way. |
| `margin`       | `number`   | `30`                 | Content-edge inset in **flow coordinates** — breathing room around the outermost nodes. |
| `trackSize`    | `number`   | `8`                  | Scrollbar track thickness in **px**. Echoed back on the controller so the component renders the track at exactly this size and the geometry matches. |
| `minThumbSize` | `number`   | `32`                 | Minimum thumb length in **px**, so the thumb stays grabbable on huge canvases. |

### Returns — `BoundedReactFlowViewportController`

| Member            | Type                                                     | Description |
| ----------------- | -------------------------------------------------------- | ----------- |
| `translateExtent` | `CoordinateExtent \| undefined`                          | Pass to `<ReactFlow translateExtent={...}>`. `undefined` when there's nothing to bound (no nodes, or unmeasured bounds). Referentially **stable** while its four numbers are unchanged — see [referential stability](./explanation.md#referential-stability-usestableextent). |
| `metrics`         | [`ReactFlowScrollMetrics`](#reactflowscrollmetrics)      | Current scrollbar geometry + scroll range, recomputed reactively on every viewport/zoom/size change. |
| `trackSize`       | `number`                                                 | The configured bar thickness (px), echoed back for the component. |
| `scrollTo`        | `(ratios: { xRatio?: number; yRatio?: number }) => void` | Scroll to **absolute** ratios in `0..1` (clamped). An omitted axis keeps its current position. No-op while there's nothing to scroll. |
| `scrollBy`        | `(delta: { x?: number; y?: number }) => void`            | Scroll by a **flow-coordinate** delta on either axis. Internally converted to a ratio delta against the scroll range. No-op while there's nothing to scroll. |

> **rAF timing.** Viewport writes from `scrollTo` / `scrollBy` (and from dragging a
> thumb) are coalesced into a single `requestAnimationFrame`, so the new transform
> lands a frame or two later — handy to know when asserting on it in tests (use
> `expect.poll`). See [rAF coalescing](./explanation.md#raf-coalescing).

---

## `<ReactFlowScrollbars>`

```ts
function ReactFlowScrollbars(props: ReactFlowScrollbarsProps): ReactElement | null
```

The viewport-synced scrollbar overlay — an idiomatic child of `<ReactFlow>`, like
`<MiniMap/>` or `<Controls/>`. It is a thin renderer: it reads geometry from the
controller's `metrics`, draws draggable / click-to-jump bars, and writes scroll
positions back through `controller.scrollTo`. It renders **`null`** until there is
something to scroll.

### Props — `ReactFlowScrollbarsProps`

| Prop          | Type                                       | Default  | Description |
| ------------- | ------------------------------------------ | -------- | ----------- |
| `controller`  | `BoundedReactFlowViewportController`       | —        | **Required.** The controller returned by [`useBoundedReactFlowViewport`](#useboundedreactflowviewport). |
| `orientation` | `'both' \| 'horizontal' \| 'vertical'`     | `'both'` | Which bars to render. |
| `className`   | `string`                                   | —        | Extra class appended to the overlay root (e.g. for theming). |
| `style`       | `CSSProperties`                            | —        | Inline style merged onto the overlay root. CSS variables are valid here — see [Theming reference](#theming-reference). |

### Render behavior

`<ReactFlowScrollbars>` returns `null` when:

- `metrics.content` is `undefined` (no measured, overflowing content yet), **or**
- neither bar is visible for the chosen `orientation` (e.g. `orientation="horizontal"`
  but only the vertical axis overflows).

Each axis renders only when that axis actually overflows (`metrics.horizontal.isVisible`
/ `metrics.vertical.isVisible`).

### Interaction

- **Drag a thumb** — pointer is tracked on `window` until `pointerup` / `pointercancel`
  (or unmount). The listener set is bundled under one `AbortController`, so a cancelled
  or interrupted gesture tears down cleanly with no ghost listeners.
- **Click the track gutter** — the canvas jumps so the thumb centers under the pointer.

The track and thumb carry React Flow's `nopan nodrag nowheel` classes, so grabbing a
bar never pans or zooms the canvas underneath.

> **Dev warning.** If you pass a `controller` but forget
> `translateExtent={controller.translateExtent}` on `<ReactFlow>`, the component logs a
> one-time console warning in development. See [Development warnings](#development-warnings).

---

## Pure helpers

The math behind the controller is exported framework-free, so you can compute metrics,
the pan-clamp, or a focus viewport without rendering anything — useful for tests, custom
overlays, or driving React Flow from your own UI.

> **Subflow caveat.** Each helper takes an optional `getBounds` injection seam. The
> **default** reads a plain node's parent-relative `position`, which is **wrong for nodes
> nested inside a group/subflow**. To be subflow-correct, pass
> `getBounds={useReactFlow().getNodesBounds}` (it resolves absolute positions through
> React Flow's internal node lookup). The controller does this for you; standalone
> callers must do it themselves. See [subflow correctness](./explanation.md#subflow-correctness).

### `getReactFlowScrollMetrics`

```ts
function getReactFlowScrollMetrics(params: {
  nodes: Node[]
  containerWidth: number
  containerHeight: number
  reactFlowViewport: Viewport       // { x, y, zoom }
  scrollbarTrackSize: number
  minThumbSize: number
  margin?: number                   // default DEFAULT_SCROLL_AREA_MARGIN_PX (30)
  getBounds?: GetNodesBounds        // default: bare getNodesBounds (NOT subflow-safe)
}): ReactFlowScrollMetrics
```

Computes per-axis thumb position/size plus the flow-coordinate scroll range from the
visible nodes and the current viewport. This is the bidirectional bridge between the
bars and the viewport; the controller calls it on every viewport/zoom/size change.

Returns hidden axis metrics and `content: undefined` when there's nothing to scroll —
no nodes, an unmeasured container (width/height `<= 0`), or degenerate bounds.

```ts
const metrics = getReactFlowScrollMetrics({
  nodes: visibleNodes,
  containerWidth: 800,
  containerHeight: 600,
  reactFlowViewport: { x: -100, y: -50, zoom: 1 },
  scrollbarTrackSize: 8,
  minThumbSize: 32,
})
// → { content: { contentMinX, contentMinY, scrollRangeX, scrollRangeY },
//     horizontal: { isVisible, thumbOffsetPx, thumbSizePx, trackSizePx },
//     vertical:   { ... } }
```

### `getReactFlowTranslateExtent`

```ts
function getReactFlowTranslateExtent(params: {
  nodes: Node[]
  containerWidth: number
  containerHeight: number
  zoom?: number                     // default 1 — divides container px to visible-world size
  margin?: number                   // default 30
  getBounds?: GetNodesBounds
}): CoordinateExtent | undefined
```

Computes the `translateExtent` that bounds panning to the node content, **in world
coordinates at the given zoom**. On an axis where the content is smaller than the
visible world, the extent is padded to the visible world (`containerSize / zoom`) so
d3-zoom edge-clamps (top-left) instead of centering — the load-bearing detail that
keeps the bars and the pan honest. Returns `[[minX, minY], [maxX, maxY]]`, or
`undefined` when there are no nodes or the bounds are invalid.

```ts
const extent = getReactFlowTranslateExtent({
  nodes,
  containerWidth: 1280,
  containerHeight: 576,
  zoom: 1,
})
// → [[-30, -30], [1250, 546]]   // content padded to the viewport so panning never snaps
```

Full derivation and the zoom math: [How bounded panning works](./explanation.md#how-bounded-panning-works).

### `getReactFlowFocusViewport`

```ts
function getReactFlowFocusViewport(params: {
  nodes: Node[]
  targetNode: Node
  containerWidth: number
  containerHeight: number
  zoom: number
  align?: 'center' | 'topLeft'      // default 'center'
  margin?: number                   // default 30
  getBounds?: GetNodesBounds
}): Viewport | undefined
```

Computes a viewport that focuses `targetNode`, **clamped to the scroll range** so the
first pan after focusing doesn't snap. `align` picks the placement basis:

- `'center'` (default) — node center to screen center (prefers `measured` dimensions,
  like `getNodesBounds`).
- `'topLeft'` — node top-left to screen top-left + `margin`.

On an axis where the content is smaller than the viewport, both modes converge to the
top-left edge — matching the d3 pan-clamp and the scrollbars. Returns `undefined` when
there are no nodes, the container is unmeasured (width/height `0`), `zoom <= 0`, or the
bounds are invalid — so the caller can fall back to a direct viewport.

This helper is **not** exposed on the controller; use it standalone. You source the
container dimensions and zoom from the store yourself:

```tsx
import { useReactFlow, useStore, useViewport } from '@xyflow/react'
import { getReactFlowFocusViewport } from 'react-flow-scrollbar'

function useFocusNode(nodes: Node[]) {
  const { getNodesBounds, setViewport } = useReactFlow()
  const containerWidth = useStore((state) => state.width)
  const containerHeight = useStore((state) => state.height)
  const { zoom } = useViewport()

  return (targetNode: Node) => {
    const viewport = getReactFlowFocusViewport({
      nodes,
      targetNode,
      containerWidth,
      containerHeight,
      zoom,
      getBounds: getNodesBounds, // ← subflow-correct; omit and nested nodes focus wrong
    })
    if (viewport) setViewport(viewport, { duration: 500 })
  }
}
```

### `getReactFlowViewportFromScrollRatios`

```ts
function getReactFlowViewportFromScrollRatios(params: {
  content: ReactFlowScrollContentMetrics   // the `content` block from getReactFlowScrollMetrics
  reactFlowViewport: Viewport              // current viewport (zoom is preserved)
  horizontalRatio: number                  // 0..1 (clamped)
  verticalRatio: number                    // 0..1 (clamped)
}): Viewport
```

The inverse of the metrics math: converts scrollbar ratios back into a React Flow
viewport, preserving zoom. This is the single viewport writer behind thumb drags and
track clicks. Out-of-range ratios are clamped to the content edges.

```ts
const next = getReactFlowViewportFromScrollRatios({
  content: metrics.content!,
  reactFlowViewport: { x: -70, y: -170, zoom: 1 },
  horizontalRatio: 1, // far right
  verticalRatio: 0,   // top
})
// → { x: -(contentMinX + scrollRangeX), y: -contentMinY, zoom: 1 }
```

---

## Types

### `UseBoundedReactFlowViewportOptions`

```ts
type UseBoundedReactFlowViewportOptions = {
  nodes?: Node[]
  margin?: number
  trackSize?: number
  minThumbSize?: number
}
```

### `BoundedReactFlowViewportController`

```ts
type BoundedReactFlowViewportController = {
  translateExtent: CoordinateExtent | undefined
  metrics: ReactFlowScrollMetrics
  trackSize: number
  scrollTo: (ratios: { xRatio?: number; yRatio?: number }) => void
  scrollBy: (delta: { x?: number; y?: number }) => void
}
```

### `ReactFlowScrollbarsProps`

```ts
type ReactFlowScrollbarsProps = {
  controller: BoundedReactFlowViewportController
  orientation?: 'both' | 'horizontal' | 'vertical'
  className?: string
  style?: CSSProperties
}
```

### `ReactFlowScrollMetrics`

```ts
type ReactFlowScrollMetrics = {
  content: ReactFlowScrollContentMetrics | undefined
  horizontal: ReactFlowScrollAxisMetrics
  vertical: ReactFlowScrollAxisMetrics
}
```

`content` is `undefined` whenever there is nothing to scroll — it is the signal the
component uses to render `null`.

### `ReactFlowScrollAxisMetrics`

Per-axis scrollbar geometry, in **px**, for one bar.

```ts
type ReactFlowScrollAxisMetrics = {
  isVisible: boolean      // this axis overflows and the bar should render
  thumbOffsetPx: number   // thumb offset along the track
  thumbSizePx: number     // thumb length along the track
  trackSizePx: number     // track length = the viewport dimension minus the opposite bar's thickness
}
```

### `ReactFlowScrollContentMetrics`

Scroll geometry in React Flow **flow coordinates**, shared by both axes.

```ts
type ReactFlowScrollContentMetrics = {
  contentMinX: number     // flow X of the content's left edge (margin included)
  contentMinY: number     // flow Y of the content's top edge (margin included)
  scrollRangeX: number    // horizontal scrollable distance, in flow coordinates
  scrollRangeY: number    // vertical scrollable distance, in flow coordinates
}
```

### `GetNodesBounds`

```ts
type GetNodesBounds = (nodes: Node[]) => Rect
```

The bounds-resolver injection seam. It exists so the controller can pass
`useReactFlow().getNodesBounds` — which injects the store `nodeLookup` and therefore
resolves nested/subflow nodes to their **absolute** positions. The bare `getNodesBounds`
import (the default in every helper) reads a plain node's parent-relative `position` and
is wrong for subflows; it is only the default so the standalone helpers and their tests
stay dependency-free. See [subflow correctness](./explanation.md#subflow-correctness).

---

## Constants

Exported so you can reference the same values the library uses instead of hardcoding
them.

| Constant                              | Value | Meaning |
| ------------------------------------- | ----- | ------- |
| `DEFAULT_SCROLL_AREA_MARGIN_PX`       | `30`  | Default `margin` — inset (in flow coords) between the outermost nodes and the scroll-area edge. |
| `DEFAULT_SCROLLBAR_TRACK_SIZE_PX`     | `8`   | Default `trackSize` — thickness (px) of both tracks. |
| `DEFAULT_SCROLLBAR_MIN_THUMB_SIZE_PX` | `32`  | Default `minThumbSize` — minimum thumb length (px) so a tiny proportional thumb stays grabbable. |

---

## Theming reference

The **static** look — colors, radius, track thickness — is plain CSS variables on the
`.react-flow-scrollbars` root. **Per-frame geometry** (track length, thumb size/offset)
is applied inline by the component and is intentionally **not** themeable. Override the
variables with your own CSS rule, the `className` / `style` props, or per-axis
`[data-axis]` selectors. Recipes are in the [How-to guide](./how-to.md#theming).

### CSS variables

| Variable                              | Default                     | Controls                |
| ------------------------------------- | --------------------------- | ----------------------- |
| `--rf-scrollbar-track-size`           | `8px`                       | Track thickness         |
| `--rf-scrollbar-hit-size`             | `--rf-scrollbar-track-size` | Thumb grab area (touch) |
| `--rf-scrollbar-track-color`          | `rgba(0,0,0,0.04)`          | Track background        |
| `--rf-scrollbar-thumb-color`          | `rgba(0,0,0,0.35)`          | Thumb fill              |
| `--rf-scrollbar-thumb-color-hover`    | `rgba(0,0,0,0.5)`           | Thumb fill on hover     |
| `--rf-scrollbar-radius`               | `6px`                       | Thumb corner radius     |

> `--rf-scrollbar-track-size` is also written inline from the controller's `trackSize`,
> so set the bar thickness via the `trackSize` **option** (which keeps the hit-geometry
> in sync) rather than overriding this variable alone.

**Dark mode** is automatic: a `.dark` ancestor (the Tailwind / shadcn / next-themes class
convention) switches the bars to white-translucent — no configuration needed. **Touch:** on
coarse pointers `--rf-scrollbar-hit-size` widens to `max(track-size, 24px)` so a thin thumb stays
grabbable while the visible bar stays thin. The track's own click-to-jump target stays at the
visible thickness on purpose — widening it would block canvas panning along the whole edge.

### Stable selectors

For E2E tests or advanced styling, the component sets stable data-attributes you can
target without depending on class names:

| Selector                                            | Element                       |
| --------------------------------------------------- | ----------------------------- |
| `[data-rf-scrollbars]`                              | Overlay root                  |
| `[data-rf-scrollbar-track][data-axis="x" \| "y"]`   | A track (horizontal/vertical) |
| `[data-rf-scrollbar-thumb][data-axis="x" \| "y"]`   | A thumb (horizontal/vertical) |

The class names (`.react-flow-scrollbars`, `.react-flow-scrollbars__track`,
`.react-flow-scrollbars__thumb`) are also stable, but the data-attributes are the
recommended hook for tests.

---

## Development warnings

Both warnings fire **once**, only when `process.env.NODE_ENV !== 'production'`, and are
silent in production builds. They exist to catch the two wiring mistakes that otherwise
fail silently.

### "Visible nodes have no measured size yet…"

```
[react-flow-scrollbar] Visible nodes have no measured size yet, so the scrollbars stay
hidden. If they never appear, ensure your nodes are rendered by React Flow or have
explicit width/height.
```

- **Logged by:** `useBoundedReactFlowViewport`.
- **When:** the container is measured but the visible nodes still have zero-size bounds.
- **Cause / fix:** React Flow measures unsized nodes asynchronously; the bars wait for
  that. If they never appear, your nodes aren't being rendered/measured by React Flow —
  give them explicit `width`/`height`, or make sure they're real React Flow nodes. See
  [async measurement](./explanation.md#async-node-measurement).

### "A controller was passed but `<ReactFlow>` has no translateExtent wired."

```
[react-flow-scrollbar] A controller was passed but <ReactFlow> has no translateExtent
wired. Add translateExtent={controller.translateExtent} or panning will snap back to
center.
```

- **Logged by:** `<ReactFlowScrollbars>` (one frame after mount).
- **When:** you passed a `controller` whose `translateExtent` is defined, but the live
  React Flow store still has an infinite extent — i.e. you forgot to wire it.
- **Cause / fix:** add `translateExtent={controller.translateExtent}` to `<ReactFlow>`.
  Without it the scrollbars still render, but panning is unbounded and snaps the canvas
  back to center. See [why the extent is load-bearing](./explanation.md#how-bounded-panning-works).
