// Pure helpers (framework-agnostic math).
export {
  DEFAULT_SCROLL_AREA_MARGIN_PX,
  getReactFlowFocusViewport,
  getReactFlowScrollMetrics,
  getReactFlowTranslateExtent,
  getReactFlowViewportFromScrollRatios,
} from './helpers/metrics';
export type {
  GetNodesBounds,
  ReactFlowScrollAxisMetrics,
  ReactFlowScrollContentMetrics,
  ReactFlowScrollMetrics,
} from './helpers/types';

// Defaults (exported so consumers can reference the same values).
export {
  DEFAULT_SCROLLBAR_MIN_THUMB_SIZE_PX,
  DEFAULT_SCROLLBAR_TRACK_SIZE_PX,
} from './defaults';

// Controller (the single source of truth).
export { useBoundedReactFlowViewport } from './useBoundedReactFlowViewport';
export type {
  BoundedReactFlowViewportController,
  UseBoundedReactFlowViewportOptions,
} from './useBoundedReactFlowViewport';

// Styled component.
export { ReactFlowScrollbars } from './ReactFlowScrollbars';
export type { ReactFlowScrollbarsProps } from './ReactFlowScrollbars';
