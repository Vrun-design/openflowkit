# State

Plan: [docs/plan/README.md](docs/plan/README.md). Phases 0–6 done (6.6, 6.7, 6.10 partly — see Deferred).

## Now
- **Phase 7 — motion export: DONE 2026-09-22** (opencode/deepseek-v4.1, owner's order
  7.1 → 7.2 → 7.5 → 7.3 → 7.4 → 7.6 → 7.7 → 7.8). One pure Timeline (`domain/animation`) feeds the
  preview, the stills, the animated SVG and every video frame; the `animate` block round-trips in
  every family and the chips (drag / merge / hold) write it from the panel. GIF (`gifenc`), MP4/WebM
  (WebCodecs + `mediabunny`) and MediaRecorder WebM encode in a worker; MCP `export` serves all four
  plus `svg-animated`. **7.8 frame renderer**: `domain/animation/drawList.ts` (pure, ordered ops
  from the same resolvers) + `infrastructure/export/framePainter.ts` paint plain pages in the
  worker's own canvas — no main-thread round trip, no rAF yield. 500 nodes × 451 frames @1080p30:
  30.7 s → 3.1 s wall, 19.9 % → 2.1 % late, no pipeline long task. Chart, ink, image, annotation
  and text pages keep the SVG raster.
  Commits: `cfcda9c` `ac8595b` `1638663` `a004fa5` `4dc8d32` `5c9e46e` `2f43874` `d2b3fdc` `1ac1a47`.
- Verified: typecheck, lint, 1472 unit tests; headed `motion-svg` (still vs paused animated, and
  canvas frame vs still ≤2 % pixels: 2 fixtures × 3 presets × 3 times @1080p), `motion-dialog` (3),
  `motion-encode` (5), `motion-audit` (3), `motion-cancel` (1), phase-4/5 (3). GIF animates in
  Chrome, MP4 3.08 s and WebM 2.08 s play real frames. Size table (5 nodes, 10 s): SVG 8.8 KB ·
  GIF 1.8 MB @720p12 / 4.5 MB @1080p24 · MP4 135 KB @720p24 / 249 KB @1080p24 / 357 KB @1440p30.
- Assumed: Slack, Notion, X and Keynote playback (standard formats, no apps here). Unknown: a
  500-node export on a slower machine; the 500-node gate is load-sensitive (under 5 s wall it
  asserts the 5 % late bar, above it reports).

## Ceilings (`// ponytail:` in code)
- Whole SVG re-emitted per export; one `@keyframes` per element (~1 MB at 500 nodes).
- Draw-on needs a unit dash, so dashed connectors fade in. Camera glide sampled every 40 ms.
- One chart, ink stroke, image, annotation or text node sends every frame of that page back to the
  SVG raster: the canvas covers plain shapes, containers and connectors only. Text is excluded on
  purpose — its font key resolves through the document's webfonts, which an `<img>` SVG cannot see.
- GIF: 256 colours, ≤ 20 fps, palette from the finished diagram. Pulse replaces an authored dash.
- No custom keyframes, camera paths, audio or per-element timing: steps are text (phase 8).

## Next
- Phase 8 — keyframes/Present ([phase-8-keyframes.md](docs/plan/phase-8-keyframes.md)) when 7 has users.
- Phase 6 leftovers: 6.6 frames/tools, 6.7 wireframe, 6.10 VoiceOver sweep + export diff.

## Deferred
- Phase 6 6.6/6.7 as above; chart data panel commits per blur; image aspect lock is Shift-lock.
- `drift` matches by name/tech only; PDF = print dialog; no zip export; bridge is long-poll.
