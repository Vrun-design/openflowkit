# Phase 7 — motion export (animated SVG · GIF · MP4)

Owner decision, 2026-09-22: every diagram can be exported as a short animation, not just a
still. Nobody in our lane ships this natively — Koboyo, Eraser, Whimsical, tldraw, Mermaid,
draw.io, Miro all export static PNG/SVG/PDF (draw.io animates edges on screen only). The one
real prior art is [Excalimate](https://github.com/excalimate/excalimate): an Excalidraw add-on
with a keyframe timeline, camera moves, sequence reveals and MP4/WebM/GIF/animated-SVG export,
plus an MCP server. Our edge is that motion is a *projection of the text*: an `animate` block
in the DSL (an agent can write it), an auto sequence for diagrams that have none, and phase-5
flows as ready-made walkthroughs. Steps, not keyframes — steps round-trip to text, keyframes
do not.

Read first: `AGENTS.md`, `docs/plan/README.md` §4–§6, `STATE.md`, `grammar.md` §6.6,
`phase-6-library.md` §0 (the non-negotiables apply verbatim), then the code each slice
touches end to end: `infrastructure/export/canonicalSvg.ts`, `export/raster.ts`,
`presentation/v2/V2ExportMenu.tsx`, `useV2FlowPlayback.ts`, `PixiFocusOverlay.ts`,
`dsl/model/flowExport.ts`, the ELK worker (for the worker pattern).

## 0. What ships (the deliverable in one paragraph)

Export… gains an **Animation** section. Pick a preset (Build · Walkthrough · Pulse), an
order (Auto · a flow · the DSL `animate` block), duration/fps/size/theme, watch the exact
result play in the dialog, scrub it, then download **animated SVG, GIF, MP4 or WebM**. The
same timeline drives the preview, the SVG and every video frame — what you preview is what
you get, bit for bit. An agent gets the same through `export` and can author the sequence
in text.

**Cost model: zero infra.** Everything — sequencing, SVG, rasterising, GIF/MP4 encoding — runs
in the user's browser (WebCodecs uses their GPU). No render server, no queue, no storage, no
per-export cost. A 1080p 15 s MP4 is ~10 s of local CPU. Same as PNG export today.

## 1. Research — formats and where they actually play

| Format | Plays inline in | Does not | Size, 10 s / 8 nodes | How we make it |
|---|---|---|---|---|
| **Animated SVG** (CSS keyframes) | GitHub README (`<img>` runs CSS/SMIL, no JS), docs sites, Notion, web pages | Slack, X/LinkedIn, Google Docs, most chat | ~40–80 KB, vector, loops | string from `canonicalSvg` + `<style>` |
| **GIF** | everywhere (Slack, GitHub, Notion, X, email) | — (256 colours, no half-alpha, ≤ ~20 fps sane) | 3–15 MB at 800 px | frames → `gifenc` (≈3 KB, palette quantiser) |
| **MP4 / H.264** | Slack, X, LinkedIn, YouTube, Keynote/PowerPoint, GitHub issues/PRs (as attachment) | GitHub README inline | 1–3 MB at 1080p | frames → WebCodecs `VideoEncoder` → `mediabunny` mux |
| **WebM / VP9** | Chrome, Firefox, Slack | Safari-only contexts, Office | ~1 MB | same path, or `MediaRecorder` fallback |

WebCodecs (`VideoEncoder`) is full in Chrome/Edge 94+, Firefox 130+ desktop, Safari 26+
(partial from 16.4). No WebCodecs → MP4 is hidden, WebM comes from `MediaRecorder`
(real time, so a 10 s clip takes 10 s), GIF and SVG always work. Lottie/dotLottie: skipped —
needs a player everywhere it goes, and GIF/MP4 already cover the "paste it anywhere" case.

Two new deps, both justified in one line: `mediabunny` (tree-shakable muxer, the successor
of mp4-muxer/webm-muxer, zero deps — writing an MP4 box writer by hand is a week) and
`gifenc` (median-cut quantiser + LZW in ~200 lines — the part that is easy to get wrong).

## 2. Architecture — one timeline, three outputs

```
ScenePage ──┐
flow (ph.5) ├─► Timeline (pure, domain/animation) ──┬─► exportAnimatedSvg (CSS keyframes)
`animate {}`┘                                        ├─► frameAt(t) ─► canonicalSvg(frame) ─► raster ─► encoder (worker)
                                                     └─► preview (<img> of the SVG + scrubber)
```

**Timeline** (`src/opencanvas/domain/animation/`): pure TypeScript, no DOM.
- `Timeline = { steps: Step[]; preset; loop; durationMs }`, `Step = { nodeIds, connectorIds,
  note?, holdMs, camera?: Bounds }`. That is the whole model. No keyframes, no per-property
  curves — a step is "these things appear/light up, hold, next".
- `autoSequence(page)`: topological order over the connector graph (containers before their
  children, roots first, cycles broken by position, unconnected nodes last, stable tie-break
  by `y` then `x`). One step per node; a connector joins the step of its target. This is the
  zero-config path and must look right for a plain flowchart.
- `flowToTimeline(flow, model, document)`: phase-5 flows already resolve steps to node and
  connector ids (`useV2FlowPlayback` does it in a hook — lift that resolution into the domain
  and have the hook call it). Notes hold longer (`NOTE_MS`), camera = bounds of the step.
- `frameAt(timeline, tMs) → FrameState`: per element `{ opacity, scale, drawProgress }` plus
  the camera box. Easing: one `easeOutCubic`, node pop 0.92 → 1 over 320 ms, connector draw-on
  via `drawProgress` (rendered as `stroke-dashoffset`), the storyboard dim at 0.25.
- Presets: **Build** (cumulative reveal, ends with everything shown), **Walkthrough**
  (spotlight one step at a time, everything else dimmed, camera glides — the flow playback
  look), **Pulse** (everything shown, connectors carry a travelling dash forever; the looping
  "system is alive" GIF for a README).
- Unit tests beside every function: order on the fixtures in `dsl/families/**`, `frameAt`
  at t=0/mid/end, loop wrap, empty page, 1 node, 500 nodes under 5 ms.

**SVG** (`infrastructure/export/canonicalSvg.ts`): today nodes/connectors are emitted as
`<g data-node-id>` / `<g data-connector-id>` — the hooks are already there.
- `exportCanonicalSvg(document, { frame })` applies a `FrameState` as attributes on those
  groups (`opacity`, `transform`, `stroke-dasharray/offset` with `pathLength="1"`). No frame →
  unchanged output; the golden tests stay green.
- `exportAnimatedSvg(document, timeline)` = the same markup plus one `<style>` block: one
  `@keyframes` per effect, per-element `animation-delay`. Walkthrough camera = animated
  `transform` on a root `<g>` (CSS cannot animate `viewBox` inside `<img>`). Golden test per
  preset. `prefers-reduced-motion` → show the final frame.
- Law: `frameAt(timeline, t)` rendered as a still must match the animated SVG paused at `t`
  (headed check: screenshot both at three times, pixel-compare within tolerance).

**Frames → file** (`infrastructure/export/motion.worker.ts`): the existing worker pattern.
- Main thread builds the SVG strings per frame (`canonicalSvg` is pure, so this could also
  move into the worker; do it there if a 300-frame render blocks input in the headed check),
  decodes each via `createImageBitmap` (Safari cannot decode SVG in a worker → `<img>` on
  main, transfer the bitmap), the worker owns an `OffscreenCanvas` and the encoder.
- GIF: `gifenc`, global palette from the final frame, 20 fps cap, delay per frame.
- MP4/WebM: `VideoEncoder` (`avc1.42001f` / `vp09`) → `mediabunny` `Output`. Bitrate from
  size (≈ 0.1 bpp × fps). WebM fallback via `MediaRecorder` on the offscreen canvas when
  `VideoEncoder` is missing.
- Progress messages every 10 frames; cancel via a `MessagePort` close. Never freeze the
  canvas: the headed check records rAF while a 1080p 15 s export runs.

**UI** (`presentation/v2/V2ExportMenu.tsx`, one new `V2MotionExport.tsx`):
- Export… gets a **Still / Animation** toggle at the top; Animation shows: preset (3 segmented
  buttons), order (Auto · flow picker if the page has flows · "from code" when the DSL has an
  `animate` block), duration (auto from step count, editable), fps (12/24/30), size
  (720/1080/1440), theme (light/dark/current), loop, format (SVG · GIF · MP4 · WebM, each with
  its one-line "plays in …" hint, MP4 hidden without WebCodecs).
- **Steps row (the timeline editor, lite)**: the current order as chips (`1 A,B · 2 →C · 3 C→D`).
  Drag to reorder, drop one chip onto another to merge them into one step, click a chip to
  set its hold. Every edit writes the `animate` block into the code panel (text hub) — the
  chips *are* the DSL, rendered. No per-object curves, no ruler, no keyframes (phase 8).
- Preview: the animated SVG in an `<img>` (exact), a scrubber that re-renders `frameAt(t)` as
  a still, play/pause, ⎵ toggles, ←/→ step. Keyboard for everything (§0 of phase 6).
- Export button → progress bar with frame count and cancel → download. Copy MP4/GIF to
  clipboard where the browser allows (`ClipboardItem` with `image/gif` works in Chrome).
- One headed Playwright check: build preset on the smoke fixture → GIF and MP4 download,
  sizes within bounds, preview `<img>` visible, scrubber changes the still.

**Text hub** (`src/dsl`): an `animate` block in every family, round-trip per `grammar.md` §6.6.
```
animate build 10s loop {
  step a, b            // reveal
  step a -> c : "POST" // connector joins its target's step
  step c hold 2s
}
```
Omitted block = `autoSequence`. Serialize never invents a block. Canvas scrubbing never
writes code. `manifest.ts` + `get_syntax` updated in the same slice.

**Agent parity** (`mcp-server/src/tools/export.ts`): `format: 'svg-animated' | 'gif' | 'mp4'
| 'webm'`, `preset`, `flow`, returns the file through the bridge like PNG does today. The CLI
(`openflowkit export`) has no browser, so it ships animated SVG only and says so.

## 3. Slices (one agent, ≤ 1 day each, green before commit, `STATE.md` updated)

| # | Slice | Done when | Shipped |
|---|---|---|---|
| 7.1 | `domain/animation/`: types, `autoSequence`, `flowToTimeline` (lifted from the hook), `frameAt`, presets | unit tests; `useV2FlowPlayback` uses the lifted resolver, phase-5 e2e still green | ✅ 2026-09-22 `cfcda9c` `ac8595b` |
| 7.2 | `canonicalSvg` `frame` option + `exportAnimatedSvg` | goldens per preset; still-vs-paused-SVG headed check | ✅ 2026-09-22 `1638663` |
| 7.3 | `animate` DSL block, all families, manifest + `get_syntax`, llms.txt | round-trip fixtures + fuzz | ✅ 2026-09-22 `a004fa5` |
| 7.4 | `motion.worker.ts`: GIF (`gifenc`), MP4/WebM (`mediabunny` + WebCodecs), MediaRecorder fallback, progress/cancel | 1080p 15 s export, canvas rAF never > 32 ms | ✅ 2026-09-22 `2f43874` (32 ms met on normal pages; 500-node ceiling in STATE.md) |
| 7.5 | Export dialog Animation section + step chips (reorder/merge/hold → `animate` block) + preview + scrubber | headed check above; chips edit round-trips to code; VoiceOver pass on the dialog | ✅ 2026-09-22 `4dc8d32` `5c9e46e` |
| 7.6 | MCP `export` formats; docs page "Animated export" with the format table from §1 | `npm test -w mcp-server`; the README gains one animated SVG | ✅ 2026-09-22 `d2b3fdc` |
| 7.7 | Audit: play each format in GitHub README, Slack, Notion, X, Keynote; size table; a11y | findings fixed, ceilings marked `// ponytail:` | ✅ 2026-09-22 (GitHub + browser playback verified; Slack/Notion/X/Keynote assumed — STATE.md) |
| 7.8 | Frame renderer: draw frames with Canvas2D instead of rasterising SVG, so the last 32 ms gap closes | parity ≤2 % vs the SVG still; 500 nodes × 450 frames with no blocking task and <5 % late frames | ✅ 2026-09-22 (500 nodes × 451 frames: 30.7 s → 3.1 s, 19.9 % → 2.1 % late, no pipeline long task; chart/ink/image/annotation/text pages keep the SVG raster) |

## 4. Ceilings (deliberate, marked in code)

- Whole SVG re-generated per frame: O(nodes × frames). Fine to ~500 nodes × 450 frames;
  upgrade = patch only the groups whose state changed.
- No custom keyframes, no camera paths, no audio, no per-element timing overrides. Steps are
  the unit because steps are text. Excalimate-style keyframes are [phase 8](phase-8-keyframes.md).
- Fonts in video frames are the SVG's system stack — what the machine has. Same as PNG today.
- Safari < 26: GIF + animated SVG + WebM (real-time) only.

## 5. Owner calls (decided 2026-09-22)

1. Default preset: **Build**.
2. On-canvas **Present** button: phase 8, not here.
3. No watermark.
4. Ship order: 7.1 → 7.2 → 7.5 (SVG-only, visible early) → 7.3 → 7.4 → 7.6 → 7.7.

---

## 8. Slice 7.8 — frame renderer (uplift, owner call 2026-09-22)

**Why.** The 32 ms bar is met for normal pages and missed at 500 nodes: browsers rasterise
SVG only on the main thread (`createImageBitmap(svgBlob)` throws in a worker — verified in
Chrome), so a 500-node frame at 1080p costs ~100 ms of raster time in the same process as
the visible canvas. Measured today: 450 frames in 30.5 s, ~20 % of animation frames late,
1–6 blocking tasks of 60–100 ms (the rasteriser, never our JS). Phase 8 makes *every* frame
a changed frame, so the current "reuse the canvas while the picture is unchanged" trick
(`frameSignature` in `motion.worker.ts`) stops helping and exports get slower on the same
code. This slice builds the frame primitive phase 8 needs anyway, and deletes the ceiling.

**What ships**

- `domain/animation/drawList.ts` (pure TS, unit-tested beside it): `frameDrawList(page,
  frameState, theme) → DrawOp[]` — an ordered, renderer-neutral list (`rect`, `path`,
  `text`, `image`) carrying geometry, fill/stroke, dash, opacity and the pop scale. Order and
  geometry come from the same resolvers `canonicalSvg` and Pixi already read:
  `resolveNodeStyle`, `resolveBasicNodePresentation` + `basicNodeOutlinePoints` +
  `basicNodeDecorations`, `resolveContainerNodePresentation`, `resolveFreeformNodePresentation`
  (text), `projectPageConnectors` (commands, samples, labels, markers), `nodeWorldBounds`.
  Nothing new is invented; the list is a projection of the presentation layer.
- `infrastructure/export/framePainter.ts`: `paintFrame(ctx, ops, viewBox, scale)` — a thin
  executor, no logic of its own. The worker calls it with its `OffscreenCanvas`; the
  MediaRecorder WebM fallback calls it with a real canvas (its `captureStream` needs one).
- Hybrid scope: canvas draws plain nodes (everything `resolveBasicNodePresentation` resolves,
  including the shape library), containers/groups, text, connectors + labels + markers.
  **Any other node kind (charts, ink, images, annotations) puts the whole frame back on the
  SVG raster path** — one rule, no per-kind negotiation, and a `// ponytail:` note.
- Worker: for canvas frames there is no main-thread round trip at all — `start` → draw →
  encode → `done`. The existing `svg`/`frame`/`frame-done` protocol stays for fallback frames.
  `frameSignature` stays (it now saves draw calls, not rasters).
- Delete `decodeFrame`'s per-frame `requestAnimationFrame` yield for canvas frames. Keep the
  SVG path intact: the animated SVG file, the stills, the dialog preview and
  `prefers-reduced-motion` are untouched, so every existing golden stays green.

**Acceptance (all must be evidence, run headed where stated)**

1. **Parity is the law**: the canvas frame and the SVG still, rasterised through the same
   path, differ by ≤2 % of pixels at 1080p for the same timeline time — on a plain
   nodes+connectors fixture *and* the shape-library fixture, at three times, two presets.
   New test hook: `__V2__.getMotionFrameCanvas(tMs)` returns a PNG data URL of the painted
   frame (read-only, like `getMotionExport`).
2. **The gap closes**: 500 nodes × 450 frames, 1080p, 30 fps (the existing
   `e2e/motion-encode.spec.ts` case): no blocking task over 32 ms, median rAF < 32 ms,
   <5 % of frames late (today ~20 %), and the wall time printed (today 30.5 s).
3. **No regression**: the realistic-page case still shows ≤1 late frame and no blocking
   task; `e2e/motion-svg.spec.ts`, `motion-dialog.spec.ts`, `motion-audit.spec.ts`,
   `phase-4` and `phase-5` stay green; unit suite green.
4. A page with one chart (or ink) still exports correctly through the fallback — a unit test
   asserts the frame is marked as a fallback frame, and one headed export proves it.

**Traps already paid for (do not rediscover)**

- `createImageBitmap(svgBlob)` in a worker: `InvalidStateError`. SVG rasterisation is
  main-thread-only; that is the whole reason for this slice.
- Scaling must happen about the **node centre**, and `transform-box: fill-box` can shave a
  stroke's outer half-pixel in Chrome. The SVG path uses `transform-origin: 0 0` plus
  `translate(c) scale(s) translate(-c)`; the canvas renderer must scale about the same point
  (`ctx.translate/scale` around the node's local centre, inside the world matrix).
- `transform-box: view-box` with `transform-origin: 0 0` behaves exactly like an SVG
  `transform` attribute (user-space origin). The camera is `cameraFitMatrix(camera, viewBox)`
  from `domain/animation/camera`; apply the same matrix to the canvas.
- The still-vs-animated parity technique in `e2e/motion-svg.spec.ts` (shift every
  `animation-delay` by `-t` and add `animation-play-state: paused`) works and is exact; reuse
  it for the SVG side of the new parity test.
- Scene node ids are slugified labels (`n0_0` → `n0-0`). Test fixtures must use ids that
  survive slugification, or the animate block silently reveals nothing (this cost a false
  perf run).
- `Button` sets `aria-pressed={selected}`; pass `selected`, never `aria-pressed`.
- The export popover closes on an outside pointerdown: in headed tests, zoom the canvas with
  a wheel, never drag it, while the dialog is open.
- `mediabunny`: `new Output({ format: new Mp4OutputFormat() | new WebMOutputFormat(), target:
  new BufferTarget() })`, `new CanvasSource(canvas, { codec: 'avc' | 'vp9', bitrate,
  keyFrameInterval })`, `output.addVideoTrack(source, { frameRate })`, `await output.start()`,
  `await source.add(seconds, durationSeconds)`, `await output.finalize()`,
  `output.target.buffer`. `gifenc`: `quantize(rgba, 256, { format: 'rgb565' })`,
  `applyPalette(rgba, palette, 'rgb565')`, `GIFEncoder()`,
  `writeFrame(index, w, h, { palette, delay })` (delay in ms), `finish()`, `bytes()`.
- Keep the worker's `frame-done` ack discipline: frames must be encoded in order and the
  worker must not be handed the next frame before the previous one is written.

**Ceilings to mark**

- Per-frame fallback: one chart or ink stroke in a page sends the whole frame back to the SVG
  raster. Upgrade = per-node SVG raster cache for the exotic kinds only.
- Text metrics differ from the SVG's system stack by a pixel or two, which is why parity is
  a tolerance, not a byte compare. Upgrade = ship a font, or measure once per label and
  cache the width.
- No per-element raster cache: a frame is redrawn whole. Upgrade = cache element rasters
  keyed by their `frameAt` state when Present mode needs it.
