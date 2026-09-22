# State

Plan: `docs/plan/README.md` (untracked, owner's copy). Phases 0–7 done (7b on hold; 6.6, 6.7, 6.10 partly — see Deferred).

## Now
- **Phase 9 — documentation rebuild: 9.1–9.4 DONE 2026-09-23** (opencode/deepseek-v4.1;
  9.1 → 9.6). 9.1 inventory.json (115 rows; shipped rows carry file:line evidence and a page)
  + inventory.test.ts. 9.2 prebuild compiles every ```` ```openflow ```` block through the real
  compiler; any warning, error or empty frame fails with file:line; a remark plugin renders
  the SVG beside its source, light/dark. 9.3 English only (tr/ deleted), 22 fiction pages
  deleted, nine sidebar groups, zero missing links. 9.4 all 16 surviving pages rewritten
  against the inventory; keyboard page generated from `v2Shortcuts.ts`, MCP chapter from the
  manifest + tool registrations (arguments, modes, resources); 32 pages build.
  Defects found, documented, not fixed (src/ read-only): chart quadrant `x:`/`y:`/`quadrants:`
  never parse (W131) and `v2Shortcuts.ts:49` labels Shift+1 "Zoom to 100%" while the
  dispatcher fits the view; the generated keyboard page corrects that row and names it.
  Next 9.5: Starlight theme override, real landing page (index.astro is a redirect today),
  phone-legible SVGs; then 9.6 the four-failure gate.
- **Phase 7 — motion export: DONE 2026-09-22.** One Timeline feeds preview, stills, animated
  SVG and every frame; GIF/MP4/WebM encode in a worker; MCP `export` serves all four plus
  `svg-animated`; the worker paints plain pages itself (500 nodes × 451 frames: 30.7→3.1 s).
- **Coverage sweep 2026-09-22** (Opus 5): `e2e/arrange|clipboard|transform|waypoints.spec.ts`;
  fixed locked nodes moving via `buildMoveNodesCommand`. `agent-live` flaked once in three
  full headed sweeps and passes alone; cause unconfirmed.

## Ceilings (`// ponytail:` in code)
- Whole SVG re-emitted per export; one `@keyframes` per element; chart, ink, image, annotation
  and text nodes send every frame back to the SVG raster; GIF is 256 colours at ≤ 20 fps; no
  custom keyframes, camera paths or audio (phase 8); `browser`/`mobile` frames and icon packs
  draw in the app but export as plain cards.

## Next — owner's order, 2026-09-22
- **Phase 9** as above. **Phase 10 — BYOK** (`docs/plan/phase-10-byok.md`): CSP omits NVIDIA and
  localhost so those calls are blocked by our own header, and still allows posthog and
  `signaling.yjs.dev` against a no-telemetry promise.
- **On hold**: phase 7b film look, phase 8 keyframes/Present. Phase 6 leftovers: 6.6
  frames/tools, 6.7 wireframe, 6.10 VoiceOver sweep + export diff.

## Deferred
- PDF = print dialog; no zip; bridge is long-poll; chart data panel commits per blur; image
  aspect lock is Shift-lock; V2Settings caption says Alt for snap bypass (dispatcher reads ⌘).
