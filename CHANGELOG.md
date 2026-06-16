# react-flow-scrollbar

## 0.1.0

### Minor Changes

- 4594194: Initial public release.

  Custom, viewport-synced scrollbars and zoom-aware bounded panning (`translateExtent`) for React Flow / @xyflow/react v12.

  - `useBoundedReactFlowViewport` controller — the single source of truth for scrollbar geometry, the pan-clamp extent, and programmatic scrolling (`scrollTo` / `scrollBy`).
  - `<ReactFlowScrollbars>` component — draggable, click-to-jump horizontal/vertical bars that stay in two-way sync with the viewport.
  - Zoom-aware `translateExtent` (padded in world coordinates at the current zoom) so panning never snaps or drifts when zoomed.
  - Subflow-correct bounds, themeable via CSS variables, ESM + CJS + types, tree-shakeable.
