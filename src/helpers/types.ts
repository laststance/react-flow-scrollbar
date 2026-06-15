import type { Node, Rect } from '@xyflow/react';

/** Per-axis scrollbar geometry in px for a single bar (horizontal or vertical). */
export type ReactFlowScrollAxisMetrics = {
  /** Whether this axis overflows and the scrollbar should render. */
  isVisible: boolean;
  /** Thumb offset along the track (px). */
  thumbOffsetPx: number;
  /** Thumb length along the track (px). */
  thumbSizePx: number;
  /** Track length (px): the viewport dimension minus the opposite bar's thickness. */
  trackSizePx: number;
};

/** Scroll geometry expressed in React Flow flow coordinates (shared by both axes). */
export type ReactFlowScrollContentMetrics = {
  /** Flow X of the content's left edge (margin included). */
  contentMinX: number;
  /** Flow Y of the content's top edge (margin included). */
  contentMinY: number;
  /** Horizontal scrollable distance in flow coordinates. */
  scrollRangeX: number;
  /** Vertical scrollable distance in flow coordinates. */
  scrollRangeY: number;
};

/** Combined metrics: `content` in flow coords, `horizontal`/`vertical` in px. */
export type ReactFlowScrollMetrics = {
  content: ReactFlowScrollContentMetrics | undefined;
  horizontal: ReactFlowScrollAxisMetrics;
  vertical: ReactFlowScrollAxisMetrics;
};

/**
 * Bounds-resolver injection seam — exists so the controller can pass
 * `useReactFlow().getNodesBounds` (which injects the store `nodeLookup` and therefore
 * resolves nested/subflow nodes to their ABSOLUTE positions). The bare `getNodesBounds`
 * import reads a plain node's parent-relative `position` and is wrong for subflows; it is
 * only the default so the standalone helpers and their tests stay dependency-free.
 */
export type GetNodesBounds = (nodes: Node[]) => Rect;
