# State
Plan: `docs/plan/README.md` (untracked, owner's copy). Phases 0–7 done (7b on hold; 6.6, 6.7, 6.10 partly — see Deferred).

## Now
- **Phase 10 — BYOK: 10.1–10.5 DONE 2026-09-22** (deepseek-v4.1; next 10.6 UI, 10.7 stub bed).
  `providers.ts` ten entries / three wires; `provider.ts` Anthropic + OpenAI (eight providers,
  quirks as fields) + Gemini generateContent; `diagnosis.ts` eight causes, one sentence + one
  action each; `securitypolicyviolation` (read one macrotask later, the report is queued)
  separates our CSP from provider CORS, and a TypeError never reaches the user.
  **Decision (a): `connect-src` widens to `https: http://localhost:* http://127.0.0.1:*
  ws://localhost:*`; cost: the CSP no longer limits exfiltration targets.** Accepted because
  `img-src … https:` already allowed beacons anywhere and inline/eval already neutered CSP
  against XSS, so the allowlist never guarded the key. New https providers pass the CSP test
  without naming their origin; new non-local http providers still fail it. Dropped posthog,
  `signaling.yjs.dev`, dead `wss://*.openflowkit.com`.
- **Phase 9 — docs rebuild: 9.1 DONE 2026-09-22** (deepseek-v4.1; 9.1 → 9.6).
  `docs-site/inventory.json` = 115-row feature truth with file:line evidence and explicit
  absences (collaboration/share, flowpilot, 6.6/6.7, Present, keyframes, canvas re-layout…);
  `partial`: PDF, drift, BYOK (frozen until 10), perf. Next 9.2: compile every ```openflow
  block with the real parser at docs build time.
- **Phase 7 — motion export: DONE 2026-09-22.** One Timeline feeds preview, stills, SVG and
  every video frame; GIF/MP4/WebM encode in a worker; MCP `export` serves all four plus
  `svg-animated`. 7.8 worker-paints plain pages (500 nodes × 451 frames: 30.7 s → 3.1 s).
- **Coverage sweep 2026-09-22** (Opus 5): four editing specs; fixed locked-node moves and the
  Alt-vs-⌘ snap claim.

## Ceilings (`// ponytail:` in code)
- Whole SVG re-emitted per export (~1 MB at 500 nodes); any chart/ink/image/annotation/text node
  sends every frame to the SVG raster. GIF: 256 colours ≤ 20 fps, no custom keyframes (phase 8).
- `agent-live` flaked once in three sweeps, passes alone; cause unconfirmed.
- Docs fiction is 9.1's inventory's job; no coverage for frames/wireframe (6.6/6.7).

## Next — owner's order, 2026-09-22
- Phase 9 (9.2+) and Phase 10 (10.6–10.7) as above. **On hold**: 7b film look, 8 keyframes/Present.
- Phase 6 leftovers: 6.6 frames/tools, 6.7 wireframe, 6.10 VoiceOver sweep + export diff.

## Deferred
- PDF = print dialog; no zip export; bridge is long-poll; chart data panel commits per blur;
  image aspect lock is Shift-lock; V2Settings still captions Alt for snap bypass (dispatcher reads ⌘).
