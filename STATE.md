# State

Plan: `docs/plan/README.md` (untracked, owner's copy). Phases 0–7 done (7b on hold; 6.6, 6.7, 6.10 partly — see Deferred).

## Now
- **Phase 10 — BYOK: 10.1–10.7 DONE 2026-09-22** (deepseek-v4.1). `providers.ts` ten entries /
  three wires; `provider.ts` Anthropic + OpenAI (eight providers, quirks as fields) + Gemini
  generateContent; `diagnosis.ts` eight causes, one sentence + one action each, and a rejected
  fetch is told apart by `securitypolicyviolation` (read one macrotask later) vs `navigator.onLine`
  — never a TypeError. Dialog: ten marks, risk badge, console link, Test key, Clear all keys.
  `e2e/stubProviderServer.mjs` + headed `e2e/ai-providers.spec.ts` prove all three wires with no
  real provider. **Decision (a): `connect-src` widens to `https: http://localhost:*
  http://127.0.0.1:* ws://localhost:*`; cost: the CSP no longer limits exfiltration targets.**
  Accepted: `img-src … https:` already allowed beacons anywhere and inline/eval had already
  neutered CSP against XSS, so it never guarded the key; dropped posthog, yjs, dead wss.
- **Phase 9 — docs rebuild: 9.1+9.2 DONE 2026-09-22** (deepseek-v4.1; next 9.3 sidebar IA).
  9.1 `docs-site/inventory.json` = 115 rows with file:line evidence and named absences
  (collaboration/share, flowpilot, 6.6/6.7, Present, keyframes, canvas re-layout…); 9.2 compiles
  every ```openflow block through the real compiler at prebuild, failing with file:line.
- **Phase 7 — motion export DONE 2026-09-22**: one Timeline feeds preview, stills, SVG and every
  frame; GIF/MP4/WebM in a worker; MCP `export` serves all four plus `svg-animated` (7.8: 500
  nodes × 451 frames 30.7→3.1 s). **Coverage sweep** (Opus 5): four editing specs, locked-node fix.

## Ceilings (`// ponytail:` in code)
- Whole SVG re-emitted per export; any chart/ink/image/annotation/text node sends every frame to
  the SVG raster. GIF: 256 colours, ≤ 20 fps, no custom keyframes (phase 8).
- `agent-live` flaked once in three sweeps, passes alone; cause unconfirmed.
- Docs carry sentence-level fiction until phase 9 deletes it (its inventory is the list).

## Next — owner's order, 2026-09-22
- Phase 9 (9.3+) as above. **On hold**: 7b film look, 8 keyframes/Present.
- Phase 6 leftovers: 6.6 frames/tools, 6.7 wireframe, 6.10 VoiceOver sweep + export diff.

## Deferred
- PDF = print dialog; no zip export; bridge is long-poll; chart data panel commits per blur;
  image aspect lock is Shift-lock; V2Settings captions Alt for snap bypass (dispatcher reads ⌘).
