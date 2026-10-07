# State
Plan: `docs/plan/README.md` (untracked, owner's copy), v3 from 2026-10-03: phases 12–16. Build plan
(0–11) done, archived at `docs/archive/plan-executed-2026-10-03/`; 7b/8 parked; 6.10 → 14.1.

## Now
- 14.1 C4 (Codex 10-05, uncommitted) + review fixes (Opus 5.5): landscape = top-level non-deployment elements; workspace pages matched by element overlap, bound frame first; one projected edge per pair; untouched code draft
  follows the model; SVG sub-label 11px in node; card type label; bad `exclude` narrows; model edits stay in their own
  model (`modelPages(doc, elementId)`); C4 descriptions wrap in their box. `verify` green (2023 unit, 39 MCP, 62 gates);
  full headed 169/171: style-bar click fixed, Mermaid corpus timed out under load (passes alone), style-bar:88 flakes 1/32.
- Gate: `npm run verify` (~3 min). CI runs `test:ci` (incl. `bundle:check`) then all non-`@local` e2e. GPU frame
  budgets run off CI only (`process.env.CI`); a loaded Mac flakes the gate (session-start code too, 2026-10-05).
- **Phase 12 DONE 2026-10-03** except the merge. Owner's: merge `main` → `v2`, PR `v2` → `main`, Cloudflare
  Landing project, tag `v1-final`.
- **Phase 13 DONE 2026-10-03** except 13.4 on a stronger model (nemotron free: Mermaid 96%, DSL 90% first try).
- MCP 0.2.0 builds and answers over stdio (29 tools, Mermaid in) but is **unpublished**: npm still serves 0.1.2,
  which has no live bridge. Publish (`prepublishOnly` rebuilds) before launch; see memory `project_mcp_registry_publish`.
## Launch-readiness pass 2026-10-05: CI green again, entry JS 566 → 231 KB, god files split (see git log)
## Mermaid fidelity pass 2026-10-07 (opus-5.5), 6 commits on `v2`, verify green (2121 unit)
- Pasted Mermaid generates without Convert (code panel, home, MCP all go through `detectForeign`/`readAgentSource`).
- Flowchart: 48-construct corpus (`fixtures/mermaid/flowchartSyntax.ts`), classDef/linkStyle colours, `&` chains,
  edge ids/animate, subgraph direction (Mermaid's rule), `icons: off` on import. Sequence/class/state/ER: real syntax.
- Layout: ELK honours label size and back edges (`backEdges`); router lands on real outlines, spreads ends, keeps
  labels off nodes. Sequence notes get their own rows; SVG export draws participants like the canvas. Class: parent on top.
- Ceilings: labels avoid nodes, not other labels; namespace boxes not drawn; multi-line state notes dropped.
  Owner call: adopt Mermaid's runtime (like Excalidraw/draw.io) or keep our parser, see the 10-07 report.
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
