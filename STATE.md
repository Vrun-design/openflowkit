# State

Plan: [docs/plan/README.md](docs/plan/README.md). Phases 0–6 done (6.6, 6.7, 6.10 partly — see Deferred).

## Now
- **Phase 7 — motion export: DONE 2026-09-22** (opencode/deepseek-v4.1, order 7.1 → 7.2 → 7.5 →
  7.3 → 7.4 → 7.6 → 7.7 → 7.8). One pure Timeline (`domain/animation`) feeds the preview, the
  stills, the animated SVG and every video frame; the `animate` block round-trips in every family.
  GIF (`gifenc`), MP4/WebM (WebCodecs + `mediabunny`) encode in a worker; MCP `export` serves all
  four plus `svg-animated`. 7.8: `domain/animation/drawList.ts` + `export/framePainter.ts` paint
  plain pages in the worker's own canvas — 500 nodes × 451 frames @1080p30 went 30.7 s → 3.1 s
  wall, 19.9 % → 2.1 % late. Chart, ink, image, annotation and text pages keep the SVG raster.
  Commits: `cfcda9c` `ac8595b` `1638663` `a004fa5` `4dc8d32` `5c9e46e` `2f43874` `d2b3fdc` `1ac1a47`.
  Assumed: Slack/Notion/X/Keynote playback. Unknown: a 500-node export on a slower machine.
- **Coverage sweep 2026-09-22** (Claude Opus 5). Audited every `v2Shortcuts.ts` row against the
  e2e suite and specced the uncovered user-facing ones: `e2e/arrange.spec.ts` (align, distribute,
  flip, 4 z-order modes), `e2e/clipboard.spec.ts` (duplicate, copy/cut/paste, paste style, nudge,
  lock), `e2e/transform.spec.ts` (resize + Shift aspect, rotate handle, snap + guides + ⌘ bypass),
  `e2e/waypoints.spec.ts` (a dragged segment survives a bound node moving), on a shared
  `e2e/helpers.ts`. Two defects found and fixed: `buildMoveNodesCommand` moved locked nodes
  (keyboard nudge *and* the agent `move` op, while every other builder already consulted
  `buildNodeStateMap`), and the cheatsheet advertised Alt for snap bypass where the dispatcher
  reads ⌘/Ctrl — Alt is resize-from-centre.
- Verified: typecheck, lint, 1473 unit tests, 75/75 headed Playwright in 2.2 min.

## Ceilings (`// ponytail:` in code)
- Whole SVG re-emitted per export; one `@keyframes` per element (~1 MB at 500 nodes).
- Draw-on needs a unit dash, so dashed connectors fade in. Camera glide sampled every 40 ms.
- One chart, ink stroke, image, annotation or text node sends every frame of that page back to the
  SVG raster: the canvas covers plain shapes, containers and connectors only. Text is excluded on
  purpose — its font key resolves through the document's webfonts, which an `<img>` SVG cannot see.
- GIF: 256 colours, ≤ 20 fps, palette from the finished diagram. Pulse replaces an authored dash.
- No custom keyframes, camera paths, audio or per-element timing: steps are text (phase 8).
- Four older e2e specs still carry their own `emptyPoint`; fold them into `e2e/helpers.ts` when one
  next needs editing. No coverage for frames/wireframe (6.6/6.7, unbuilt) or crash recovery.
- `agent-live` failed once in three full headed sweeps and passes alone every time — a flake under
  two workers, cause unconfirmed (the bridge is long-poll). Capture the error before fixing it.

## Next
- Phase 8 — keyframes/Present ([phase-8-keyframes.md](docs/plan/phase-8-keyframes.md)) when 7 has users.
- Phase 6 leftovers: 6.6 frames/tools, 6.7 wireframe, 6.10 VoiceOver sweep + export diff.

## Deferred
- Phase 6 6.6/6.7 as above; chart data panel commits per blur; image aspect lock is Shift-lock.
- `drift` matches by name/tech only; PDF = print dialog; no zip export; bridge is long-poll.
