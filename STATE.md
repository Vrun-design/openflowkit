# State
Plan: `docs/plan/README.md` (untracked, owner's copy), v3 from 2026-10-03: phases 12–16. Build plan
(0–11) done, archived at `docs/archive/plan-executed-2026-10-03/`; 7b/8 parked; 6.10 → 14.1.

## Now
- Gate: `npm run verify` (~3 min). CI runs `test:ci` (incl. `bundle:check`) then all non-`@local` e2e. GPU frame
  budgets run off CI only (`process.env.CI`); a loaded Mac flakes the gate (session-start code too, 2026-10-05).
- **Phase 12 DONE 2026-10-03** except the merge. Owner's: merge `main` → `v2`, PR `v2` → `main`, Cloudflare
  Landing project, tag `v1-final`.
- **Phase 13 DONE 2026-10-03** except 13.4 on a stronger model (nemotron free: Mermaid 96%, DSL 90% first try).
- MCP 0.2.0 builds and answers over stdio (29 tools, Mermaid in) but is **unpublished**: npm still serves 0.1.2,
  which has no live bridge. Publish (`prepublishOnly` rebuilds) before launch; see memory `project_mcp_registry_publish`.
## Launch-readiness pass 2026-10-05 (opus-5.5) — committed on `v2`, verify green
- CI had been red since 2026-09-25 (editor chunk over budget, so e2e never ran). Fixed: v1 importer, agent op
  registry and Structurizr/D2 load on demand. Entry JS 566 → 231 KB; editor 1504 → 1422 KB (budget 1500).
- Split god files: `V2EditorPage` 1350 → ~935 (`useV2Panels`, `useV2CodeWorkspace`, `useV2Inserts`,
  `useV2ConnectorLabelEditing`, `useV2FeatureTips`, `useV2EditorNotices`, `useV2ProposalPreview`); `useV2Pointer`
  1306 → 633 + `v2PointerGestures` (operation types, geometry, `finishGesture`).
- Removed the Slides rail mock (saved nothing). Untitled documents take their first diagram's `title:`
  (`nameUntitledDocument`). Star count backs off a day on failure. nginx CSP = `_headers`. PNG/GIF/MP4 exports
  draw labels in Inter (`withSvgImage`). 39 dead exports gone. Unused deps dropped, `npm audit fix` 28 → 8
  (left: astro + sharp in docs-site, major bumps). README/SECURITY/CONTRIBUTING describe v2.
## Found, not fixed (owner calls)
- Holds (MCP publish, merge, canvas UI, labs flag, SVG font): `docs/plan/launch-holds.md`.
- Canvas UI (owner's D11 pass): "Connect agent" is in both the document bar and the rail; a fitted diagram tucks
  under the left toolbar; phone welcome shows keyboard hints and clips the template row; dark-mode template
  thumbnails show white sequence/state boxes.
- Fit under 65% zoom on 27/50 AI replies: land AI results at ≥65% anchored on the start, fit button for overview.
## Ceilings (`// ponytail:` in code)
- Whole SVG re-emitted per export; chart/ink/image/annotation/text frames rasterized in JS.
  GIF: 256 colours, ≤ 20 fps, no custom keyframes (phase 8). Frames don't clip on export.
- Animation is page-scoped only; deployment relations (node → node) are not in the grammar.
## Next — owner's order, 2026-10-03
- Order: 13.4 with quota → 14.1 → D11 UI → 14.4 → 15 (plan/audit done by Codex 2026-10-04). Open: D7, D8, D11.
- D8 (Claude, 2026-10-05): no labs flag. Slides was the only unreal surface and is gone; charts and wireframes are
  real and tested. Lead the launch story with agent → diagram; a flag would cost a branch in every flyout.
## Deferred
- Widget text width is estimated; wireframe comments move to the end; PDF = print dialog; no zip;
  bridge is long-poll; chart data panel commits per blur; image aspect lock is Shift-lock.
