# react-flow-scrollbar

## 0.2.0

### Minor Changes

- 0d6a663: Thinner default scrollbars, automatic dark mode, and a touch-friendly grab area.

  - **Default thickness lowered 12px → 8px** (`DEFAULT_SCROLLBAR_TRACK_SIZE_PX` and the
    `--rf-scrollbar-track-size` CSS variable move together). Existing canvases render visibly slimmer
    bars with no code change. To keep the old look, pass `trackSize={12}` to
    `useBoundedReactFlowViewport` (or set `--rf-scrollbar-track-size: 12px`).
  - **Dark mode now ships automatically.** When a `.dark` ancestor is present (the Tailwind / shadcn /
    next-themes class convention) the bars switch to white-translucent — no configuration needed. The
    existing black-translucent values still serve light mode. Override the `.dark .react-flow-scrollbars`
    rule to customize the dark palette.
  - **Touch-friendly grab area.** A new `--rf-scrollbar-hit-size` variable controls the thumb's pointer
    hit area. On coarse (touch) pointers it widens to `max(track-size, 24px)` so the thin 8px bar stays
    grabbable while the visible bar stays thin; on fine (mouse) pointers the hit area stays at the track
    size. Pure-CSS change (a thumb `::before` pad) — the drag handler is untouched.

  Notes: the 24px touch target is a deliberate _mitigation_, not full 44px compliance — it keeps the
  canvas dead-zone small, and the track's click-to-jump target stays at the visible thickness. Dark
  mode and the touch grab area ship without dedicated automated tests in this release (touch operability
  is verified separately by recorded video, per the project's interaction-testing rule); the existing
  unit and e2e suites stay green.

## 0.1.0

### Minor Changes

- 4594194: Initial public release.

  Custom, viewport-synced scrollbars and zoom-aware bounded panning (`translateExtent`) for React Flow / @xyflow/react v12.

  - `useBoundedReactFlowViewport` controller — the single source of truth for scrollbar geometry, the pan-clamp extent, and programmatic scrolling (`scrollTo` / `scrollBy`).
  - `<ReactFlowScrollbars>` component — draggable, click-to-jump horizontal/vertical bars that stay in two-way sync with the viewport.
  - Zoom-aware `translateExtent` (padded in world coordinates at the current zoom) so panning never snaps or drifts when zoomed.
  - Subflow-correct bounds, themeable via CSS variables, ESM + CJS + types, tree-shakeable.
