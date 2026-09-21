# State

Plan: [docs/plan/README.md](docs/plan/README.md). Phases 0–4, one month, no gates.

## Now
- Phase 1 polish pass done 2026-09-21 (Claude Opus 5, on `v2`; slice
  branches `p1-*` and stale `pr-*` worktrees deleted).
- Connectors: sides are dynamic (bind to node, no side ports); orthogonal
  router exits through a 20px stub, prefers the Z lane, treats own nodes as
  obstacles, pulls stubs back in tight packs. Segment drag stores only that
  segment; hybrid routes re-link both ends every frame. Drag-out preview is
  the routed connector. Path: Elbow / Straight / Curve in the style bar.
- Text: Pixi label resolution follows zoom (crisp at 400%). Label editor is
  transparent, zoom-scaled, sits on the label (Pixi copy hidden); Escape
  keeps typed text; text nodes fit content; type-to-edit keeps the seed char.
  Connector label: plate hit-tests as the connector (dbl-click re-edits),
  editor hugs text and hides the Pixi copy.
- Chrome: one blue accent, 1px frames, no double outline; quick-create ghost
  on side-handle hover (handles hover-detected outside node bounds).
- 1.7: ⇧ aspect / ⌥ centre resize, ⌘ suspends snap, ⇧ 15° rotate, ]/[
  z-order, ⌘L lock, ⌘D +20. 1.8: T tool, double-click text, zoomed editing.
- Gate green: 865 unit, 8/8 headed e2e (headless has no WebGL here).

## Next
- Phase 2.1 grammar.md exists (`docs/plan/grammar.md`); owner reviews, then
  parser. Owner feel-test on `/`: quick-create, bend + move, label edit, zoom.

## Deferred (phase 1)
- ⌘G group / ⌘⇧G ungroup: `group` container kind exists but the transform
  snapshot and live preview do not carry descendants; do it with the frame
  work in phase 2 (Generate lands as a frame).
- Rotate handle stem overlaps connectors above a node (tldraw rotates from
  corners); cosmetic.
- Feel probe reports ~260 ms p95 at 512 nodes, but rAF callbacks measure
  4–7 ms with no long tasks during the same drag: the harness (Playwright
  per-event acks) is suspect, not the renderer. Re-instrument before trusting.

## Later
- Phase 5 (month 2): `docs/plan/phase-5-architecture.md` — C4 model layer +
  flows + discover/drift. Structurizr Cloud EOL 30 Sep 2026 = launch window.

## Done
- 2026-09-21: Phase 0 + v2 shell; 1.1–1.6 (Muse Spark); 1.7–1.8 + polish pass.
