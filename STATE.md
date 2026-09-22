# State

Plan: `docs/plan/README.md` (untracked, owner's copy). Phases 0–6 done (6.6, 6.7, 6.10 partly — see Deferred).

## Now
- **Phase 7 — motion export: DONE 2026-09-22** (opencode/deepseek-v4.1). One pure Timeline
  (`domain/animation`) feeds the preview, stills, animated SVG and every video frame; the
  `animate` block round-trips. GIF/MP4/WebM encode in a worker; MCP `export` serves all four
  plus `svg-animated`. 7.8 paints plain pages in the worker's own canvas: 500 nodes × 451
  frames @1080p30 went 30.7 s → 3.1 s wall. Chart, ink, image, annotation and text pages keep
  the SVG raster. Commits `cfcda9c`…`1ac1a47`. Unknown: a 500-node export on a slower machine.
- **Coverage sweep + 2.0.0 release 2026-09-22** (Claude Opus 5). Specced the editing shortcuts
  nothing exercised — `arrange`, `clipboard`, `transform`, `waypoints` specs on a shared
  `e2e/helpers.ts`. Fixed: `buildMoveNodesCommand` moved locked nodes (keyboard nudge *and* the
  agent `move` op); the cheatsheet said Alt for snap bypass where the code reads ⌘. Untracked
  `docs/`, moved the grammar to `src/dsl/grammar.md` (the app, the MCP package and the docs site
  all build from it), deleted 72MB of unreferenced assets and four docs pages describing features
  that do not exist. Tagged `v2.0.0`; MCP server stays on its own line at 0.2.0.
- Verified: typecheck, lint, 1473 unit tests, 75/75 headed Playwright, app + docs-site builds.

## Ceilings (`// ponytail:` in code)
- Motion: whole SVG re-emitted per export (~1 MB at 500 nodes); dashed connectors fade rather than
  draw on; chart/ink/image/annotation/text pages fall back to the SVG raster (text on purpose — its
  webfont key is invisible to an `<img>` SVG); GIF is 256 colours ≤ 20 fps; steps are text, so no
  keyframes, camera paths or audio until phase 8.
- Four older e2e specs still carry their own `emptyPoint`; fold them into `e2e/helpers.ts` when one
  next needs editing. No coverage for frames/wireframe (6.6/6.7, unbuilt).
- Docs carry sentence-level fiction the page deletions did not reach (e.g. `choose-export-format`
  still offers share/embed). Phase 9.1's inventory is what finds the rest.
- `agent-live` failed once in three full headed sweeps and passes alone every time — a flake under
  two workers, cause unconfirmed (the bridge is long-poll). Capture the error before fixing it.

## Next — owner's order, 2026-09-22
- **Phase 9 — documentation rebuild** (`docs/plan/phase-9-docs.md`, run with
  `prompt-phase-9.md`). Docs regenerated against a verified feature inventory; every example
  compiled by the real parser so a stale page fails the build. English only, `tr/` dropped.
- **Phase 10 — BYOK expansion** (`docs/plan/phase-10-byok.md`, run with `prompt-phase-10.md`).
  Ten providers on three wire formats, and the CSP fixed: `connect-src` omits NVIDIA and
  localhost today, so those calls are blocked by our own header and look exactly like CORS.
  It also still allows posthog and `signaling.yjs.dev` against a no-telemetry promise.
- **On hold** (owner, 2026-09-22): phase 7b film look, phase 8 keyframes/Present. Both specs
  stay written; neither starts until 9 and 10 land.
- Phase 6 leftovers: 6.6 frames/tools, 6.7 wireframe, 6.10 VoiceOver sweep + export diff.

## Deferred
- Phase 6 6.6/6.7 as above; chart data panel commits per blur; image aspect lock is Shift-lock.
- `drift` matches by name/tech only; PDF = print dialog; no zip export; bridge is long-poll.
