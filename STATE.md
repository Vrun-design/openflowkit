# State

Plan: `docs/plan/README.md` (untracked, owner's copy). Phases 0–7 done (7b on hold; 6.6, 6.7, 6.10 partly — see Deferred).

## Now
- **Phase 9 — documentation rebuild: 9.1 + 9.2 DONE 2026-09-22** (opencode/deepseek-v4.1; order
  9.1 → 9.6). 9.1: `docs-site/inventory.json` — 115 rows, every shipped row carries file:line,
  absent rows name what is missing (collaboration/share, infra-sync, flowpilot, GitHub embed,
  6.6/6.7, slides/Present, keyframes, command center, diff, snapshots, structured imports,
  Figma, lint rules, design systems, hand-drawn ink, canvas re-layout); `partial`: PDF, drift,
  BYOK, canvas perf. `inventory.test.ts` enforces evidence files and shortcut/op/family cover.
  9.2: prebuild compiles every ```` ```openflow ```` block through the real compiler and
  `exportCanonicalSvg` (`docs-site/scripts/build-examples.mts`); any warning, error or empty
  frame fails the build with file:line. `remark-openflow-examples.mjs` puts the SVG beside its
  source, light/dark. `tsx` (already a repo dev dep) runs it; docs-site tsconfig gains `@/*`.
  Next 9.3: sidebar IA, then delete/rewrite pages against the inventory.
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
- Docs carry sentence-level fiction until phase 9 deletes it; the inventory is the list.

## Next — owner's order, 2026-09-22
- **Phase 9** as above. **Phase 10 — BYOK** (`docs/plan/phase-10-byok.md`): CSP omits NVIDIA and
  localhost so those calls are blocked by our own header, and still allows posthog and
  `signaling.yjs.dev` against a no-telemetry promise.
- **On hold**: phase 7b film look, phase 8 keyframes/Present. Both specs stay written.
- Phase 6 leftovers: 6.6 frames/tools, 6.7 wireframe, 6.10 VoiceOver sweep + export diff.

## Deferred
- PDF = print dialog; no zip export; bridge is long-poll; chart data panel commits per blur;
  image aspect lock is Shift-lock; V2Settings caption says Alt for snap bypass (dispatcher reads ⌘).
