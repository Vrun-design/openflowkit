# State

Plan: `docs/plan/README.md` (untracked, owner's copy). Phases 0–7 done (7b on hold; 6.6, 6.7, 6.10 partly — see Deferred).

## Now
- **Phase 10 — BYOK: 10.1–10.7 DONE 2026-09-22** (deepseek-v4.1). `providers.ts` ten entries /
  three wires; `diagnosis.ts` eight causes, one sentence + one action; a rejected fetch is told
  apart by `securitypolicyviolation` (one macrotask later) and `navigator.onLine`, never shown
  as a TypeError; dialog has ten marks, risk badge, Test key, Clear all keys; headed
  `ai-providers.spec.ts` proves all three wires on `e2e/stubProviderServer.mjs`.
  Decision (a): `connect-src` widens to `https: http://localhost:* http://127.0.0.1:*`; cost:
  the CSP no longer limits exfiltration targets — accepted because `img-src https:` already
  allowed beacons and inline/eval already neutered CSP against XSS. posthog/yjs/dead wss dropped.
- **Phase 9 — docs rebuild: 9.1–9.5 DONE 2026-09-23** (opencode/deepseek-v4.1). inventory.json
  (115 rows, evidence file:line, page per shipped feature) + test; prebuild compiles every
  ```` ```openflow ```` block (warning/error/empty frame fails with file:line); a remark plugin
  renders the SVG beside the source; English only, 22 fiction pages deleted, nine groups, zero
  dead links; all 16 surviving pages rewritten; keyboard + MCP pages generated from source;
  app-token palette, real landing page, phone-legible examples; Lighthouse 100s at 375px, dark
  axe 0. Deleted the docs-site analytics head script (imported a phase-0-removed file, 404 per
  page) and posthog-js; lighthouse added as a docs-site devDep (why: the 9.5 check). The BYOK
  page stays provider-agnostic and `partial` although phase 10 landed mid-night. Next 9.6: the
  four-failure gate + quality workflow. Defects documented, not fixed (src/ read-only): chart
  quadrant labels never parse (W131); `v2Shortcuts.ts:49` labels Shift+1 zoom-to-100% while the
  dispatcher fits the view.
- **Phase 7 — motion export DONE 2026-09-22**: one Timeline feeds preview, stills, SVG and every
  frame; GIF/MP4/WebM in a worker; MCP `export` all four + `svg-animated`; sweep added four specs.

## Ceilings (`// ponytail:` in code)
- Whole SVG re-emitted per export; chart/ink/image/annotation/text node sends every frame to the
  SVG raster. GIF: 256 colours, ≤ 20 fps, no custom keyframes (phase 8).
- `agent-live` and the phase-7 `frame.test.ts` wall-clock budget flake under load, pass alone.
- `browser`/`mobile` frames and icon packs draw in the app but export as plain cards.

## Next — owner's order, 2026-09-22
- **Phase 9** 9.6 (the four-failure gate + quality workflow). **On hold**: phase 7b film look,
  phase 8 keyframes/Present. Phase 6 leftovers: 6.6 frames/tools, 6.7 wireframe, 6.10 VoiceOver.

## Deferred
- PDF = print dialog; no zip; bridge is long-poll; chart data panel commits per blur; image
  aspect lock is Shift-lock; V2Settings caption says Alt for snap bypass (dispatcher reads ⌘).
