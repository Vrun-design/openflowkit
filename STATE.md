# State

Plan: `docs/plan/README.md` (untracked, owner's copy). Phases 0–7 done (7b on hold; 6.6, 6.7, 6.10 partly — see Deferred).

## Now
- **Phase 11 — assistant is a conversation DONE 2026-09-23** (opus-5.5). Talks or draws; sees every
  diagram in scope (page/selection chip, `assistantContext.ts`); SSE + thinking on 3 wires; edit/retry/
  copy/report(GitHub issue); multi-diagram rows chain (`assistantChanges.ts`); 503/429 retry once.
  **11b**: native tool calls on all 3 wires (`assistantAgent.ts` loop ≤ 8 rounds, `assistantTools.ts`:
  reads via agent ops, writes compile → queue for review; Claude/Gemini signatures replayed); a 400 falls
  back to ```` ```openflow ```` blocks. Past chats per doc (`assistantChats.ts`, ≤ 30, images dropped
  first on quota); images attach/paste/drop (`assistantImages.ts`). Live-checked on Gemini flash-lite.
- **Icons from labels DONE 2026-09-23**: `dsl/autoIcon.ts` table; `autoIcons` setting < `icons:` <
  `icon: none`; inferred id in `metadata.dsl.autoIcon`, never serialized. `dsl/iconMatch.ts` is the one
  id→icon rule (editor + MCP); exports inline art (`v2IconArt.ts`). Gap: headless MCP SVG has no art.
- **Phase 10 — BYOK: 10.1–10.7 DONE 2026-09-22** (deepseek-v4.1). `providers.ts` ten entries /
  three wires; `diagnosis.ts` eight causes; a blocked fetch is told apart by
  `securitypolicyviolation` + `navigator.onLine`, never a TypeError; headed `ai-providers.spec.ts`
  on `e2e/stubProviderServer.mjs`. Decision (a): `connect-src` widens to `https:` + localhost; cost:
  CSP no longer limits exfiltration — accepted (`img-src https:` already allowed beacons).
- **Polish pass 2026-09-23**: Arrow straight, Elbow its own pick; export matches canvas (label bounds,
  plates, dark backdrop). Docs screenshots: `docs-site/scripts/capture-screens.mjs`, rerun on chrome change.
- **BYOK dialog 2026-09-23**: model ids verified vs provider docs (re-check each release); a key per
  provider (`connections`, legacy migrates); marks are `currentColor` masks; hosted budget 16k.
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
