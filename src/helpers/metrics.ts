import { getNodesBounds } from '@xyflow/react';
import type {
  CoordinateExtent,
  Node,
  Viewport,
  XYPosition,
} from '@xyflow/react';
import type {
  GetNodesBounds,
  ReactFlowScrollAxisMetrics,
  ReactFlowScrollContentMetrics,
  ReactFlowScrollMetrics,
} from './types';

/** Default margin (flow coords) between the outermost nodes and the scroll-area edge. */
export const DEFAULT_SCROLL_AREA_MARGIN_PX = 30;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/** Bare default; the controller overrides this with the subflow-safe hook resolver. */
const defaultGetNodesBounds: GetNodesBounds = (nodes) => getNodesBounds(nodes);

const createHiddenAxisMetrics = (
  trackSizePx: number,
): ReactFlowScrollAxisMetrics => ({
  isVisible: false,
  thumbOffsetPx: 0,
  thumbSizePx: 0,
  trackSizePx,
});

/** Resolve a node's absolute position (subflow-safe) — falls back to `position` for plain nodes. */
const getNodeAbsolutePosition = (node: Node): XYPosition =>
  (node as Node & { internals?: { positionAbsolute?: XYPosition } }).internals
    ?.positionAbsolute ?? node.position;

/**
 * Compute scrollbar display values + scroll range from visible nodes and the current viewport;
 * the bidirectional bridge between the scrollbars and the React Flow viewport — called on every
 * viewport/zoom/size change by the controller.
 *
 * @param params.nodes - non-hidden React Flow nodes
 * @param params.containerWidth - canvas container width (full width, before subtracting the bar)
 * @param params.containerHeight - canvas container height
 * @param params.reactFlowViewport - current React Flow viewport (`{ x, y, zoom }`)
 * @param params.scrollbarTrackSize - thickness of both bars (px)
 * @param params.minThumbSize - minimum thumb length (px)
 * @param params.margin - scroll-area edge margin (flow coords)
 * @param params.getBounds - bounds resolver injection seam (defaults to bare `getNodesBounds`)
 * @returns thumb position/size per axis plus the `content` scroll range
 * @example
 * const metrics = getReactFlowScrollMetrics({
 *   nodes: visibleNodes,
 *   containerWidth: 800,
 *   containerHeight: 600,
 *   reactFlowViewport: { x: -100, y: -50, zoom: 1 },
 *   scrollbarTrackSize: 12,
 *   minThumbSize: 32,
 * });
 */
export const getReactFlowScrollMetrics = ({
  nodes,
  containerWidth,
  containerHeight,
  reactFlowViewport,
  scrollbarTrackSize,
  minThumbSize,
  margin = DEFAULT_SCROLL_AREA_MARGIN_PX,
  getBounds = defaultGetNodesBounds,
}: {
  nodes: Node[];
  containerWidth: number;
  containerHeight: number;
  reactFlowViewport: Viewport;
  scrollbarTrackSize: number;
  minThumbSize: number;
  margin?: number;
  getBounds?: GetNodesBounds;
}): ReactFlowScrollMetrics => {
  const horizontalTrackSizePx = Math.max(0, containerWidth - scrollbarTrackSize);
  const verticalTrackSizePx = Math.max(0, containerHeight - scrollbarTrackSize);

  // Bail to hidden bars when there is nothing to scroll or the container is unmeasured.
  if (
    nodes.length === 0 ||
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    horizontalTrackSizePx <= 0 ||
    verticalTrackSizePx <= 0
  ) {
    return {
      content: undefined,
      horizontal: createHiddenAxisMetrics(horizontalTrackSizePx),
      vertical: createHiddenAxisMetrics(verticalTrackSizePx),
    };
  }

  const bounds = getBounds(nodes);
  if (bounds.width <= 0 || bounds.height <= 0) {
    return {
      content: undefined,
      horizontal: createHiddenAxisMetrics(horizontalTrackSizePx),
      vertical: createHiddenAxisMetrics(verticalTrackSizePx),
    };
  }

  const contentMinX = bounds.x - margin;
  const contentMinY = bounds.y - margin;
  const contentWidth = bounds.width + margin * 2;
  const contentHeight = bounds.height + margin * 2;

  // Visible world = container px / zoom; scroll range is the world content beyond it.
  const visibleWorldWidth = containerWidth / reactFlowViewport.zoom;
  const visibleWorldHeight = containerHeight / reactFlowViewport.zoom;
  const scrollRangeX = Math.max(0, contentWidth - visibleWorldWidth);
  const scrollRangeY = Math.max(0, contentHeight - visibleWorldHeight);

  const worldLeft = -reactFlowViewport.x / reactFlowViewport.zoom;
  const worldTop = -reactFlowViewport.y / reactFlowViewport.zoom;
  const scrollOffsetX = clamp(worldLeft - contentMinX, 0, scrollRangeX);
  const scrollOffsetY = clamp(worldTop - contentMinY, 0, scrollRangeY);
  const horizontalRatio = scrollRangeX > 0 ? scrollOffsetX / scrollRangeX : 0;
  const verticalRatio = scrollRangeY > 0 ? scrollOffsetY / scrollRangeY : 0;

  // Proportional thumb, floored at minThumbSize; full track when the axis does not scroll.
  const horizontalThumbSizePx =
    scrollRangeX > 0
      ? Math.max(
          minThumbSize,
          (visibleWorldWidth / contentWidth) * horizontalTrackSizePx,
        )
      : horizontalTrackSizePx;
  const verticalThumbSizePx =
    scrollRangeY > 0
      ? Math.max(
          minThumbSize,
          (visibleWorldHeight / contentHeight) * verticalTrackSizePx,
        )
      : verticalTrackSizePx;

  const horizontalThumbTravelPx = Math.max(
    0,
    horizontalTrackSizePx - horizontalThumbSizePx,
  );
  const verticalThumbTravelPx = Math.max(
    0,
    verticalTrackSizePx - verticalThumbSizePx,
  );
  const horizontalThumbOffsetPx = horizontalRatio * horizontalThumbTravelPx;
  const verticalThumbOffsetPx = verticalRatio * verticalThumbTravelPx;

  return {
    content: {
      contentMinX,
      contentMinY,
      scrollRangeX,
      scrollRangeY,
    },
    horizontal: {
      isVisible: scrollRangeX > 0,
      thumbOffsetPx: horizontalThumbOffsetPx,
      thumbSizePx: horizontalThumbSizePx,
      trackSizePx: horizontalTrackSizePx,
    },
    vertical: {
      isVisible: scrollRangeY > 0,
      thumbOffsetPx: verticalThumbOffsetPx,
      thumbSizePx: verticalThumbSizePx,
      trackSizePx: verticalTrackSizePx,
    },
  };
};

/**
 * Convert scrollbar ratios back into a React Flow viewport (zoom preserved); the single viewport
 * writer used by thumb drags and track clicks.
 *
 * @param params.content - the `content` block from {@link getReactFlowScrollMetrics}
 * @param params.reactFlowViewport - current viewport (zoom is kept)
 * @param params.horizontalRatio - horizontal scroll ratio 0..1
 * @param params.verticalRatio - vertical scroll ratio 0..1
 * @returns the viewport to pass to `setViewport`
 */
export const getReactFlowViewportFromScrollRatios = ({
  content,
  reactFlowViewport,
  horizontalRatio,
  verticalRatio,
}: {
  content: ReactFlowScrollContentMetrics;
  reactFlowViewport: Viewport;
  horizontalRatio: number;
  verticalRatio: number;
}): Viewport => {
  const clampedHorizontalRatio = clamp(horizontalRatio, 0, 1);
  const clampedVerticalRatio = clamp(verticalRatio, 0, 1);
  const worldLeft =
    content.contentMinX + clampedHorizontalRatio * content.scrollRangeX;
  const worldTop =
    content.contentMinY + clampedVerticalRatio * content.scrollRangeY;

  return {
    x: -worldLeft * reactFlowViewport.zoom,
    y: -worldTop * reactFlowViewport.zoom,
    zoom: reactFlowViewport.zoom,
  };
};

/**
 * Compute a focus viewport for a target node, clamped to the scroll range so the first pan after
 * focus does not snap; `align` picks node-center-to-screen-center (`'center'`) or node-top-left to
 * screen-top-left + margin (`'topLeft'`). Both converge to top-left on an axis where content is
 * smaller than the viewport, matching the d3 pan-clamp and the scrollbars.
 *
 * @param params.nodes - non-hidden React Flow nodes (used for the content range)
 * @param params.targetNode - node to focus
 * @param params.containerWidth - canvas container width
 * @param params.containerHeight - canvas container height
 * @param params.zoom - viewport zoom
 * @param params.align - placement basis, `'center'` (default) | `'topLeft'`
 * @param params.margin - scroll-area edge margin (flow coords)
 * @param params.getBounds - bounds resolver injection seam (defaults to bare `getNodesBounds`)
 * @returns the focus viewport, or `undefined` when content is invalid (no nodes / unmeasured container)
 * @example
 * const vp = getReactFlowFocusViewport({ nodes, targetNode, containerWidth: 1280, containerHeight: 576, zoom: 1 });
 * if (vp) setViewport(vp, { duration: 500 });
 */
export const getReactFlowFocusViewport = ({
  nodes,
  targetNode,
  containerWidth,
  containerHeight,
  zoom,
  align = 'center',
  margin = DEFAULT_SCROLL_AREA_MARGIN_PX,
  getBounds = defaultGetNodesBounds,
}: {
  nodes: Node[];
  targetNode: Node;
  containerWidth: number;
  containerHeight: number;
  zoom: number;
  align?: 'center' | 'topLeft';
  margin?: number;
  getBounds?: GetNodesBounds;
}): Viewport | undefined => {
  if (
    nodes.length === 0 ||
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    zoom <= 0
  ) {
    return undefined;
  }

  const bounds = getBounds(nodes);
  if (bounds.width <= 0 || bounds.height <= 0) {
    return undefined;
  }

  const contentMinX = bounds.x - margin;
  const contentMinY = bounds.y - margin;
  const contentWidth = bounds.width + margin * 2;
  const contentHeight = bounds.height + margin * 2;

  const visibleWorldWidth = containerWidth / zoom;
  const visibleWorldHeight = containerHeight / zoom;
  const scrollRangeX = Math.max(0, contentWidth - visibleWorldWidth);
  const scrollRangeY = Math.max(0, contentHeight - visibleWorldHeight);

  // Resolve the target's absolute position so focus is correct inside subflows.
  const targetPosition = getNodeAbsolutePosition(targetNode);

  let desiredWorldLeft: number;
  let desiredWorldTop: number;
  if (align === 'topLeft') {
    // Node top-left to screen top-left + margin.
    desiredWorldLeft = targetPosition.x - margin;
    desiredWorldTop = targetPosition.y - margin;
  } else {
    // Node center to screen center (prefer measured dims, like getNodesBounds).
    const targetWidth = targetNode.measured?.width ?? targetNode.width ?? 0;
    const targetHeight = targetNode.measured?.height ?? targetNode.height ?? 0;
    const nodeCenterX = targetPosition.x + targetWidth / 2;
    const nodeCenterY = targetPosition.y + targetHeight / 2;
    desiredWorldLeft = nodeCenterX - visibleWorldWidth / 2;
    desiredWorldTop = nodeCenterY - visibleWorldHeight / 2;
  }

  // Clamp to the scroll range; on an axis smaller than the viewport, scrollRange=0 so this
  // converges to contentMin (top-left).
  const worldLeft = clamp(
    desiredWorldLeft,
    contentMinX,
    contentMinX + scrollRangeX,
  );
  const worldTop = clamp(
    desiredWorldTop,
    contentMinY,
    contentMinY + scrollRangeY,
  );

  return {
    x: -worldLeft * zoom,
    y: -worldTop * zoom,
    zoom,
  };
};

/**
 * Compute a React Flow `translateExtent` that bounds panning to the node content; load-bearing,
 * because without it d3-zoom centers content while the scrollbars top-left-align and panning snaps.
 * On an axis where content is smaller than the visible world, the extent is padded to the visible
 * world (`containerSize / zoom`) so d3-zoom's `constrain` edge-clamps (top-left) instead of centering.
 *
 * @param params.nodes - non-hidden React Flow nodes
 * @param params.containerWidth - canvas container width (px)
 * @param params.containerHeight - canvas container height (px)
 * @param params.zoom - viewport zoom; divides the container px to get visible-world size (default 1)
 * @param params.margin - scroll-area edge margin (flow coords)
 * @param params.getBounds - bounds resolver injection seam (defaults to bare `getNodesBounds`)
 * @returns `[[minX,minY],[maxX,maxY]]`, or `undefined` when there are no nodes / bounds are invalid
 * @example
 * const extent = getReactFlowTranslateExtent({ nodes, containerWidth: 1280, containerHeight: 576, zoom: 1 });
 */
export const getReactFlowTranslateExtent = ({
  nodes,
  containerWidth,
  containerHeight,
  zoom = 1,
  margin = DEFAULT_SCROLL_AREA_MARGIN_PX,
  getBounds = defaultGetNodesBounds,
}: {
  nodes: Node[];
  containerWidth: number;
  containerHeight: number;
  zoom?: number;
  margin?: number;
  getBounds?: GetNodesBounds;
}): CoordinateExtent | undefined => {
  if (nodes.length === 0) {
    return undefined;
  }

  const bounds = getBounds(nodes);
  if (bounds.width <= 0 || bounds.height <= 0) {
    return undefined;
  }

  const minX = bounds.x - margin;
  const minY = bounds.y - margin;
  const contentMaxX = bounds.x + bounds.width + margin;
  const contentMaxY = bounds.y + bounds.height + margin;

  // Pad each axis to the visible world so d3-zoom's constrain edge-clamps (top-left) instead of
  // centering. The pad term is the anti-centering mechanism (NOT a bug); `/ zoom` is the fix for the
  // px-vs-world conflation. When content already exceeds the visible world, Math.max keeps the
  // content edge, so the extent stays static (and the bars/extent agree at every zoom). At an
  // unmeasured container (0) Math.max also falls back to the content edge, never a degenerate extent.
  const safeZoom = zoom > 0 ? zoom : 1;
  const maxX = Math.max(contentMaxX, minX + containerWidth / safeZoom);
  const maxY = Math.max(contentMaxY, minY + containerHeight / safeZoom);

  return [
    [minX, minY],
    [maxX, maxY],
  ];
};
