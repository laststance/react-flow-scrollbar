# Explanation

Why `react-flow-scrollbar` is built the way it is. None of this is required reading to
use the library — wire up the [Tutorial](./tutorial.md) and you're done. But the
decisions below are the ones that took thought, and they're the parts most hand-rolled
React Flow scrollbars get wrong. If you're extending the library, debugging an edge
case, or just curious, this is the design rationale.

- [Why a single controller](#why-a-single-controller)
- [How bounded panning works](#how-bounded-panning-works)
- [Referential stability (`useStableExtent`)](#referential-stability-usestableextent)
- [Async node measurement](#async-node-measurement)
- [Subflow correctness](#subflow-correctness)
- [rAF coalescing](#raf-coalescing)
- [One pass per change](#one-pass-per-change)
- [Why the overlay isn't on the transform](#why-the-overlay-isnt-on-the-transform)

---

## Why a single controller

React Flow ships a MiniMap, Controls, Background, and Panel — but no scrollbar. The
naive way to add one is to compute the bar geometry in the scrollbar component and the
pan-clamp somewhere near `<ReactFlow>`. That's two computations of the same thing, and
they drift.

Here's the failure: the scrollbars, the pan-clamp (`translateExtent`), and "focus this
node" **all depend on the same fact** — where the content is, in flow coordinates. If
the bar reads one set of bounds and the clamp reads another, they disagree by a few
pixels. The bar says you're at 40% but the clamp won't let you pan past 35%, so the
thumb hits an invisible wall, or panning snaps to a position the bar never showed. The
bug isn't in any one calculation; it's in having two of them.

So the library has exactly one: `useBoundedReactFlowViewport` owns the node-bounds read
and derives everything from it — the `metrics` the bars draw, the `translateExtent` the
canvas clamps to, and the `scrollTo`/`scrollBy` writers. One calculation, one truth, no
drift. `<ReactFlowScrollbars>` is deliberately a **thin renderer**: it holds no bounds
state of its own, just reads `controller.metrics` and writes back through
`controller.scrollTo`. That's why the API hands you a controller object and asks you to
pass it to both `<ReactFlow translateExtent>` and `<ReactFlowScrollbars controller>` —
it's making the shared source of truth explicit instead of hoping two components agree.

---

## How bounded panning works

`translateExtent` tells React Flow how far the canvas may pan, as a flow-coordinate
rectangle `[[minX, minY], [maxX, maxY]]`. Getting it right is the single most important
— and most error-prone — piece of the library.

**The problem it solves.** React Flow's panning is backed by d3-zoom, whose `constrain`
behavior, when the content is *smaller* than the viewport, **centers** the content. But
the scrollbars (and the focus helper) top-left-align. Center vs. top-left is the snap:
you start to pan, d3 yanks the canvas back to centered, and the bar — which expected
top-left — lies about where you are.

**The fix.** On each axis the extent is padded so the content plus one viewport's worth
of travel is always reachable:

```
maxX = max(contentMaxX, minX + containerWidth / zoom)
maxY = max(contentMaxY, minY + containerHeight / zoom)
```

Two things are doing work here, and it's worth being precise about which:

- **The `+ containerWidth/Height` pad is the anti-centering mechanism, not a bug.** When
  content is smaller than the viewport, this stretches the extent to *at least* the
  viewport size. That's exactly the condition under which d3-zoom edge-clamps (top-left)
  instead of centering. Drop the pad and the snap comes back.
- **The `/ zoom` is the correction.** `containerWidth` is in screen pixels; the extent
  is in world coordinates, and one pixel of pane is a different number of world units at
  each zoom level. Dividing by zoom converts the pad into world units so the extent is
  right at every zoom — pan doesn't drift or snap when you're zoomed in or out.

When the content is *larger* than the visible world, `Math.max` keeps the content edge,
so the extent stays exactly at content + margin and the full scroll range is preserved.
At an unmeasured container (size `0`), `Math.max` also falls back to the content edge,
so you never get a degenerate extent during the first render.

A worked example at zoom 2, content `500×150`, container `1280×576`:

```
visible world = 1280/2 × 576/2 = 640 × 288
minX = -30,  maxX = max(530, -30 + 640) = 610
minY = -30,  maxY = max(180, -30 + 288) = 258
extent = [[-30, -30], [610, 258]]    // spans exactly the visible world (640 × 288)
```

The buggy `+ containerWidth` (without `/zoom`) form would yield `1250` here — far too
wide — and panning would drift. This is the case the test suite pins down explicitly.

You never have to think about any of this in app code: wire `controller.translateExtent`
onto `<ReactFlow>` and it's handled. It's documented because it's the part that's easy to
get subtly wrong.

---

## Referential stability (`useStableExtent`)

There's a second, sneakier way the extent can break: identity churn.

When the content is ≥ the viewport, the extent's four numbers **don't move as you zoom**
(the `Math.max` keeps the content edge regardless of zoom). But the controller recomputes
the extent on every zoom frame, minting a brand-new `[[…],[…]]` array each time. To React
Flow, a new array reference is a new `translateExtent` prop — so it re-runs its clamp on
every single zoom frame, even though the bounds are identical. The result is a viewport
that fights itself mid-zoom.

`useStableExtent` is a value-equality memo that fixes this: it compares the four numbers
and hands back the **previous array reference** when they're unchanged, only minting a
new array when a bound actually moves. So the `<ReactFlow>` prop identity stays static
across a zoom (no re-clamp), but a genuinely resized graph still produces a fresh
reference and re-clamps correctly. It's internal — not exported — but it's load-bearing
enough to have its own unit tests.

---

## Async node measurement

React Flow nodes don't have to declare a `width`/`height`. Most don't — they're sized by
their content, and React Flow **measures them asynchronously** after they mount, writing
the measured dimensions into its internal store (the `nodeLookup`), **not** necessarily
into a new `nodes` array.

That's a trap for a bounds calculation. If the controller memoized bounds off the `nodes`
prop alone, it would read the nodes *before* measurement — get zero-size, degenerate
bounds — and cache them. The content would never look like it overflows, and the bars
would never appear.

The signal that breaks the trap is `useNodesInitialized()`, a React Flow hook that flips
`false → true` once measurement lands. The controller includes it in the bounds memo's
dependencies, so the moment React Flow finishes measuring, the memo re-reads the
now-populated `nodeLookup` and the bars appear. This is exactly the path the first E2E
test guards: nodes ship with no size, and the test asserts both bars show up *after*
async measurement — the regression that would otherwise slip through.

(This is also why the [dev warning](./reference.md#visible-nodes-have-no-measured-size-yet)
about unmeasured nodes exists: if the container is measured but the nodes still have no
size, the bars genuinely can't show, and the warning tells you why instead of leaving you
staring at an empty pane.)

---

## Subflow correctness

A node inside a group (a subflow) has a `position` that's **relative to its parent**, not
to the canvas. The plain `getNodesBounds(nodes)` import from `@xyflow/react` reads that
relative `position`, so for nested nodes it computes bounds in the wrong place — the
scroll area, the clamp, and focus would all be off by the parent's offset.

React Flow's *store-aware* resolver, `useReactFlow().getNodesBounds`, injects the store's
`nodeLookup` and resolves each node's **absolute** position. The controller uses that one,
so subflow nodes are measured where they actually render.

To keep this from infecting the pure helpers (which must stay framework-free and
dependency-free so they're trivially testable), the absolute-resolver is passed in through
the [`GetNodesBounds`](./reference.md#getnodesbounds) injection seam rather than imported.
Every helper accepts a `getBounds` parameter; its default is the bare, relative-position
`getNodesBounds`. **The consequence for standalone callers:** if you use the helpers
without the hook and your graph has subflows, you must pass
`getBounds={useReactFlow().getNodesBounds}` yourself — otherwise nested nodes resolve to
the wrong place. (The focus helper additionally resolves the target node's own absolute
position via its internal `positionAbsolute`, for the same reason.)

---

## rAF coalescing

Dragging a thumb fires `pointermove` many times per frame, and each one wants to move the
viewport. Calling `setViewport` on every event would queue redundant writes and thrash.

Instead, the controller keeps the latest target viewport in a ref and schedules a single
`requestAnimationFrame` to flush it. Ten pointer moves in one frame collapse into one
`setViewport`. The pending frame is cancelled on unmount, so the library never writes into
an unmounted flow.

The practical consequence you'll notice: **the new transform lands a frame or two after
you call `scrollTo`/`scrollBy` or release a drag.** It's asynchronous. In tests, assert
with `expect.poll` (or wait two animation frames) rather than reading the viewport
synchronously right after — the E2E suite does exactly this.

---

## One pass per change

`getNodesBounds` is O(n) in the node count. Doing it per frame — on every pan and zoom —
would be wasteful on a large graph. So the controller runs the O(n) bounds read **once**
per node change (or when async measurement lands), memoizes the resulting rectangle, and
feeds that cached rect into the per-frame metrics and extent math through a `reuseBounds`
resolver. The per-frame work is then O(1): just arithmetic on the cached bounds and the
current viewport. Combined with [rAF coalescing](#raf-coalescing), a pan or zoom does the
minimum: one O(1) recompute, one coalesced write.

---

## Why the overlay isn't on the transform

The scrollbars are an absolutely-positioned overlay (`position: absolute; inset: 0`) that
fills the React Flow pane and is **pinned to the pane**, not to the panning transform. The
overlay itself is `pointer-events: none` so it never blocks the canvas; only the tracks
and thumbs opt back in to pointer events.

This is deliberate. A native scrollbar stays put while the content scrolls underneath it —
it doesn't ride along with what it's scrolling. If the bars lived inside
`.react-flow__viewport` (the element React Flow translates), they'd slide off-screen the
moment you panned. Living on the pane instead, the tracks stay glued to the bottom and
right edges while the thumbs move to reflect scroll position — which is what the E2E tests
assert: after a pan or a zoom round-trip, the track's screen position is unchanged but the
thumb offset moved.
