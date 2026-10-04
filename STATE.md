# State
Plan: `docs/plan/README.md` (untracked, owner's copy), v3 from 2026-10-03: phases 12–16. Build plan
(0–11) done, archived at `docs/archive/plan-executed-2026-10-03/`; 7b/8 parked; 6.10 → 14.1.

## Now
- Stress sheet: `npm run stress:generate` → `stress/*.json`; gate: `npm run verify` (~2 min); CI runs the rest.
- **Phase 12 DONE 2026-10-03 (opus-5.5)** except the merge: 27/27 v1 fidelity, bridge on `main` (PR #84), boot import,
  old URLs, `sw.js` kill switch, BYOK carry-over, v1 backup. Owner's: merge `main` → `v2`, PR `v2` → `main`,
  Cloudflare Landing project, tag `v1-final`.
- **Phase 13 DONE 2026-10-03 (opus-5.5)** except the 13.4 run:
  13.1 tools take Mermaid / Structurizr / D2 (`readAgentSource`, `src/agent/lint.ts`) → `converted: {from, dsl, losses}`;
  13.2 headless SVG + `openflowkit build` draw icon art (`mcp-server/data/icon-art`, built by `build:icons`, ~11 MB);
  13.3 `skills/openflowkit/SKILL.md` = `public/llms.txt` (`npm run skill:sync`; `skill.test.ts` fails on drift);
  13.4 `npm run eval:validity` ran 2026-10-04 (nemotron free): first-try Mermaid 96%, DSL 90% (100% replayed on
  current code); re-run on a stronger model (free tier 50 req/day, a run is 100+) for the launch number;
  13.5 `d2ToDsl` (32 real D2 files) + Structurizr fixed on its own 4 example workspaces.
- MCP 0.2.0 was never published; `npx @vrun-design/openflowkit-mcp` still serves 0.1.2 until it is.
## Polish pass 2026-10-04 (opus-5.5) — UNCOMMITTED, `npm run verify` green, brief `docs/plan/polish-pass-brief.md`
- A: failure/empty states share `ErrorState`/`EmptyState` (+ `hero`, `secondary`) and `V2StateHero`; WebGL off hides
  canvas tools; storage copy from `describeStorageFailure`. B: home v3 — sidebar views (`?view=`), Archive (`archivedAt`
  on the record, kept until deleted, a save restores), multi-select, ⌘K, import/drop (`{source}` intent), thumbnails IDB (**DB v5**).
  C: feature tips (`v2FeatureTips.ts`, one a session, once ever). Decided: **auto-icons stay on by default**.
## Found, not fixed (owner calls)
- Fit under 65% zoom: 27/50 replayed DSL replies, median 0.63 (1040×900 canvas). Not a layout knob: 16 of 27 are
  sequence/class/mindmap (own layouts); ELK wrapping moved it to 22 but tangled long flows (screenshots), reverted.
  Recommend: land AI results at ≥65% anchored on the start, fit button for the overview.
- Editor chunk 1511.6 KB at `ff154d3`, 1510.7 KB after the polish pass, vs 1500 KB budget (CI does not run `bundle:check`).
- MCP 0.1.2 on npm has no live bridge at all: pairing needs 0.2.0 published.
- Auto-icons on for flowcharts (keep); dark mode pastel tiles. Not done: split V2EditorPage/useV2Pointer, incremental
  index (9 ms at 5k), on-device model, code-panel virtualisation (0.8 s/key at 10k lines).
## Ceilings (`// ponytail:` in code)
- Whole SVG re-emitted per export; chart/ink/image/annotation/text frames rasterized in JS.
  GIF: 256 colours, ≤ 20 fps, no custom keyframes (phase 8). Frames don't clip on export.
- Animation is page-scoped only; deployment relations (node → node) are not in the grammar.
## Next — owner's order, 2026-10-03
- Re-run 13.4 after the detector fix on a model with quota. Then 14.1 quality pass, D11 UI,
  14.4 analytics, 15 share links. Open calls: D7 paid; D8 labs (Claude: yes); D11 (V2 recommended).
## Deferred
- Widget text width is estimated; wireframe comments move to the end; PDF = print dialog; no zip;
  bridge is long-poll; chart data panel commits per blur; image aspect lock is Shift-lock.
