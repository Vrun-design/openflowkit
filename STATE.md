# State

Plan: `docs/plan/README.md` (untracked, owner's copy). Phases 0–7 done (7b on hold; 6.6, 6.7, 6.10 partly — see Deferred).

## Now
- **Icons from labels DONE 2026-09-23** (opus-5.5, owner ask). `dsl/autoIcon.ts` curated table (tech >
  platform > concept head noun > generic; verb-led/long labels no concept), every id test-resolved.
  `autoIcons` (setting, default on) < `icons: auto|off` < `icon: none`; inferred id in
  `metadata.dsl.autoIcon`, never serialized; a rename re-infers. Remove per node/selection/diagram,
  C4 via the model (`ArchModel.icons/palette` now survive regenerated text). `dsl/iconMatch.ts` is the
  one id→icon rule for editor + MCP; MCP manifest adds Tabler, file host infers too. Exports inline
  art via `v2IconArt.ts` (SVG/PNG/PDF/motion). Headed `auto-icons.spec.ts`. Gap: headless MCP SVG
  export has no art (package ships no SVGs).
- **Phase 10 — BYOK: 10.1–10.7 DONE 2026-09-22** (deepseek-v4.1). `providers.ts` ten entries /
  three wires; `diagnosis.ts` eight causes; a blocked fetch is told apart by
  `securitypolicyviolation` + `navigator.onLine`, never a TypeError; headed `ai-providers.spec.ts`
  on `e2e/stubProviderServer.mjs`. Decision (a): `connect-src` widens to `https:` + localhost; cost:
  CSP no longer limits exfiltration — accepted (`img-src https:` already allowed beacons).
- **Polish pass 2026-09-23** (opus-5.5): Arrow draws straight (`direct`), Elbow is its own pick;
  rail flyouts keep one icon and open on click (the letter re-arms). Export matches the canvas:
  labels in `nodeLabelBounds`, icon plates, connector label plates, dark backdrop #191b19, dark-canvas
  frames a 0.08 wash. Docs in app tokens + real screenshot (`docs-site/scripts/capture-screens.mjs`,
  rerun on chrome change); gate checks assets. Fixed quadrant labels + Shift+1 label.
- **Phase 9 — docs rebuild DONE 2026-09-23**: inventory.json + test; prebuild compiles every
  ```` ```openflow ```` block; `check-docs.mjs` fails dead links/assets, unbacked pages, bad examples.
- **Phase 7 — motion export DONE 2026-09-22**: one Timeline feeds preview, stills, SVG, GIF/MP4/WebM.

## Ceilings (`// ponytail:` in code)
- Whole SVG re-emitted per export; chart/ink/image/annotation/text node sends every frame to the
  SVG raster. GIF: 256 colours, ≤ 20 fps, no custom keyframes (phase 8).
- `agent-live`/phase-7 `frame.test.ts` flake under load, pass alone; frames export plain.

## Next — owner's order, 2026-09-22
- **On hold**: phase 7b film look, phase 8 keyframes/Present. Phase 6 leftovers: 6.6
  frames/tools, 6.7 wireframe, 6.10 VoiceOver sweep + export diff.
## Deferred
- PDF = print dialog; no zip; bridge is long-poll; chart data panel commits per blur; image
  aspect lock is Shift-lock.
