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
## C4 pages, labels, Mermaid gaps 2026-10-07 (sonnet-5.5), 14 commits on `v2`; verify green (2162 unit, 39 MCP, 68 gates)
- C4: pages = views (the first takes the empty page you are on); named by level (`Context: Shop`); page list groups a model's
  views under its title, indented; selected element with a deeper view gets a zoom-in button (Enter, read-only too); dbl-click
  still edits the label. Generate lands fitted on the first view's page; two models never cross; a hand-set page name stays.
- Labels: one pass per page, `placeLabels` in `routeProjection.ts` (user-placed first, then connector order: asked-for spot, run
  middles, ratio steps, ±plate off the line); canvas, SVG, animation, editor read the same points; labels wrap at 140 px in files too.
- Mermaid: `-x`/`--x` → `[head: cross]`; class `namespace` → `group` (class/erd, nested); state notes keep line breaks and may sit
  on a composite; W106 for `a = Foo {bar}`; the assistant converts Mermaid/Structurizr/D2 answers (`agent/compileSource.ts`).
- Fixed after: messages end on an activation bar's edge, not under it; a class's divider takes 6 px, not a row, so no method clips;
  the frame grows to hold a composite's note.
- Ceilings: labels avoid nodes and labels, not other connectors' lines; a composite's note can overlap a neighbour on its right (no
  room reserved); deleted view page returns on Generate (the text is the truth); rotated nodes keep box-side attachment; layout
  differs from Mermaid's. D14: no runtime.
## Found, not fixed (owner calls)
- Launch checklist (tested + evidence, then holds: MCP publish, merge, canvas UI): `docs/plan/launch-holds.md`. CI uploads first-failure
  traces (`e2e-traces`). A new worker's deps are pre-scanned (`optimizeDeps.entries`), or dev reloads mid-session.
- D11 still open: dark sequence/state thumbnails and AI initial fit ≥65% (C4 audit has the rest).
## Ceilings (`// ponytail:` in code)
- Whole SVG re-emitted per export; chart/ink/image/annotation/text frames rasterized in JS.
  GIF: 256 colours, ≤ 20 fps, no custom keyframes (phase 8). Frames don't clip on export.
- Animation is page-scoped only; deployment replica/group semantics and migration fidelity remain partial.
## Next — owner's order, 2026-10-06 (D8 decided: no labs flag)
- Canvas UI first, then launch holds, 13.4 → 14.4 → 15. Open: D7, D11. Done 10-06: Inspect (⌥I); rail 12 → 7 (black pill);
  C4 person card + Beta; Shapes 41 → 19; Lasso gone; connector UX pass; connector cuts (Line/Path tools, Cross,
  underline, opacity). Next: `docs/plan/launch-qa-prompt.md`. D11 left: own glyphs, empty screen, dark thumbs.
## Deferred
- Widget text width is estimated; wireframe comments move to the end; PDF = print dialog; no zip;
  bridge is long-poll; chart data panel commits per blur; image aspect lock is Shift-lock.
