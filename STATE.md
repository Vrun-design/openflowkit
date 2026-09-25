# State

Plan: `docs/plan/README.md` (untracked, owner's copy). Phases 0–7 done (7b on hold; 6.10 partly — see Deferred).

## Now
- **Motion panel done 2026-09-25 (opencode)**: chip steps restored (Codex's one-step inspector
  reverted by owner); order reads Connections / Custom; a one-line "where it plays" hint sits
  under the format pick; steps live in the shared full-bleed accordion (open ≤12, chips capped
  at 100) and the Connect agent accordions use the same edge-to-edge rows via `--ofk-panel-gutter`.
- **Element export DONE 2026-09-25 (opencode)**: right-click a layer or connection → Export…
  opens the one export panel at Selection; a group/frame/section brings its whole subtree
  (`canonicalSvg.selectedPage` expands via `descendantIds`), a lone connection exports without
  endpoints, a single-element file takes the element's label, PNG/SVG gained Transparent.
  Codex's panel polish on the export panel and animation export was reverted by owner request
  (motion is back to chip steps; export is the plain form); Settings grouping and exclusive
  document popovers kept. `npm run verify` green. Motion stays page-level (owner).
- **Quality gate 2026-09-24**: merge on `npm run verify` (typecheck, lint, unit, headed `@gate`).
  `e2e/test.ts` fails a spec on any uncaught page error; `controls.spec.ts` sweeps every toolbar
  control. e2e is serial. CI: full suite on `v2` push, SwiftShader, minus `@local` (GPU budgets
  + flaky `agent-live`). Tooltip native-title sweep DONE 2026-09-25 (Codex).
- **6.6 + 6.7 More flyout DONE 2026-09-24** (opus-5.5): ⇧S → frame presets + tools (Q/K/X/N),
  35 widgets feeding Pixi + SVG; picks grow the selected frame.
- **Phase 11 — assistant is a conversation DONE 2026-09-23**: talks or draws; sees diagrams in
  scope; SSE + thinking; native tool calls ≤ 8 rounds with review queue; past chats per doc.
- **Icons from labels DONE 2026-09-23**: `dsl/autoIcon.ts` < `icons:` < `icon: none`; one
  id→icon rule (editor + MCP); exports inline art. Gap: headless MCP SVG has no art.
- **Phase 10 — BYOK DONE 2026-09-22**: ten providers / three wires; `diagnosis.ts` causes;
  headed `ai-providers.spec.ts`. CSP `connect-src` = `https:` + localhost (accepted).
- **Phase 9 — docs rebuild DONE 2026-09-23**: inventory.json + test; prebuild compiles every
  openflow block; `check-docs.mjs` fails dead links/assets/unbacked pages.

## Ceilings (`// ponytail:` in code)
- Whole SVG re-emitted per export; chart/ink/image/annotation/text frames rasterized in JS.
  GIF: 256 colours, ≤ 20 fps, no custom keyframes (phase 8). Frames don't clip on export.
- Animation is page-scoped only; element-scoped motion needs a timeline filtered to a subtree.
- Phase-7 `frame.test.ts` flakes under load, passes alone.

## Next — owner's order, 2026-09-22
- **On hold**: phase 7b film, phase 8 keyframes/Present. Phase 6 leftover: 6.10 VoiceOver + export diff.
## Deferred
- Widget text width is estimated; wireframe comments move to the end; PDF = print dialog; no zip;
  bridge is long-poll; chart data panel commits per blur; image aspect lock is Shift-lock.
