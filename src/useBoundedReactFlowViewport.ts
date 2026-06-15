import {
  useNodes,
  useNodesInitialized,
  useReactFlow,
  useStore,
  useViewport,
} from '@xyflow/react';
import type { CoordinateExtent, Node, Viewport } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  DEFAULT_SCROLLBAR_MIN_THUMB_SIZE_PX,
  DEFAULT_SCROLLBAR_TRACK_SIZE_PX,
} from './defaults';
import {
  DEFAULT_SCROLL_AREA_MARGIN_PX,
  getReactFlowScrollMetrics,
  getReactFlowTranslateExtent,
  getReactFlowViewportFromScrollRatios,
} from './helpers/metrics';
import type { GetNodesBounds, ReactFlowScrollMetrics } from './helpers/types';

const clamp01 = (value: number): number => Math.min(Math.max(value, 0), 1);

const isDev = (): boolean =>
  typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';

/** Options for {@link useBoundedReactFlowViewport}. */
export type UseBoundedReactFlowViewportOptions = {
  /** Nodes whose bounds define the scroll area. Defaults to the store nodes (`useNodes()`). */
  nodes?: Node[];
  /** Content-edge inset in flow coordinates. Default 30. */
  margin?: number;
  /** Scrollbar track thickness in px. Default 12. */
  trackSize?: number;
  /** Minimum thumb length in px. Default 32. */
  minThumbSize?: number;
};

/** The single source of truth returned by {@link useBoundedReactFlowViewport}. */
export type BoundedReactFlowViewportController = {
  /** Pan-clamp extent — pass to `<ReactFlow translateExtent={...}>`. `undefined` when there is nothing to bound. */
  translateExtent: CoordinateExtent | undefined;
  /** Current scrollbar geometry + scroll range, recomputed reactively. */
  metrics: ReactFlowScrollMetrics;
  /** Configured bar thickness (px) — the component renders the track at this size so geometry matches. */
  trackSize: number;
  /** Scroll to absolute ratios (0..1); an omitted axis keeps its current position. */
  scrollTo: (ratios: { xRatio?: number; yRatio?: number }) => void;
  /** Scroll by a flow-coordinate delta on either axis. */
  scrollBy: (delta: { x?: number; y?: number }) => void;
};

/**
 * Keep a `translateExtent` referentially stable across renders when its four numbers are unchanged
 * (value-equality memo) so the `<ReactFlow>` prop identity stays static when content ≥ viewport, even
 * as zoom changes; only mints a new array when the bounds actually move.
 *
 * @param next - the freshly computed extent (or undefined)
 * @returns the prior array when value-equal, else `next`
 * @example
 * // same four numbers across a zoom frame → identical reference (no re-clamp)
 * useStableExtent([[-30,-30],[610,258]]) === useStableExtent([[-30,-30],[610,258]])
 */
// Exported for unit testing only — intentionally NOT re-exported from the public barrel (index.ts).
export const useStableExtent = (
  next: CoordinateExtent | undefined,
): CoordinateExtent | undefined => {
  const ref = useRef<CoordinateExtent | undefined>(next);
  const prev = ref.current;
  const isSame =
    prev === next ||
    (prev === undefined && next === undefined) ||
    (prev !== undefined &&
      next !== undefined &&
      prev[0][0] === next[0][0] &&
      prev[0][1] === next[0][1] &&
      prev[1][0] === next[1][0] &&
      prev[1][1] === next[1][1]);
  if (isSame) {
    return prev;
  }
  ref.current = next;
  return next;
};

/**
 * Controller hook that derives the React Flow `translateExtent`, the scrollbar metrics, and the
 * viewport-write methods from one shared node-bounds source; the architectural fix for "the bars,
 * the pan-clamp, and focus drift apart" — wire `translateExtent` onto `<ReactFlow>` and pass the
 * controller to `<ReactFlowScrollbars>`. Must run inside a `<ReactFlowProvider>`.
 *
 * @param options - see {@link UseBoundedReactFlowViewportOptions}
 * @returns the controller — see {@link BoundedReactFlowViewportController}
 * @example
 * const controller = useBoundedReactFlowViewport({ nodes });
 * return (
 *   <ReactFlow nodes={nodes} translateExtent={controller.translateExtent}>
 *     <ReactFlowScrollbars controller={controller} />
 *   </ReactFlow>
 * );
 */
export const useBoundedReactFlowViewport = (
  options: UseBoundedReactFlowViewportOptions = {},
): BoundedReactFlowViewportController => {
  const {
    nodes: nodesOption,
    margin = DEFAULT_SCROLL_AREA_MARGIN_PX,
    trackSize = DEFAULT_SCROLLBAR_TRACK_SIZE_PX,
    minThumbSize = DEFAULT_SCROLLBAR_MIN_THUMB_SIZE_PX,
  } = options;

  // Subscribe to store nodes so the controller tracks them when the caller passes none.
  const storeNodes = useNodes();
  const sourceNodes = nodesOption ?? storeNodes;

  const reactFlowViewport = useViewport();
  const zoom = reactFlowViewport.zoom;
  // ISSUE-1: container dims come from the RF store (auto-tracks resize), not from props.
  const containerWidth = useStore((state) => state.width);
  const containerHeight = useStore((state) => state.height);

  const { getNodesBounds: getNodesBoundsHook, setViewport } = useReactFlow();

  // Stable getBounds identity that always calls the latest hook method. The hook resolver injects
  // the store nodeLookup, so nested/subflow nodes resolve to their absolute positions (OV-1).
  const getBoundsRef = useRef(getNodesBoundsHook);
  getBoundsRef.current = getNodesBoundsHook;
  const getBounds = useCallback<GetNodesBounds>(
    (nodes) => getBoundsRef.current(nodes),
    [],
  );

  // OV-1: scrollbars + extent ignore hidden nodes.
  const visibleNodes = useMemo(
    () => sourceNodes.filter((node) => !node.hidden),
    [sourceNodes],
  );

  // React Flow measures unsized nodes asynchronously and writes the dimensions into the store
  // nodeLookup — NOT necessarily into a new `nodes` array. This signal flips false→true when that
  // measurement completes, forcing the bounds memo below to re-read the now-measured nodeLookup so
  // the bars appear (without it, a static `nodes` prop would cache degenerate pre-measure bounds).
  const nodesInitialized = useNodesInitialized();

  // ISSUE-4: run the O(n) getNodesBounds once per node change (or when measurement lands); per-frame
  // metrics are then O(1). getBounds reads the mutable store nodeLookup, so its real input is invisible
  // to exhaustive-deps; nodesInitialized is the trigger that recomputes once async measurement lands.
  const memoizedBounds = useMemo(
    () => (visibleNodes.length > 0 ? getBounds(visibleNodes) : undefined),
    [visibleNodes, getBounds, nodesInitialized],
  );
  // A bounds resolver that returns the memoized rect so the pure helpers do not recompute per frame.
  const reuseBounds = useCallback<GetNodesBounds>(
    () => memoizedBounds ?? { x: 0, y: 0, width: 0, height: 0 },
    [memoizedBounds],
  );

  // OV-1: once the container is measured but the visible nodes still have no size, warn once — the
  // bars stay hidden until React Flow measures the nodes (or the caller gives them width/height).
  const unmeasuredWarnedRef = useRef(false);
  useEffect(() => {
    if (!isDev() || unmeasuredWarnedRef.current) {
      return;
    }
    const containerMeasured = containerWidth > 0 && containerHeight > 0;
    const boundsDegenerate =
      memoizedBounds !== undefined &&
      (memoizedBounds.width <= 0 || memoizedBounds.height <= 0);
    if (visibleNodes.length > 0 && containerMeasured && boundsDegenerate) {
      unmeasuredWarnedRef.current = true;
      console.warn(
        '[react-flow-scrollbar] Visible nodes have no measured size yet, so the scrollbars stay hidden. ' +
          'If they never appear, ensure your nodes are rendered by React Flow or have explicit width/height.',
      );
    }
  }, [visibleNodes.length, containerWidth, containerHeight, memoizedBounds]);

  const metrics = useMemo(
    () =>
      getReactFlowScrollMetrics({
        nodes: visibleNodes,
        containerWidth,
        containerHeight,
        reactFlowViewport,
        scrollbarTrackSize: trackSize,
        minThumbSize,
        margin,
        getBounds: reuseBounds,
      }),
    [
      visibleNodes,
      containerWidth,
      containerHeight,
      reactFlowViewport,
      trackSize,
      minThumbSize,
      margin,
      reuseBounds,
    ],
  );

  // ISSUE-2: zoom-aware extent, recomputed on (nodes, margin, zoom); the value-equality memo keeps
  // the prop identity stable when content ≥ viewport (where the numbers do not move with zoom).
  const computedExtent = useMemo(
    () =>
      getReactFlowTranslateExtent({
        nodes: visibleNodes,
        containerWidth,
        containerHeight,
        zoom,
        margin,
        getBounds: reuseBounds,
      }),
    [visibleNodes, containerWidth, containerHeight, zoom, margin, reuseBounds],
  );
  const translateExtent = useStableExtent(computedExtent);

  // ISSUE-5: coalesce viewport writes — keep the latest target in a ref and flush once per frame.
  const pendingViewportRef = useRef<Viewport | undefined>(undefined);
  const rafRef = useRef<number | undefined>(undefined);
  const flushViewport = useCallback(() => {
    rafRef.current = undefined;
    const pending = pendingViewportRef.current;
    pendingViewportRef.current = undefined;
    if (pending) {
      void setViewport(pending);
    }
  }, [setViewport]);
  const writeViewport = useCallback(
    (viewport: Viewport) => {
      pendingViewportRef.current = viewport;
      if (rafRef.current === undefined) {
        rafRef.current = requestAnimationFrame(flushViewport);
      }
    },
    [flushViewport],
  );
  // Cancel a pending frame on unmount so we never write into an unmounted flow.
  useEffect(
    () => () => {
      if (rafRef.current !== undefined) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = undefined;
      pendingViewportRef.current = undefined;
    },
    [],
  );

  // Current scroll ratios from the live viewport — used to preserve the axis a caller does not set.
  const getCurrentRatios = useCallback(() => {
    if (!metrics.content) {
      return { horizontalRatio: 0, verticalRatio: 0 };
    }
    const worldLeft = -reactFlowViewport.x / reactFlowViewport.zoom;
    const worldTop = -reactFlowViewport.y / reactFlowViewport.zoom;
    return {
      horizontalRatio:
        metrics.content.scrollRangeX > 0
          ? clamp01(
              (worldLeft - metrics.content.contentMinX) /
                metrics.content.scrollRangeX,
            )
          : 0,
      verticalRatio:
        metrics.content.scrollRangeY > 0
          ? clamp01(
              (worldTop - metrics.content.contentMinY) /
                metrics.content.scrollRangeY,
            )
          : 0,
    };
  }, [
    metrics.content,
    reactFlowViewport.x,
    reactFlowViewport.y,
    reactFlowViewport.zoom,
  ]);

  const scrollTo = useCallback(
    ({ xRatio, yRatio }: { xRatio?: number; yRatio?: number }) => {
      if (!metrics.content) {
        return;
      }
      const current = getCurrentRatios();
      writeViewport(
        getReactFlowViewportFromScrollRatios({
          content: metrics.content,
          reactFlowViewport,
          horizontalRatio: xRatio ?? current.horizontalRatio,
          verticalRatio: yRatio ?? current.verticalRatio,
        }),
      );
    },
    [metrics.content, getCurrentRatios, writeViewport, reactFlowViewport],
  );

  const scrollBy = useCallback(
    ({ x, y }: { x?: number; y?: number }) => {
      if (!metrics.content) {
        return;
      }
      const current = getCurrentRatios();
      // Convert a flow-coordinate delta into a ratio delta against the scroll range.
      const dxRatio =
        metrics.content.scrollRangeX > 0
          ? (x ?? 0) / metrics.content.scrollRangeX
          : 0;
      const dyRatio =
        metrics.content.scrollRangeY > 0
          ? (y ?? 0) / metrics.content.scrollRangeY
          : 0;
      scrollTo({
        xRatio: current.horizontalRatio + dxRatio,
        yRatio: current.verticalRatio + dyRatio,
      });
    },
    [metrics.content, getCurrentRatios, scrollTo],
  );

  return { translateExtent, metrics, trackSize, scrollTo, scrollBy };
};
