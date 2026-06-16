# Tutorial: add working scrollbars to a React Flow canvas

By the end of this tutorial you'll have a React Flow canvas with two draggable,
click-to-jump scrollbars that stay in sync with the viewport, bounded panning that never
snaps, and a button that scrolls to the far edge of the graph. We'll build it up one step
at a time, and you'll see something change on screen after each one.

The finished code is the same fixture the library's end-to-end tests drive, so the path
here is guaranteed to work — it's literally what [`examples/playground`](../examples/playground)
runs. If you'd rather read the API first, that's the [Reference](./reference.md); if you
want the design rationale, that's the [Explanation](./explanation.md). This page is for
learning by doing.

## Before you start

You need a React app with React Flow already installed. Then add the package:

```bash
npm install react-flow-scrollbar
# or: pnpm add react-flow-scrollbar / yarn add react-flow-scrollbar
```

`@xyflow/react` (v12+) and `react` (18 or 19) are **peer dependencies** — you already
have them in a React Flow app, so they aren't bundled.

---

## Step 1 — A plain React Flow canvas

Start with a canvas and nothing else. Two things to notice up front, because the whole
library depends on them:

- The flow is wrapped in **`<ReactFlowProvider>`** — our controller will read React Flow's
  store, so it must live under the provider.
- The container has a **fixed size** (`800 × 600`). React Flow needs a measured pane, and
  we want the graph to overflow it so there's something to scroll.

The nodes are spread out **wide and tall** and deliberately carry **no `width`/`height`** —
React Flow measures them after they mount (more on that in Step 5).

```tsx
import { ReactFlow, ReactFlowProvider, useNodesState } from '@xyflow/react'
import type { Edge, Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

const INITIAL_NODES: Node[] = [
  { id: 'a', position: { x: 0, y: 0 }, data: { label: 'A · top-left' } },
  { id: 'b', position: { x: 900, y: 140 }, data: { label: 'B' } },
  { id: 'c', position: { x: 240, y: 720 }, data: { label: 'C' } },
  { id: 'd', position: { x: 1180, y: 860 }, data: { label: 'D · bottom-right' } },
  { id: 'e', position: { x: 1680, y: 420 }, data: { label: 'E · far right' } },
]

const INITIAL_EDGES: Edge[] = [
  { id: 'a-b', source: 'a', target: 'b' },
  { id: 'a-c', source: 'a', target: 'c' },
  { id: 'b-d', source: 'b', target: 'd' },
]

function Flow() {
  const [nodes, , onNodesChange] = useNodesState(INITIAL_NODES)

  return (
    <ReactFlow nodes={nodes} edges={INITIAL_EDGES} onNodesChange={onNodesChange} />
  )
}

export default function App() {
  return (
    <div style={{ width: 800, height: 600, border: '1px solid #d4d4d8' }}>
      <ReactFlowProvider>
        <Flow />
      </ReactFlowProvider>
    </div>
  )
}
```

**What you should see:** a React Flow canvas with five nodes — but no scrollbars yet, and
panning is unbounded (you can drag the canvas off into empty space). We'll fix both.

---

## Step 2 — Add the controller

The controller is the brain. One hook call reads the node bounds and derives everything —
the scrollbar geometry, the pan-clamp, and the scroll methods. Add it inside `Flow`:

```tsx
import { useBoundedReactFlowViewport } from 'react-flow-scrollbar'

function Flow() {
  const [nodes, , onNodesChange] = useNodesState(INITIAL_NODES)

  // The single source of truth: scrollbars, pan-clamp, and scrolling all come from here.
  const controller = useBoundedReactFlowViewport({ nodes })

  return (
    <ReactFlow nodes={nodes} edges={INITIAL_EDGES} onNodesChange={onNodesChange} />
  )
}
```

**What you should see:** no visible change yet — `controller` isn't wired to anything.
That's the next two steps.

---

## Step 3 — Wire the pan-clamp (the one required step)

Pass `controller.translateExtent` to `<ReactFlow>`. This is the step the library can't do
for you, and the one most people forget:

```tsx
<ReactFlow
  nodes={nodes}
  edges={INITIAL_EDGES}
  onNodesChange={onNodesChange}
  // ⚠️ Without this, panning snaps back to center and the bars would lie about position.
  translateExtent={controller.translateExtent}
/>
```

**What you should see:** panning is now **bounded** — drag the canvas and it stops at the
edge of the content (plus a margin) instead of drifting into the void. If you skip this
step, you'll get a console warning in development telling you exactly what's missing.

> Curious why this matters so much? It's d3-zoom's centering behavior vs. the bars'
> top-left alignment — the [Explanation](./explanation.md#how-bounded-panning-works) has
> the full story.

---

## Step 4 — Drop in the scrollbars

Add `<ReactFlowScrollbars>` as a **child** of `<ReactFlow>` (like `<MiniMap/>` or
`<Controls/>`), and import the stylesheet **once** somewhere in your app:

```tsx
import {
  ReactFlowScrollbars,
  useBoundedReactFlowViewport,
} from 'react-flow-scrollbar'
import '@xyflow/react/dist/style.css'
import 'react-flow-scrollbar/styles.css' // ← the default theme

function Flow() {
  const [nodes, , onNodesChange] = useNodesState(INITIAL_NODES)
  const controller = useBoundedReactFlowViewport({ nodes })

  return (
    <ReactFlow
      nodes={nodes}
      edges={INITIAL_EDGES}
      onNodesChange={onNodesChange}
      translateExtent={controller.translateExtent}
    >
      <ReactFlowScrollbars controller={controller} />
    </ReactFlow>
  )
}
```

**What you should see:** after a brief moment, **both scrollbars appear** — one along the
bottom, one down the right. Drag a thumb and the canvas scrolls; click an empty part of a
track and it jumps. Pan the canvas and the thumbs follow.

> The "brief moment" is React Flow measuring the unsized nodes. The bars wait for that
> measurement and then show — see [async measurement](./explanation.md#async-node-measurement).
> If they never show, [troubleshoot here](./how-to.md#the-scrollbars-never-appear).

---

## Step 5 — Add a "scroll to end" button

The controller's `scrollTo` takes absolute ratios from `0` to `1`. Wire a couple of
buttons to jump the canvas to the far edges. We'll lift the controller up so the buttons
can reach it — but keep everything under the provider:

```tsx
function Flow() {
  const [nodes, , onNodesChange] = useNodesState(INITIAL_NODES)
  const controller = useBoundedReactFlowViewport({ nodes })

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button onClick={() => controller.scrollTo({ xRatio: 1 })}>Scroll to right edge</button>
        <button onClick={() => controller.scrollTo({ xRatio: 0, yRatio: 0 })}>Back to start</button>
      </div>
      <div style={{ width: 800, height: 600, border: '1px solid #d4d4d8' }}>
        <ReactFlow
          nodes={nodes}
          edges={INITIAL_EDGES}
          onNodesChange={onNodesChange}
          translateExtent={controller.translateExtent}
        >
          <ReactFlowScrollbars controller={controller} />
        </ReactFlow>
      </div>
    </>
  )
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  )
}
```

**What you should see:** clicking **"Scroll to right edge"** slides the canvas all the way
right (node `E · far right` comes into view) and the horizontal thumb moves to the end;
**"Back to start"** returns to the top-left. The motion lands a frame after the click
because writes are [coalesced into one `requestAnimationFrame`](./explanation.md#raf-coalescing) —
that's expected.

---

## Step 6 — Make it your own (optional)

The default theme is grayscale CSS variables on the `.react-flow-scrollbars` root — and dark
mode is already automatic under a `.dark` ancestor (the Tailwind / shadcn / next-themes
convention). To recolor it yourself, override the variables anywhere in your app:

```css
.react-flow-scrollbars {
  --rf-scrollbar-thumb-color: rgba(255, 255, 255, 0.4);
  --rf-scrollbar-thumb-color-hover: rgba(255, 255, 255, 0.6);
  --rf-scrollbar-track-color: rgba(255, 255, 255, 0.06);
}
```

**What you should see:** lighter thumbs that brighten on hover. The full list of variables
and per-axis selectors is in the [theming reference](./reference.md#theming-reference); more
recipes (one axis only, extra margin, inline per-instance theming) are in the
[How-to guide](./how-to.md).

---

## You're done

You built a React Flow canvas with synced scrollbars, bounded panning, and programmatic
scrolling — the complete, tested setup. From here:

- **[How-to guides](./how-to.md)** — focus a node, render one axis, theme per instance,
  use the math without the hook, test the bars.
- **[Reference](./reference.md)** — every export, type, default, and CSS variable.
- **[Explanation](./explanation.md)** — why a single controller, how the zoom-aware
  pan-clamp works, and the rest of the design rationale.
- **[`examples/playground`](../examples/playground)** — a runnable version of what you just
  built (`pnpm install && pnpm example:dev`).
