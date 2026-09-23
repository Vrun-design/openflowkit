# State

Plan: `docs/plan/README.md` (untracked, owner's copy). Phases 0–7 done (7b on hold; 6.6, 6.7, 6.10 partly — see Deferred).

## Now
- **Icons from labels DONE 2026-09-23** (opus-5.5, owner ask). `dsl/autoIcon.ts`: curated table, tiers
  tech > platform > concept (head noun) > generic; verb-led or >4-word labels get no concept; every id
  test-resolved. Compile `autoIcons` (app setting, default on) < `icons: auto|off` < `icon: none`;
  inferred id rides `metadata.dsl.autoIcon`, never serialized. Remove per node/selection/diagram
  (`application/dsl/iconCommands.ts`), toast after Generate, headed `auto-icons.spec.ts`. Gaps: headless
  MCP has no resolver so no auto icons; C4 views have no diagram toggle (model text drops directives).
- **Phase 10 — BYOK: 10.1–10.7 DONE 2026-09-22** (deepseek-v4.1). `providers.ts` ten entries /
  three wires; `diagnosis.ts` eight causes; a blocked fetch is told apart by
  `securitypolicyviolation` + `navigator.onLine`, never a TypeError; headed `ai-providers.spec.ts`
  on `e2e/stubProviderServer.mjs`. Decision (a): `connect-src` widens to `https:` + localhost; cost:
  CSP no longer limits exfiltration — accepted (`img-src https:` already allowed beacons).
- **Phase 9 — docs rebuild: 9.1–9.6 DONE 2026-09-23** (opencode/deepseek-v4.1). inventory.json
  (118 rows, evidence file:line, page per shipped feature) + test; prebuild compiles every
  ```` ```openflow ```` block (warning/error/empty frame fails with file:line); a remark plugin
  renders the SVG beside the source; English only, 22 fiction pages deleted, nine groups; all 16
  surviving pages rewritten; keyboard + MCP pages generated from source; app-token palette, real
  landing page, phone-legible examples; Lighthouse 100s at 375px, dark axe 0. 9.6 gate
  `check-docs.mjs` in prebuild (dead link, feature without page, page without feature, broken
  example fail the build; docs job in quality.yml). Dropped docs analytics + posthog-js; lighthouse
  is a docs-site devDep. BYOK page stays provider-agnostic, `partial`. Defects documented,
  not fixed (src/ read-only): chart quadrant labels never parse (W131); `v2Shortcuts.ts:49` says
  Shift+1 is zoom-to-100% while the dispatcher fits the view.
- **Phase 7 — motion export DONE 2026-09-22**: one Timeline feeds preview, stills, SVG, GIF/MP4/WebM.

## Ceilings (`// ponytail:` in code)
- Whole SVG re-emitted per export; chart/ink/image/annotation/text node sends every frame to the
  SVG raster. GIF: 256 colours, ≤ 20 fps, no custom keyframes (phase 8).
- `agent-live`/phase-7 `frame.test.ts` flake under load, pass alone; frames and icons export plain.

## Next — owner's order, 2026-09-22
- **On hold**: phase 7b film look, phase 8 keyframes/Present. Phase 6 leftovers: 6.6
  frames/tools, 6.7 wireframe, 6.10 VoiceOver sweep + export diff.
## Deferred
- PDF = print dialog; no zip; bridge is long-poll; chart data panel commits per blur; image
  aspect lock is Shift-lock; V2Settings caption says Alt for snap bypass (dispatcher reads ⌘).
