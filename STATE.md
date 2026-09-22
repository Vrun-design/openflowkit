# State

Plan: `docs/plan/README.md` (untracked, owner's copy). Phases 0–7 done (7b on hold; 6.6, 6.7, 6.10 partly — see Deferred).

## Now
- **Phase 10 — BYOK: 10.1–10.7 DONE 2026-09-22** (deepseek-v4.1). `providers.ts` ten entries /
  three wires; `provider.ts` Anthropic + OpenAI (eight providers, quirks as fields) + Gemini
  generateContent; `diagnosis.ts` eight causes, one sentence + one action each; a rejected fetch
  is told apart by `securitypolicyviolation` (read one macrotask later) and `navigator.onLine`,
  never shown as a TypeError. Dialog: ten marks, risk badge, Test key, Clear all keys; headed
  `ai-providers.spec.ts` proves all three wires on `e2e/stubProviderServer.mjs`.
  **Decision (a): `connect-src` widens to `https: http://localhost:* http://127.0.0.1:*
  ws://localhost:*`; cost: the CSP no longer limits exfiltration targets.** Accepted because
  `img-src … https:` already allowed beacons anywhere and inline/eval already neutered CSP against
  XSS, so it never guarded the key. Dropped posthog, yjs, dead wss.
- **Phase 9 — docs rebuild: 9.1–9.3 DONE 2026-09-22** (deepseek-v4.1; order 9.1 → 9.6). 9.1
  `inventory.json` (115 rows, evidence file:line) + test. 9.2 prebuild compiles every ```openflow
  block, failing with file:line. 9.3 English only, 22 fiction pages deleted, nine sidebar groups,
  31 routes. Chart quadrant labels never match — documented, not fixed. Next 9.4: rewrite the 16
  surviving pages; BYOK stays `partial`.
- **Phase 7 — motion export DONE**: one Timeline feeds preview, stills, SVG and every frame;
  GIF/MP4/WebM in a worker; MCP `export` all four + `svg-animated`; sweep added four specs.

## Ceilings (`// ponytail:` in code)
- Whole SVG re-emitted per export; chart/ink/image/annotation/text node sends every frame to the
  SVG raster. GIF: 256 colours, ≤ 20 fps, no custom keyframes (phase 8).
- `agent-live` and the phase-7 `frame.test.ts` wall-clock budget (500 nodes < 5 ms) flake under
  load and pass alone — load alarms, not regressions.

## Next — owner's order, 2026-09-22
- Phase 9 (9.4+) as above. **On hold**: 7b film look, 8 keyframes/Present.
- Phase 6 leftovers: 6.6 frames/tools, 6.7 wireframe, 6.10 VoiceOver sweep + export diff.

## Deferred
- PDF = print dialog; no zip export; bridge is long-poll; chart data panel commits per blur;
  image aspect lock is Shift-lock; V2Settings caption says Alt for snap bypass (dispatcher reads ⌘).
