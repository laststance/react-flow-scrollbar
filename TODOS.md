# TODOS

Deferred work, tracked across sessions. Each entry states the motivation so it stays actionable months later.

## Design debt — from /plan-design-review (docs site), 2026-06-16

### TODO-1 — Library scrollbar PR: thin default + dark mode + touch targets

- **What:** One library-scope PR bundling three changes — (a) lower the default scrollbar thickness `DEFAULT_SCROLLBAR_TRACK_SIZE_PX` 12 → **8px** in `src/defaults.ts` AND `--rf-scrollbar-track-size` 12 → 8px in `src/styles.css` (both must move together), (b) ship dark-mode `.dark .react-flow-scrollbars` `--rf-scrollbar-*` white-translucent overrides in `src/styles.css`, (c) a touch-target fix in `src/ReactFlowScrollbars.tsx` — keep the 8px visible thumb but add a **wider transparent hit-zone** (≈24–44px).
- **Why:** The docs site is dark-first technical-minimal and 12px reads too heavy; 8px matches the approved mockups. But 8px is far below the 44px coarse-pointer minimum, so a thin thumb needs a larger grab area. `src/styles.css` currently ships only the light (black-translucent) values — dark mode has no scrollbar tokens yet.
- **Pros:** All consumers get the refined slim look + working dark mode + touch-grabbable scrollbars; the docs site (first consumer) inherits it for free.
- **Cons:** Changes the published package surface, version, and tests; (c) is real component code, not just a token swap.
- **Context:** Decided in `~/.gstack/projects/react-flow-scrollbar/ryotamurakami-main-design-20260616-165314.md` §13.3 + §13.5. The existing black-translucent values in `styles.css` ARE the correct light-mode values — only dark needs adding. v0.1.0 just published → few/no dependents → low-risk default change. Full task rows T9–T11 in `~/.gstack/projects/react-flow-scrollbar/tasks-design-review-1781602780.jsonl`.
- **Depends on / blocked by:** None. Ships as its own package PR, separate from the docs-site (`website/`) build — do not conflate the two.
- **Status (2026-06-16):** ✅ Implemented on branch `feat/thin-scrollbar-dark-touch` (commit `3b2e75a`) — 8px default, automatic `.dark` overrides, and `--rf-scrollbar-hit-size` touch grab (pure-CSS thumb `::before` widening to `max(track-size, 24px)` on coarse pointers; no `ReactFlowScrollbars.tsx` change needed). Changeset `minor`. typecheck/lint/unit(27)/build/e2e(7) all green. Pending PR/merge. The empirical touch-operability check is **TODO-2** (now unblocked).

### TODO-2 — a11y verification gate (touch + contrast), build-time

- **What:** Two build-time checks that cannot be closed on paper: (a) verify the 8px-thumb + hit-zone scrollbar is actually **draggable by touch** — drive it with Playwright, **record video**, extract frames (per the owner's animation-verification rule; static `getComputedStyle` won't show grab feel); (b) verify faint text `#71717A` clears **contrast ≥ 4.5:1** in both light and dark modes (lighten the token if it fails).
- **Why:** Thin-scrollbar touch operability and faint-text legibility are the two genuine accessibility risks this design carries. Pass 6 (Responsive/a11y) stays at 6/10 until these are empirically verified — it's the one review dimension a spec alone can't raise.
- **Pros:** Closes the only open a11y gate; turns "specced" into "verified"; protects the first-impression demo from being unusable on touch devices.
- **Cons:** Needs a running site/component to test against, so it can't be done during planning.
- **Context:** Surfaced in design doc §13.3 (touch-target ⚠) + §13.2 (faint-text contrast ⚠) + the GSTACK REVIEW REPORT Pass 6. Owner's testing rule: verify motion/interaction by recorded video → ffmpeg frames, not screenshots. Task rows T11 (touch) + T12 (contrast) in `tasks-design-review-1781602780.jsonl`.
- **Depends on / blocked by:** The docs-site Phase-1 slice OR the library T11 change must be running first (something to test).
