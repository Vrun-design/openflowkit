# State
Plan: `docs/plan/README.md` (untracked, owner's copy), v3 from 2026-10-03: phases 12–16. Build plan
(0–11) done, archived at `docs/archive/plan-executed-2026-10-03/`; 7b/8 parked; 6.10 → 14.1.

## Now
- 14.1 C4 is in (landscape = top-level elements; pages matched by element overlap; model edits stay in their own model).
- Gate: `npm run verify` (~3 min; GPU busy → headless SwiftShader, needs stub on 4399). CI: `test:ci` then non-`@local` e2e.
- **Phases 12 + 13 DONE 2026-10-03.** Owner's: merge `main` → `v2`, PR `v2` → `main`, Cloudflare Landing, tag `v1-final`; 13.4 needs a stronger model.
- MCP 0.2.0 (29 tools) is **unpublished**: npm serves 0.1.2, no live bridge. Publish before launch (memory `project_mcp_registry_publish`).
## 10-05 launch pass (entry JS 566 → 231 KB); 10-07 C4 pages = views, label pass, Mermaid gaps (git log 5930197)
## Roadmap 2026-10 run (opus-5.5, from 2026-10-07): plan `docs/plan/roadmap-2026-10.md`, log + RESUME `docs/plan/roadmap-progress.md`
- Done, pushed: 1.1 headless ELK, 1.2–1.6 discovery + names, 2.1 CLI ops, 2.2 repo → diagram, 2.3 share links, 2.4 `--svg`,
  2.6 ⌘F, 2.7/Codex plugins, 2.8 dark wash, 4.1 MCP Apps endpoint, 4.2 PR Action, 4.3 Copy as Mermaid, AI first fit,
  Workers + R2/D1 discovery, W122 (details: roadmap-progress.md).
## Map mode run (from 2026-10-08): plan `docs/plan/map-mode-plan.md` (supersedes map-plan P5+), log + RESUME `docs/plan/map-progress.md`
- Living Map P1–P4 (engine, import facts, SVG page `/#/map/github/o/r`, CLI map). Map mode in the editor: M1 b0b90370
  (fromArch, mapScene), M2 a78a5995 (`Canvas | Map`, click opens in place, arrow → relations), M3 2ae7cafa (grow-in-place
  motion), focus + flow; overnight 2026-10-09: two-way arrows + wrap everywhere, toolbar/keys/find, repo maps in the
  editor, drill → Map, Pin as page, panel clearance (51dd85ea…ae1bc1b1). Owner look #3 + open decisions:
  https://claude.ai/artifact/9gnWpNCFg2i9fFwmKVKKMD. Owner took the defaults: Canvas/Map remembered + pin on repo maps
  (52fea93a). UI pass 10-09 DONE (review https://claude.ai/artifact/TXok1h8arREGfZpJ4QmeX4, owner took A–C): fixed Canvas|Map
  switch + Map path crumb, selection carries across modes, Model panel = outline (Tree) + element card, save on blur, no
  Views tab; views/first open land readable; one dark card palette (+ dark SVG export); panels never hide content; blue
  focus ring, neutral read-only lock (dff3aeac). cf87050b: Canvas|Map on every doc (Map start screen shares the canvas
  welcome layout), Share/Export bar top right. Map bar = segmented Top level (all shut) | One level in | All levels +
  Edit as drawing; Map edits go to the model card (double-click, menu, ⌘⇧⌫) or explain once per visit. Export panel docks right. Pushed.
- Icon catalog: names from generated `providerIconManifest.ts` (re-run `node scripts/gen-icon-manifest.mjs` after adding SVGs; a test fails until you do), URLs load per provider (`iconUrls/`). Editor chunk 1581 → 1236 KB; CI was red on the bundle budget 10-09 03:20 → this fix.
- Owner: publish MCP 0.2.0 (Action default CLI needs it); deploy `start:http` over HTTPS, verify hosts (README). Actions: `docs/plan/cofounder-action-list.md`. `e2e:headed` 10-09: 261/266; 5 local GPU budgets fail at 23ff9aa4 too (Mac). Open: H5 eval.
## Found, not fixed (owner calls)
- Launch checklist (tested + evidence, then holds: MCP publish, merge, canvas UI): `docs/plan/launch-holds.md`. CI uploads first-failure
  traces (`e2e-traces`). A new worker's deps are pre-scanned (`optimizeDeps.entries`), or dev reloads mid-session.
- AI pass 10-09 (Haiku/Sonnet + real Ollama): hangs, silent failures, Ollama context, camera lands on the applied diagram, chart title ×1, sequence labels clear; big grouped layouts kept INCLUDE_CHILDREN (SEPARATE wrecks small ones). Discovery is blind to .NET/Elixir without containers (G1). Headless layout cap: 1000 shapes / 400 connections; Share Worker: `worker/README.md`.
## Ceilings (`// ponytail:` in code)
- Whole SVG re-emitted per export; chart/ink/image/annotation/text frames rasterized in JS.
  GIF: 256 colours, ≤ 20 fps, no custom keyframes (phase 8). Frames don't clip on export.
- Animation is page-scoped only; deployment replica/group semantics and migration fidelity remain partial.
## Next — owner's order, 2026-10-06 (D8 decided: no labs flag)
- Canvas UI done (10-06 rail/Inspect/Shapes/connector pass; 10-09 UI pass above) → launch holds, 13.4 → 14.4 → 15.
  Open: D7, D11 (own glyphs, empty screen). Next: owner click-through when the GPU is free, then `docs/plan/launch-qa-prompt.md`.
- Deferred (owner to decide): view frame title as a real heading + rename Landscape → All systems. Widget text width estimated; wireframe comments move to end; PDF = print dialog; no zip; bridge long-poll; chart data commits per blur; image aspect lock = Shift.
