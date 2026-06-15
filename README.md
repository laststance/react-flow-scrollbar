# react-flow-scrollbar

Custom, viewport-synced **scrollbars** and **bounded panning** (`translateExtent`) for
[React Flow / @xyflow/react](https://reactflow.dev) v12.

React Flow ships a MiniMap, Controls, Background, and Panel — but no scrollbar. This
package adds draggable, click-to-jump scrollbars that stay in two-way sync with the
React Flow viewport, plus the `translateExtent` pan-clamp that keeps them honest.

> **Status:** work in progress. API and docs are still being finalized.

## Why a controller?

The scrollbars, the pan-clamp (`translateExtent`), and focus all derive from the **same**
node bounds. If they read from different sources they drift, and panning snaps. So a single
controller hook — `useBoundedReactFlowViewport` — is the source of truth, and you wire its
`translateExtent` onto `<ReactFlow>` yourself:

```tsx
import { ReactFlow } from '@xyflow/react';
import {
  ReactFlowScrollbars,
  useBoundedReactFlowViewport,
} from 'react-flow-scrollbar';
import 'react-flow-scrollbar/styles.css';

function Flow({ nodes, edges }) {
  const controller = useBoundedReactFlowViewport({ nodes });

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      translateExtent={controller.translateExtent}
    >
      <ReactFlowScrollbars controller={controller} />
    </ReactFlow>
  );
}
```

## License

[MIT](./LICENSE) © [Laststance.io](https://github.com/laststance)
