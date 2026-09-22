# State
Plan: `docs/plan/README.md` (untracked, owner's copy). Phases 0–7 done (7b on hold; 6.6, 6.7, 6.10 partly — see Deferred).

## Now
- **Phase 9 — documentation rebuild: 9.1 DONE 2026-09-22** (opencode/deepseek-v4.1; order
  9.1 → 9.6). `docs-site/inventory.json` = the feature truth: 115 rows, every `shipped` row
  carries file:line, absence is explicit (collaboration/share, infra-sync, flowpilot, GitHub
  embed, 6.6/6.7, slides/Present, keyframes, command center, diff, snapshots, structured
  imports, Figma, lint rules, design systems, hand-drawn ink, canvas re-layout). `partial`:
  PDF (print dialog), drift (name+tech), BYOK (frozen until phase 10), canvas perf.
  `docs-site/inventory.test.ts` proves evidence files exist and that every `v2Shortcuts.ts`
  row, every agent op and every implemented/reserved family is claimed.
  Next 9.2: compile every ```` ```openflow ```` block with the real parser + `canonicalSvg` at
  docs build time; a broken block fails the docs build naming file and line.
- **Phase 7 — motion export: DONE 2026-09-22.** One pure Timeline feeds the preview, the stills,
  the animated SVG and every video frame; GIF/MP4/WebM encode in a worker; MCP `export` serves
  all four plus `svg-animated`. 7.8: the worker paints plain pages itself (500 nodes × 451
  frames @1080p30: 30.7 s → 3.1 s wall). Unknown: a 500-node export on a slower machine.
- **Coverage sweep 2026-09-22** (Opus 5): `e2e/arrange|clipboard|transform|waypoints.spec.ts`;
  fixed locked nodes moving via `buildMoveNodesCommand` and the cheatsheet's Alt-vs-⌘ snap claim.

## Ceilings (`// ponytail:` in code)
- Whole SVG re-emitted per export; one `@keyframes` per element (~1 MB at 500 nodes).
- Any chart, ink, image, annotation or text node sends every frame back to the SVG raster.
- GIF: 256 colours, ≤ 20 fps, palette from the finished diagram. No custom keyframes, camera
  paths, audio or per-element timing (phase 8).
- `agent-live` flaked once in three full headed sweeps and passes alone; cause unconfirmed.
- Docs carry sentence-level fiction until phase 9 deletes it (e.g. `choose-export-format` still
  offers share/embed); 9.1's inventory is what finds the rest.
## Next — owner's order, 2026-09-22
- **Phase 9** as above. **Phase 10 — BYOK** (`docs/plan/phase-10-byok.md`): CSP omits NVIDIA and
  localhost so those calls are blocked by our own header, and still allows posthog and
  `signaling.yjs.dev` against a no-telemetry promise.
- **On hold**: phase 7b film look, phase 8 keyframes/Present. Both specs stay written.
- Phase 6 leftovers: 6.6 frames/tools, 6.7 wireframe, 6.10 VoiceOver sweep + export diff.

## Deferred
- PDF = print dialog; no zip export; bridge is long-poll; chart data panel commits per blur;
  image aspect lock is Shift-lock; V2Settings still captions Alt for snap bypass (dispatcher reads ⌘).
