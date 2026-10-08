# State
Plan: `docs/plan/README.md` (untracked, owner's copy), v3 from 2026-10-03: phases 12–16. Build plan
(0–11) done, archived at `docs/archive/plan-executed-2026-10-03/`; 7b/8 parked; 6.10 → 14.1.

## Now
- 14.1 C4 is in (landscape = top-level elements; pages matched by element overlap; model edits stay in their own model).
- Gate: `npm run verify` (~3 min). CI runs `test:ci` (incl. `bundle:check`) then all non-`@local` e2e. GPU frame
  budgets run off CI only (`process.env.CI`); a loaded Mac flakes the gate (session-start code too, 2026-10-05).
- **Phase 12 DONE 2026-10-03** except the merge. Owner's: merge `main` → `v2`, PR `v2` → `main`, Cloudflare
  Landing project, tag `v1-final`.
- **Phase 13 DONE 2026-10-03** except 13.4 on a stronger model (nemotron free: Mermaid 96%, DSL 90% first try).
- MCP 0.2.0 builds and answers over stdio (29 tools, Mermaid in) but is **unpublished**: npm still serves 0.1.2,
  which has no live bridge. Publish (`prepublishOnly` rebuilds) before launch; see memory `project_mcp_registry_publish`.
## Launch-readiness pass 2026-10-05: CI green again, entry JS 566 → 231 KB, god files split (see git log)
## C4 pages, labels, Mermaid gaps 2026-10-07: C4 pages = views, one label pass per page, Mermaid gaps (see git log 5930197).
## Roadmap 2026-10 run (opus-5.5, from 2026-10-07): plan `docs/plan/roadmap-2026-10.md`, log + RESUME `docs/plan/roadmap-progress.md`
- Done, pushed: 1.1 ELK headless (golden browser = Node), 1.2–1.5 discovery (this repo → 3 units; env/compose calls with
  file:line), 1.6 System map / Overview / Services names, 2.1 CLI from the op registry (`op`, `render`, `convert`,
  `validate`; MCP add_shape schema fix), 2.3 share links (Worker + viewer; deploy is owner's), 2.6 ⌘F, 2.7 Claude plugin.
- 2026-10-08 done, pushed: 2.2 repo → diagram (`/#/from/github/o/r`, one discovery core for app + MCP), 2.4 `--svg` /
  `openflow_save svg`, 2.8 dark wash for default fills, 4.2 PR diagrams Action (`action/`), 4.3 Copy as Mermaid,
  4.1 remote MCP Apps endpoint (`start:http`) + viewer + `/#/from/dsl` links; Claude thinking 400 fix + prompt caching.
- 2026-10-08 pm: AI first fit (big AI diagrams land at 65% on their start), Structurizr guide + share-links terms page,
  Codex plugin (`plugin/.codex-plugin`, `.agents/plugins/`), discovery finds Cloudflare Workers + R2/D1, W122 on a view target.
- Owner: publish MCP 0.2.0 (Action default CLI needs it); deploy `start:http` over HTTPS, then verify hosts (README table).
  Owner action list: `docs/plan/cofounder-action-list.md`. Waiting on owner's go: `e2e:headed` + walkthrough, H5 eval.
- Headless layout cap: 1000 shapes / 400 connections. Share Worker setup: `worker/README.md`.
## Found, not fixed (owner calls)
- Launch checklist (tested + evidence, then holds: MCP publish, merge, canvas UI): `docs/plan/launch-holds.md`. CI uploads first-failure
  traces (`e2e-traces`). A new worker's deps are pre-scanned (`optimizeDeps.entries`), or dev reloads mid-session.
- Discovery is blind to .NET/Elixir without containers (G1).
## Ceilings (`// ponytail:` in code)
- Whole SVG re-emitted per export; chart/ink/image/annotation/text frames rasterized in JS.
  GIF: 256 colours, ≤ 20 fps, no custom keyframes (phase 8). Frames don't clip on export.
- Animation is page-scoped only; deployment replica/group semantics and migration fidelity remain partial.
## Next — owner's order, 2026-10-06 (D8 decided: no labs flag)
- Canvas UI first, then launch holds, 13.4 → 14.4 → 15. Open: D7, D11. Done 10-06: Inspect (⌥I); rail 12 → 7 (black pill);
  C4 person card + Beta; Shapes 41 → 19; Lasso gone; connector UX pass; connector cuts (Line/Path tools, Cross,
  underline, opacity). Next: `docs/plan/launch-qa-prompt.md`. D11 left: own glyphs, empty screen.
## Deferred
- Widget text width is estimated; wireframe comments move to the end; PDF = print dialog; no zip;
  bridge is long-poll; chart data panel commits per blur; image aspect lock is Shift-lock.
