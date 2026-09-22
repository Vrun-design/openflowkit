# State

Plan: [docs/plan/README.md](docs/plan/README.md). Phases 0–6 done (6.6, 6.7, 6.10 partly — see Deferred).

## Now
- **Phase 7 — motion export: DONE 2026-09-22** (opencode/deepseek-v4.1, one owner, owner's order
  7.1 → 7.2 → 7.5 → 7.3 → 7.4 → 7.6 → 7.7). One pure Timeline (`domain/animation`) feeds the
  preview, the stills, the animated SVG and every video frame. `canonicalSvg` takes a `FrameState`
  plus per-element CSS animations; `exportAnimatedSvg` writes Build / Walkthrough (gliding camera) /
  Pulse as one `<style>` block, `prefers-reduced-motion` leaving a clean still. The `animate` block
  round-trips in every family. Export… → Animation previews the exact file, scrubs stills, plays
  from the playhead, and its chips (drag / merge / hold) write the block into the code panel.
  GIF (`gifenc`), MP4/WebM (WebCodecs + `mediabunny`) and MediaRecorder WebM encode in a worker;
  MCP `export` serves all four plus `svg-animated` from a file host.
  Commits: `cfcda9c` `ac8595b` `1638663` `a004fa5` `4dc8d32` `5c9e46e` `2f43874` `d2b3fdc`.
- Verified by running: typecheck, lint, 1451 unit tests, headed `motion-svg` (still vs paused
  animated, pixel-compared at 3 times × 2 presets), `motion-dialog` (3), `motion-encode` (4: magic
  bytes, size bounds, 500-node rAF), `motion-audit` (3: README asset animates in an `<img>`,
  reduced motion, dialog a11y), phase-5 e2e (2). Files opened and played: GIF animates in Chrome,
  MP4 3.08 s and WebM 2.08 s play real frames. Size table (5 nodes, 10 s): SVG 8.8 KB · GIF 1.8 MB
  @720p12 / 4.5 MB @1080p24 · MP4 135 KB @720p24 / 249 KB @1080p24 / 357 KB @1440p30 · WebM 323 KB.
- Assumed: Slack, Notion, X and Keynote playback (no accounts/apps here; standard formats).
  Unknown: how a 500-node export feels on a slower machine — numbers below are this machine's.
- **Animation UI out of the popover 2026-09-22 (Opus):** it was clipped at the window edge. Now
  a LEFT-slot panel (shares it with the tree) so the code panel the chips write stays visible on
  the right; Export… keeps Still + an "Animate this page…" launcher; preset/preview/transport
  pinned; opens playing (Build starts on an empty canvas, so a paused first frame read as broken;
  reduced motion opens paused); steps-arriving hero when empty. Two older bugs fixed with it: the
  style bar read the root dataset *during render* (a frame stale, sat under a just-opened panel:
  224 px vs 388 px) — now a layout effect; the left slot's width was hardcoded to the tree
  (`--v2-left-width` + `data-left-open` replace `--v2-layers-width` + `data-tree-open`).

## Ceilings (`// ponytail:` in code)
- Whole SVG re-emitted per export; one `@keyframes` per element (~1 MB at 500 nodes).
- Draw-on needs a unit dash, so dashed connectors fade in. Camera glide sampled every 40 ms.
- Browsers rasterise SVG only on the main thread: 500 nodes at 1080p costs ~100 ms per changed
  frame (450 frames in 30 s, ~20 % of animation frames late, 1–6 rasteriser tasks, never our JS;
  a normal page keeps every frame).
- GIF: 256 colours, ≤ 20 fps, palette from the finished diagram. Pulse replaces an authored dash.
- No custom keyframes, camera paths, audio or per-element timing: steps are text (phase 8).

## Next
- Phase 8 — keyframes/Present ([phase-8-keyframes.md](docs/plan/phase-8-keyframes.md)) when 7 has users.
- Phase 6 leftovers: 6.6 frames/tools, 6.7 wireframe, 6.10 VoiceOver sweep + export diff.

## Deferred
- Phase 6 6.6/6.7 as above; chart data panel commits per blur; image aspect lock is Shift-lock.
- `drift` matches by name/tech only; PDF = print dialog; no zip export; bridge is long-poll.
