# How-to guides

Task-focused recipes. Each one assumes you already have the basic wiring from the
[Tutorial](./tutorial.md) — a controller under a `<ReactFlowProvider>`, its
`translateExtent` on `<ReactFlow>`, and `<ReactFlowScrollbars>` as a child. For the
exact types of everything used here, see the [Reference](./reference.md). For *why*
any of it works, see the [Explanation](./explanation.md).

- [Scroll the canvas from your own buttons](#scroll-the-canvas-from-your-own-buttons)
- [Show only one scrollbar](#show-only-one-scrollbar)
- [Give the content more breathing room](#give-the-content-more-breathing-room)
- [Theming](#theming)
- [Focus (scroll to) a specific node](#focus-scroll-to-a-specific-node)
- [Use the math without the hook](#use-the-math-without-the-hook)
- [Target the bars in E2E tests](#target-the-bars-in-e2e-tests)
- [Troubleshooting](#troubleshooting)

---

## Scroll the canvas from your own buttons

The controller exposes two imperative writers. `scrollTo` takes **absolute** ratios
(`0..1`); `scrollBy` takes a **flow-coordinate** delta. An omitted axis keeps its
current position.

```tsx
const controller = useBoundedReactFlowViewport({ nodes })

<button onClick={() => controller.scrollTo({ xRatio: 0 })}>Scroll to start</button>
<button onClick={() => controller.scrollTo({ xRatio: 1 })}>Scroll to end</button>
<button onClick={() => controller.scrollTo({ yRatio: 0 })}>Scroll to top</button>
<button onClick={() => controller.scrollBy({ y: 200 })}>Nudge down 200</button>
```

Both writes are [rAF-coalesced](./explanation.md#raf-coalescing), so the canvas settles
a frame or two later — not synchronously.

---

## Show only one scrollbar

Render just the axis you need — e.g. a wide timeline that only scrolls horizontally:

```tsx
<ReactFlowScrollbars controller={controller} orientation="horizontal" />
```

`orientation` is `'both'` (default), `'horizontal'`, or `'vertical'`. Note this only
controls *which bars render*; the pan-clamp (`translateExtent`) still bounds both axes.

---

## Give the content more breathing room

`margin` is the inset, in **flow coordinates**, between the outermost nodes and the
scroll-area edge. Bump it for more padding around the graph:

```tsx
const controller = useBoundedReactFlowViewport({ nodes, margin: 120 })
```

The default is `30` (`DEFAULT_SCROLL_AREA_MARGIN_PX`). The same `margin` feeds the
scroll range, the pan-clamp, and the focus helper, so they stay consistent.

---

## Theming

The static look is plain CSS variables on the `.react-flow-scrollbars` root. (Per-frame
geometry is applied inline and is not themeable — see the
[theming reference](./reference.md#theming-reference) for the full variable list.)

**Dark mode is automatic.** When a `.dark` ancestor is present (the Tailwind / shadcn /
next-themes class convention) the bars ship white-translucent with no configuration. Override the
`.dark` rule to customize that palette, or set the variables on `.react-flow-scrollbars` directly to
force a dark look regardless of theme class:

```css
/* Customize the automatic dark palette (or force it without a `.dark` ancestor). */
.dark .react-flow-scrollbars {
  --rf-scrollbar-thumb-color: rgba(255, 255, 255, 0.4);
}
```

**Per instance, inline** — CSS variables are valid `style` values:

```tsx
<ReactFlowScrollbars
  controller={controller}
  style={{ '--rf-scrollbar-thumb-color': '#6366f1' } as React.CSSProperties}
/>
```

**A different look per axis**, via the stable `[data-axis]` selectors:

```css
.react-flow-scrollbars__thumb[data-axis='x'] { --rf-scrollbar-radius: 2px; }
.react-flow-scrollbars__thumb[data-axis='y'] { --rf-scrollbar-radius: 8px; }
```

> To change the **track thickness**, set the `trackSize` option on the hook
> (`useBoundedReactFlowViewport({ trackSize: 16 })`) rather than only the
> `--rf-scrollbar-track-size` variable — the option keeps the hit-geometry in sync with
> the visual size. On touch (coarse pointers) the thumb's grab area widens automatically
> so a thin bar stays tappable.

---

## Focus (scroll to) a specific node

The controller doesn't expose a focus method — focusing is a standalone helper,
`getReactFlowFocusViewport`, so you can choose the alignment and animation. You source
the container size and zoom from the React Flow store yourself.

```tsx
import { useReactFlow, useStore, useViewport } from '@xyflow/react'
import type { Node } from '@xyflow/react'
import { getReactFlowFocusViewport } from 'react-flow-scrollbar'

/** Returns a `focus(node)` that smoothly scrolls a target node into view. */
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
      align: 'center', // or 'topLeft'
      // ⚠️ Inject the store-aware resolver, or nodes inside subflows focus to the wrong spot.
      getBounds: getNodesBounds,
    })
    // `undefined` while the container is still unmeasured — fall back or just skip.
    if (viewport) setViewport(viewport, { duration: 500 })
  }
}
```

`align: 'center'` puts the node in the middle of the pane (clamped to the scroll range so
the first pan after focus doesn't snap); `align: 'topLeft'` pins it to the top-left +
margin. On an axis where the content already fits, both converge to the top-left edge.

---

## Use the math without the hook

Every calculation is exported as a pure function, so you can compute metrics, the extent,
or a focus viewport in a test or a custom UI with no React Flow runtime at all:

```ts
import {
  getReactFlowScrollMetrics,
  getReactFlowTranslateExtent,
} from 'react-flow-scrollbar'

const extent = getReactFlowTranslateExtent({
  nodes,
  containerWidth: 1280,
  containerHeight: 576,
  zoom: 1,
})

const metrics = getReactFlowScrollMetrics({
  nodes,
  containerWidth: 1280,
  containerHeight: 576,
  reactFlowViewport: { x: 0, y: 0, zoom: 1 },
  scrollbarTrackSize: 8,
  minThumbSize: 32,
})
```

> **Subflow caveat.** Standalone, these helpers default to the bare `getNodesBounds`,
> which reads each node's **parent-relative** `position` — wrong for nodes nested inside a
> group. If your graph has subflows, pass the store-aware resolver:
> `getBounds: useReactFlow().getNodesBounds`. (Inside a render that's straightforward; in
> a pure unit test with flat nodes the default is fine.) See
> [subflow correctness](./explanation.md#subflow-correctness).

---

## Target the bars in E2E tests

The component sets stable data-attributes — prefer them over class names:

```ts
const H_TRACK = '[data-rf-scrollbar-track][data-axis="x"]'
const V_TRACK = '[data-rf-scrollbar-track][data-axis="y"]'
const H_THUMB = '[data-rf-scrollbar-thumb][data-axis="x"]'
const V_THUMB = '[data-rf-scrollbar-thumb][data-axis="y"]'

// The bars appear only AFTER React Flow measures unsized nodes — wait for them.
await expect(page.locator(H_THUMB)).toBeVisible()
```

Because viewport writes are [rAF-coalesced](./explanation.md#raf-coalescing), assert the
*result* of a drag or click with `expect.poll`, not a synchronous read:

```ts
await expect
  .poll(() => readThumbOffset(page.locator(H_THUMB), 'x'))
  .toBeGreaterThan(offsetBefore)
```

The thumb's live geometry is inline `style.left` / `style.top` (px); the overlay root is
`[data-rf-scrollbars]`.

---

## Troubleshooting

### The scrollbars never appear

In order, check:

1. **Does the content actually overflow the pane?** The bars only show when the content
   (plus `margin`) is larger than the container. A small graph in a big pane shows
   nothing — by design.
2. **Are the nodes measured?** Unsized nodes are measured asynchronously; the bars wait
   for that. If you see the dev warning *"Visible nodes have no measured size yet"*, your
   nodes aren't being measured — give them explicit `width`/`height` or make sure React
   Flow renders them. See [async measurement](./explanation.md#async-node-measurement).
3. **Is the container measured?** It needs a real size. A `0×0` pane (e.g. a parent with
   no height) yields no bars — give the wrapper a height.
4. **Is everything under `<ReactFlowProvider>`?** The hook reads the store; outside the
   provider it can't.

### Panning snaps back to center

You wired the `controller` to `<ReactFlowScrollbars>` but forgot the extent on
`<ReactFlow>`. Add it:

```tsx
<ReactFlow translateExtent={controller.translateExtent}>
```

In development you'll also see the dev warning *"A controller was passed but `<ReactFlow>`
has no translateExtent wired."* This is the one wiring step the library can't do for you —
[why it's load-bearing](./explanation.md#how-bounded-panning-works).

### The thumb position lags / a test reads a stale viewport

Expected — writes are [rAF-coalesced](./explanation.md#raf-coalescing) and land a frame or
two later. Poll for the result instead of reading synchronously.
