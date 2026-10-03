# State

Plan: `docs/plan/README.md` (untracked, owner's copy), v3 from 2026-10-03: phases 12–16. Build plan
(0–11) done, archived at `docs/archive/plan-executed-2026-10-03/`; 7b/8 parked; 6.10 → 14.1.

## Now
- **Stress sheet DONE 2026-09-25 (opencode)**: `npm run stress:generate` writes `stress/*.json` (everything on one page, plus 500/2000/5000-node scales); load via Canvas menu → Open file…; `@local` `e2e/stress.spec.ts` proves the 5k page in ~7 s.
- **Gate**: `npm run verify` = typecheck, lint, unit, MCP server tests, headed `@gate` (~2 min). CI (v2 push):
  `test:ci`, MCP lint+tests, full e2e minus `@local`. Every toolbar control swept by `controls.spec.ts`.
- **Phase 12 DONE 2026-10-03 (opus-5.5)** except the merge: 27/27 v1 fidelity (no Classic); bridge merged to
  `main` by owner (PR #84); boot import, home list (`home-list` now `@gate`), old URLs, `sw.js` kill switch,
  BYOK carry-over, v1 backup; `gh-pages` script + `public/CNAME` gone; CHANGELOG has an Unreleased section.
  Owner's: merge `main` → `v2`, PR `v2` → `main`, Cloudflare Landing project (`web/` is gone), tag `v1-final`.
- **Phase 13 DONE 2026-10-03 (opus-5.5)** except the 13.4 run:
  13.1 tools take Mermaid / Structurizr / D2 (`readAgentSource`, `src/agent/lint.ts`) → `converted: {from, dsl, losses}`;
  13.2 headless SVG + `openflowkit build` draw icon art (`mcp-server/data/icon-art`, built by `build:icons`, ~11 MB);
  13.3 `skills/openflowkit/SKILL.md` = `public/llms.txt` (`npm run skill:sync`; `skill.test.ts` fails on drift);
  13.4 `npm run eval:validity` built, NOT run (needs a key + owner's go; default claude-haiku-4-5, any BYOK provider);
  13.5 `d2ToDsl` (32 real D2 files) + Structurizr fixed on its own 4 example workspaces.
- MCP 0.2.0 was never published; `npx @vrun-design/openflowkit-mcp` still serves 0.1.2 until it is.

## Found, not fixed (owner calls)
- `legacyWorkspace`: a stale copy may resurrect a deleted v1 doc (owner may veto).
- Mermaid ids differing only in case (`A`, `a`) slug to one id and merge, silently (pre-existing; rare).
- Fixed 2026-10-03: edges end on groups (grammar §4, D2/Mermaid containers), quoted `\n` keeps its line
  break, BYOK defaults `claude-opus-5-5` / `gpt-6.1-sol`.

## Ceilings (`// ponytail:` in code)
- Whole SVG re-emitted per export; chart/ink/image/annotation/text frames rasterized in JS.
  GIF: 256 colours, ≤ 20 fps, no custom keyframes (phase 8). Frames don't clip on export.
- Animation is page-scoped only. Deployment relations (node → node) are not in the grammar.
- Phase-7 `frame.test.ts` flakes under load, passes alone.

## Next — owner's order, 2026-10-03
- Run 13.4 (owner's go), check ≥ 90% first-try valid, commit the dated JSON. Then 14.1 quality pass, D11 UI,
  14.4 analytics, 15 share links. Open calls: D7 paid; D8 labs (Claude: yes); D11 (V2 recommended).
## Deferred
- Widget text width is estimated; wireframe comments move to the end; PDF = print dialog; no zip;
  bridge is long-poll; chart data panel commits per blur; image aspect lock is Shift-lock.
