# State

Plan: `docs/plan/README.md` (untracked, owner's copy), v3 from 2026-10-03: phases 12–16. Build plan
(0–11) done, archived at `docs/archive/plan-executed-2026-10-03/`; 7b/8 parked; 6.10 → 14.1.

## Now
- **Element export DONE 2026-09-25 (opencode)**: right-click a layer/connection → Export… opens
  the one export panel at Selection; a group/frame/section brings its subtree, a lone connection
  exports without endpoints, a single-element file takes the element's label, PNG/SVG gained
  Transparent. Codex's export-panel/animation-export polish was reverted by owner request
  (motion back to chip steps, export the plain form); Settings grouping and exclusive document
  popovers kept. `npm run verify` green. Motion stays page-level (owner).
- **Quality gate 2026-09-24**: merge on `npm run verify` (typecheck, lint, unit, headed `@gate`).
  `e2e/test.ts` fails a spec on any uncaught page error; `controls.spec.ts` sweeps every toolbar
  control; e2e is serial. CI: full suite on `v2` push, SwiftShader, minus `@local`. Tooltip native-title sweep DONE 2026-09-25 (Codex).
- **6.6 + 6.7 More flyout DONE 2026-09-24** (opus-5.5): ⇧S → frame presets + tools (Q/K/X/N),
  35 widgets feeding Pixi + SVG; picks grow the selected frame.
- **Phases 9–11 DONE 2026-09-23**: docs rebuild (`check-docs.mjs`); BYOK, ten providers, CSP `https:`+localhost;
  assistant is a conversation (SSE, ≤ 8 tool rounds, chats per doc). Icons from labels: `dsl/autoIcon.ts`;
  gap: headless MCP SVG has no art.

## Ceilings (`// ponytail:` in code)
- Whole SVG re-emitted per export; chart/ink/image/annotation/text frames rasterized in JS.
  GIF: 256 colours, ≤ 20 fps, no custom keyframes (phase 8). Frames don't clip on export.
- Animation is page-scoped only; element-scoped motion needs a timeline filtered to a subtree.
- Phase-7 `frame.test.ts` flakes under load, passes alone.

## Next — owner's order, 2026-10-03
- **12.0 DONE (opus-5.5): 27/27 clean** → no Classic (owner confirms). Fixtures `storage/v2/__fixtures__/v1/`, `scripts/v1-fidelity/`;
  `mermaid_svg` broken in v1 too → mermaidToDsl; import inlines `imageUrl`.
- **12.1 bridge BUILT 2026-10-03 (opus-5.5), NOT pushed**: branch `v1-bridge` @99589ce in `../ofk-main`; owner pushes + merges to `main` ~2–4 wk pre-launch, then tags `v1-final`.
  For 12.3: a v1 tab can still save after import (warns, but saves) → if a v1 doc's `updatedAt` moved since import, don't drop it as `stale`.
- **12.2–12.5 DONE 2026-10-03 (opus-5.5)**: `legacyWorkspace.ts` (all sources merge; stale copy may resurrect a deleted
  doc, owner may veto), `v1Import.ts` (re-reads v1 each boot for open-tab edits) + `rehearsal.mjs` PASS, `#/home`, old URLs
  (`V2LegacyRoutes.tsx`). Open v1 tab blocks v4 upgrade → 12.1: close on `versionchange`. Headed `home-list.spec.ts` NOT run.
- **13.1 Mermaid into MCP** + 13.2 headless icons, parallel with 12 (different files).
- Open calls (plan README §2): D7 paid (owner); D8 labs; D11 own UI (V2 recommended, docs/plan/design). D6 encrypted links + D9 analytics = yes.
## Deferred
- Widget text width is estimated; wireframe comments move to the end; PDF = print dialog; no zip;
  bridge is long-poll; chart data panel commits per blur; image aspect lock is Shift-lock.
