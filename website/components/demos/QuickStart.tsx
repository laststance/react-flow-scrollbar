'use client';

import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
} from '@xyflow/react';
import type { Edge, Node } from '@xyflow/react';
import {
  ReactFlowScrollbars,
  useBoundedReactFlowViewport,
} from 'react-flow-scrollbar';
import '@xyflow/react/dist/style.css';
import 'react-flow-scrollbar/styles.css';

// A graph wide AND tall enough to overflow the pane on both axes, so both scrollbars appear at
// zoom 1. Nodes carry no explicit width/height — React Flow measures them asynchronously after
// mount, and the bars wait for that measurement before showing.
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

/** Inner flow — lives under `<ReactFlowProvider>` because the controller reads the React Flow store. */
function Flow() {
  const [nodes, , onNodesChange] = useNodesState(INITIAL_NODES);

  // Single source of truth: feeds both `translateExtent` (the pan-clamp) and the scrollbar metrics
  // from one node-bounds read, so the bars and the clamp can never disagree.
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

/** Quick Start demo: drop `<ReactFlowScrollbars>` into a provider-wrapped, fixed-size pane. */
export default function QuickStart() {
  return (
    <div style={{ width: '100%', height: 480 }}>
      <ReactFlowProvider>
        <Flow />
      </ReactFlowProvider>
    </div>
  );
}
