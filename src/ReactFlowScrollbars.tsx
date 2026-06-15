import { useStoreApi } from '@xyflow/react';
import { useCallback, useEffect, useRef } from 'react';
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  ReactElement,
} from 'react';
import type { BoundedReactFlowViewportController } from './useBoundedReactFlowViewport';

type ScrollAxis = 'horizontal' | 'vertical';

/** Props for {@link ReactFlowScrollbars}. */
export type ReactFlowScrollbarsProps = {
  /** The controller from {@link useBoundedReactFlowViewport} — the single source of truth (required). */
  controller: BoundedReactFlowViewportController;
  /** Which bars to render. Default `'both'`. */
  orientation?: 'both' | 'horizontal' | 'vertical';
  /** Extra class on the overlay root (e.g. for theming). */
  className?: string;
  /** Inline style merged onto the overlay root (CSS variables welcome). */
  style?: CSSProperties;
};

const clampRatio = (value: number): number => Math.min(Math.max(value, 0), 1);

const isDev = (): boolean =>
  typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';

const isInfiniteExtent = (
  extent: readonly (readonly number[])[] | undefined,
): boolean =>
  extent === undefined ||
  extent.some((point) => point.some((value) => !Number.isFinite(value)));

/**
 * Viewport-synced scrollbar overlay for React Flow — an idiomatic child of `<ReactFlow>` like
 * `<MiniMap/>`. Renders draggable, click-to-jump bars from a {@link useBoundedReactFlowViewport}
 * controller and writes back through it; renders `null` until there is something to scroll.
 *
 * @param props - see {@link ReactFlowScrollbarsProps}
 * @returns the scrollbar overlay, or `null` when nothing overflows
 * @example
 * <ReactFlow translateExtent={controller.translateExtent}>
 *   <ReactFlowScrollbars controller={controller} />
 * </ReactFlow>
 */
export const ReactFlowScrollbars = ({
  controller,
  orientation = 'both',
  className,
  style,
}: ReactFlowScrollbarsProps): ReactElement | null => {
  const { metrics, trackSize } = controller;

  // Always read the latest controller inside long-lived drag handlers (avoids stale viewport/scrollTo).
  const controllerRef = useRef(controller);
  controllerRef.current = controller;

  // Drag state for the active thumb, plus the AbortController bundling its window listeners.
  const dragStateRef = useRef<
    | {
        axis: ScrollAxis;
        startPointer: number;
        startRatio: number;
        thumbTravelPx: number;
      }
    | undefined
  >(undefined);
  const dragAbortRef = useRef<AbortController | undefined>(undefined);

  // Abort any in-flight drag listeners on unmount (pointerup/cancel may never arrive).
  useEffect(
    () => () => {
      dragAbortRef.current?.abort();
      dragAbortRef.current = undefined;
      dragStateRef.current = undefined;
    },
    [],
  );

  // OV-2: one frame after wiring, warn once if the live store extent is still infinite — i.e. the
  // caller passed a controller but forgot `translateExtent={controller.translateExtent}` (panning snaps).
  const storeApi = useStoreApi();
  const extentWarnedRef = useRef(false);
  const hasExtent = controller.translateExtent !== undefined;
  useEffect(() => {
    if (!isDev() || extentWarnedRef.current || !hasExtent) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      if (isInfiniteExtent(storeApi.getState().translateExtent)) {
        extentWarnedRef.current = true;
        console.warn(
          '[react-flow-scrollbar] A controller was passed but <ReactFlow> has no translateExtent wired. ' +
            'Add translateExtent={controller.translateExtent} or panning will snap back to center.',
        );
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [hasExtent, storeApi]);

  // Grab a thumb: capture start ratio/travel from current metrics, then track the pointer on `window`
  // until pointerup/pointercancel (or unmount) aborts the shared listener set.
  const handleThumbPointerDown = useCallback(
    (axis: ScrollAxis, event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const axisMetrics =
        axis === 'horizontal'
          ? controllerRef.current.metrics.horizontal
          : controllerRef.current.metrics.vertical;
      const thumbTravelPx = Math.max(
        0,
        axisMetrics.trackSizePx - axisMetrics.thumbSizePx,
      );
      // Derive the start ratio from the thumb's current offset (no viewport read needed).
      const startRatio =
        thumbTravelPx > 0 ? axisMetrics.thumbOffsetPx / thumbTravelPx : 0;

      // Drop any drag left over from a missed pointercancel before starting a new one.
      dragAbortRef.current?.abort();
      const abortController = new AbortController();
      dragAbortRef.current = abortController;
      const { signal } = abortController;

      dragStateRef.current = {
        axis,
        startPointer: axis === 'horizontal' ? event.clientX : event.clientY,
        startRatio,
        thumbTravelPx,
      };

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const dragState = dragStateRef.current;
        if (!dragState || dragState.thumbTravelPx <= 0) {
          return;
        }
        const pointerDelta =
          (dragState.axis === 'horizontal'
            ? moveEvent.clientX
            : moveEvent.clientY) - dragState.startPointer;
        const nextRatio = clampRatio(
          dragState.startRatio + pointerDelta / dragState.thumbTravelPx,
        );
        // scrollTo preserves the other axis; the controller rAF-coalesces the write.
        controllerRef.current.scrollTo(
          dragState.axis === 'horizontal'
            ? { xRatio: nextRatio }
            : { yRatio: nextRatio },
        );
      };

      const endDrag = () => {
        dragStateRef.current = undefined;
        if (dragAbortRef.current === abortController) {
          dragAbortRef.current = undefined;
        }
        abortController.abort();
      };

      window.addEventListener('pointermove', handlePointerMove, { signal });
      window.addEventListener('pointerup', endDrag, { signal });
      window.addEventListener('pointercancel', endDrag, { signal });
    },
    [],
  );

  // Click the track gutter: jump so the thumb centers under the pointer.
  const handleTrackPointerDown = useCallback(
    (axis: ScrollAxis, event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const axisMetrics =
        axis === 'horizontal'
          ? controllerRef.current.metrics.horizontal
          : controllerRef.current.metrics.vertical;
      if (!axisMetrics.isVisible) {
        return;
      }

      const trackRect = event.currentTarget.getBoundingClientRect();
      const pointerOffset =
        axis === 'horizontal'
          ? event.clientX - trackRect.left
          : event.clientY - trackRect.top;
      const thumbTravelPx = Math.max(
        0,
        axisMetrics.trackSizePx - axisMetrics.thumbSizePx,
      );
      if (thumbTravelPx <= 0) {
        return;
      }

      const nextRatio = clampRatio(
        (pointerOffset - axisMetrics.thumbSizePx / 2) / thumbTravelPx,
      );
      controllerRef.current.scrollTo(
        axis === 'horizontal' ? { xRatio: nextRatio } : { yRatio: nextRatio },
      );
    },
    [],
  );

  if (!metrics.content) {
    return null;
  }

  const { horizontal, vertical } = metrics;
  const showHorizontal = orientation !== 'vertical' && horizontal.isVisible;
  const showVertical = orientation !== 'horizontal' && vertical.isVisible;
  if (!showHorizontal && !showVertical) {
    return null;
  }

  const rootStyle = {
    '--rf-scrollbar-track-size': `${trackSize}px`,
    ...style,
  } as CSSProperties;

  return (
    <div
      className={
        className
          ? `react-flow-scrollbars ${className}`
          : 'react-flow-scrollbars'
      }
      data-rf-scrollbars=""
      style={rootStyle}
    >
      {showHorizontal && (
        <div
          className="react-flow-scrollbars__track nopan nodrag nowheel"
          data-rf-scrollbar-track=""
          data-axis="x"
          style={{ width: `${horizontal.trackSizePx}px` }}
          onPointerDown={(event) => handleTrackPointerDown('horizontal', event)}
        >
          <div
            className="react-flow-scrollbars__thumb nopan nodrag nowheel"
            data-rf-scrollbar-thumb=""
            data-axis="x"
            style={{
              left: `${horizontal.thumbOffsetPx}px`,
              width: `${horizontal.thumbSizePx}px`,
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
              handleThumbPointerDown('horizontal', event);
            }}
          />
        </div>
      )}

      {showVertical && (
        <div
          className="react-flow-scrollbars__track nopan nodrag nowheel"
          data-rf-scrollbar-track=""
          data-axis="y"
          style={{ height: `${vertical.trackSizePx}px` }}
          onPointerDown={(event) => handleTrackPointerDown('vertical', event)}
        >
          <div
            className="react-flow-scrollbars__thumb nopan nodrag nowheel"
            data-rf-scrollbar-thumb=""
            data-axis="y"
            style={{
              top: `${vertical.thumbOffsetPx}px`,
              height: `${vertical.thumbSizePx}px`,
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
              handleThumbPointerDown('vertical', event);
            }}
          />
        </div>
      )}
    </div>
  );
};
