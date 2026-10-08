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
## 10-05 launch pass (entry JS 566 → 231 KB); 10-07 C4 pages = views, label pass, Mermaid gaps (git log 5930197)
## Roadmap 2026-10 run (opus-5.5, from 2026-10-07): plan `docs/plan/roadmap-2026-10.md`, log + RESUME `docs/plan/roadmap-progress.md`
- Done, pushed: 1.1 headless ELK, 1.2–1.6 discovery + names, 2.1 CLI ops, 2.2 repo → diagram, 2.3 share links, 2.4 `--svg`,
  2.6 ⌘F, 2.7/Codex plugins, 2.8 dark wash, 4.1 MCP Apps endpoint, 4.2 PR Action, 4.3 Copy as Mermaid, AI first fit,
  Workers + R2/D1 discovery, W122 (details: roadmap-progress.md).
## Map mode run (from 2026-10-08): plan `docs/plan/map-mode-plan.md` (supersedes map-plan P5+), log + RESUME `docs/plan/map-progress.md`
- Living Map P1–P4 (engine, import facts, SVG page `/#/map/github/o/r`, CLI map). Map mode in the editor: M1 b0b90370
  (fromArch, mapScene), M2 a78a5995 (`Canvas | Map`, click opens in place, arrow → relations), M3 2ae7cafa (grow-in-place
  motion; ELK fixed alignment), add element, readable landing, "Landscape", focus + flow (7f2aa147). Next: overnight run
  `docs/plan/map-mode-overnight.md` (M4 → M6 → owner look #3).
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
- Widget text width estimated; wireframe comments move to end; PDF = print dialog; no zip; bridge long-poll; chart data commits per blur; image aspect lock = Shift.
