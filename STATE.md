# State

Plan: `docs/plan/README.md` (untracked, owner's copy). Phases 0–7 done (7b on hold; 6.6, 6.7, 6.10 partly — see Deferred).

## Now
- **Phase 9 — documentation rebuild: 9.1–9.3 DONE 2026-09-22** (opencode/deepseek-v4.1; order
  9.1 → 9.6). 9.1: `docs-site/inventory.json` (115 rows, shipped rows carry file:line) +
  `inventory.test.ts` (evidence files, shortcut/op/family coverage). 9.2: prebuild compiles
  every ```` ```openflow ```` block through the real compiler; any warning, error or empty
  frame fails with file:line; a remark plugin shows the SVG beside its source, light/dark.
  9.3: English only (tr/ + locale config deleted), 22 fiction pages deleted, family pages plus
  mermaid-import / shapes-and-connectors / insert-media / architecture-c4 / architecture-workspace
  added, sidebar has the nine groups and zero missing links (31 routes).
  Defect found, documented, not fixed (src/ is read-only this phase): the chart quadrant labels
  `x:` / `y:` / `quadrants:` never match (chart.ts compares space-joined text) — W131, defaults
  stay. Inventory row `chart-quadrant-labels: absent`. Next 9.4: rewrite the 16 surviving pages
  against the inventory; keyboard page generated from `v2Shortcuts.ts`; BYOK page stays `partial`.
- **Phase 7 — motion export: DONE 2026-09-22.** One pure Timeline feeds preview, stills, animated
  SVG and every video frame; GIF/MP4/WebM encode in a worker; MCP `export` serves all four plus
  `svg-animated`. 7.8: the worker paints plain pages itself (500 nodes × 451 frames: 30.7→3.1 s).
- **Coverage sweep 2026-09-22** (Opus 5): `e2e/arrange|clipboard|transform|waypoints.spec.ts`;
  fixed locked nodes moving via `buildMoveNodesCommand` and the Alt-vs-⌘ cheatsheet claim.

## Ceilings (`// ponytail:` in code)
- Whole SVG re-emitted per export; one `@keyframes` per element (~1 MB at 500 nodes).
- Any chart, ink, image, annotation or text node sends every frame back to the SVG raster.
- GIF: 256 colours, ≤ 20 fps. No custom keyframes, camera paths, audio (phase 8).
- `agent-live` flaked once in three full headed sweeps and passes alone; cause unconfirmed.
- `browser`/`mobile` frame nodes and icon packs draw in the app but export as plain cards.

## Next — owner's order, 2026-09-22
- **Phase 9** as above. **Phase 10 — BYOK** (`docs/plan/phase-10-byok.md`): CSP omits NVIDIA and
  localhost so those calls are blocked by our own header, and still allows posthog and
  `signaling.yjs.dev` against a no-telemetry promise.
- **On hold**: phase 7b film look, phase 8 keyframes/Present. Both specs stay written.
- Phase 6 leftovers: 6.6 frames/tools, 6.7 wireframe, 6.10 VoiceOver sweep + export diff.

## Deferred
- PDF = print dialog; no zip export; bridge is long-poll; chart data panel commits per blur;
  image aspect lock is Shift-lock; V2Settings caption says Alt for snap bypass (dispatcher reads ⌘).
