import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
} from '@xyflow/react';
import type { Edge, Node } from '@xyflow/react';
import { useState } from 'react';
import {
  ReactFlowScrollbars,
  useBoundedReactFlowViewport,
} from 'react-flow-scrollbar';
import '@xyflow/react/dist/style.css';
import 'react-flow-scrollbar/styles.css';

// A wide AND tall graph so content overflows the 800×600 pane on both axes (both bars visible at
// zoom 1). Nodes carry NO explicit width/height, so React Flow measures them asynchronously after
// mount — the exact path that regressed: the bars must still appear once measurement lands.
const INITIAL_NODES: Node[] = [
  { id: 'a', position: { x: 0, y: 0 }, data: { label: 'A · top-left' } },
  { id: 'b', position: { x: 900, y: 140 }, data: { label: 'B' } },
  { id: 'c', position: { x: 240, y: 720 }, data: { label: 'C' } },
  { id: 'd', position: { x: 1180, y: 860 }, data: { label: 'D · bottom-right' } },
  { id: 'e', position: { x: 1680, y: 420 }, data: { label: 'E · far right' } },
];

const INITIAL_EDGES: Edge[] = [
  { id: 'a-b', source: 'a', target: 'b' },
  { id: 'a-c', source: 'a', target: 'c' },
  { id: 'b-d', source: 'b', target: 'd' },
  { id: 'b-e', source: 'b', target: 'e' },
];

/** Inner flow — runs inside `<ReactFlowProvider>` because the controller reads the React Flow store. */
function Flow() {
  const [nodes, , onNodesChange] = useNodesState(INITIAL_NODES);

  // The single source of truth: feeds translateExtent + the scrollbar metrics from one node-bounds read.
  const controller = useBoundedReactFlowViewport({ nodes });

  return (
    <ReactFlow
      nodes={nodes}
      edges={INITIAL_EDGES}
      onNodesChange={onNodesChange}
      translateExtent={controller.translateExtent}
      defaultViewport={{ x: 30, y: 30, zoom: 1 }}
      minZoom={0.2}
      maxZoom={2}
    >
      <Background />
      <Controls />
      <ReactFlowScrollbars controller={controller} />
    </ReactFlow>
  );
}

/** Playground root: a fixed-size pane plus a mount toggle (drives the unmount-during-drag e2e check). */
export default function App() {
  const [isFlowMounted, setIsFlowMounted] = useState(true);

  return (
    <div style={{ padding: 12 }}>
      <div style={{ marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
        <h1 style={{ fontSize: 16, margin: 0 }}>react-flow-scrollbar · playground</h1>
        <button
          type="button"
          data-testid="toggle-mount"
          onClick={() => setIsFlowMounted((mounted) => !mounted)}
        >
          {isFlowMounted ? 'Unmount flow' : 'Mount flow'}
        </button>
      </div>

      {isFlowMounted && (
        <div
          data-testid="flow-container"
          style={{ width: 800, height: 600, border: '1px solid #d4d4d8' }}
        >
          <ReactFlowProvider>
            <Flow />
          </ReactFlowProvider>
        </div>
      )}
    </div>
  );
}
