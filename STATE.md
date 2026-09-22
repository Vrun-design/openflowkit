# State

Plan: [docs/plan/README.md](docs/plan/README.md). Phases 0–5 done, no gates.
## Now
- Phase 6 — creation library ([phase-6-library.md](docs/plan/phase-6-library.md)): slices
  6.1 rail → 6.2 shapes → 6.3 connectors → 6.4 ink → 6.5 image/emoji → 6.6 frames/tools →
  6.7 wireframe → 6.8 charts → 6.9 quadrant+DSL+MCP → 6.10 audit.
- Phase 6 slices 6.1–6.5 + 6.8–6.9 done 2026-09-22 (opencode/deepseek-v4.1); 6.6, 6.7, 6.10
  NOT built (see Deferred). Rail: flyouts for shapes/connector/charts/ink, lock, separators.
  Shapes: 46 library shapes end to end (outlines, label insets, Pixi decorations, SVG, DSL
  words + Mermaid aliases, numbered-circle labels, scene-tree names). Connectors: click-by-click
  path tool, diamond marker, Path in the style bar, SVG end glyphs. Ink: pen/highlighter with
  coalesced capture + RDP + Catmull-Rom, eraser, lasso, Ink panel. Media: image via picker,
  drop, paste or URL (IndexedDB assets, Pixi resolves assetId), emoji picker with search and
  recents. Charts: 10 kinds (bar…table, quadrant) via a pure presentation → one Pixi renderer
  and matching SVG, the data panel (cells, +Row/+Series, TSV paste, one undo per commit), the
  Chart type panel, draggable quadrant points, and a `chart` DSL family with round-trip
  fixtures + agent surface. Built with `docs/plan/phase-6-library.md` §0 as the bar.
- Verified after 6.9: typecheck, lint, unit + headed e2e for every slice. `check-v2-polish.mjs`
  fails at unmodified HEAD on this machine (environmental); re-run when the machine is quiet.
- Four shared bugs surfaced and were fixed: a tooltip swallowed Escape (passive Popover
  stopPropagation); clearing the selection left focus on body so the next shortcut died; pickers
  anchored to a div could not return focus (now anchored to their trigger); SVG export dropped
  every connector arrowhead and every family-renderer node shape (now draws markers + charts).
- Phase 6 owner review 2026-09-22 (Opus): rail click arms the last pick, second click /
  long-press / → opens the grid (Charts always opens); flyouts scroll, shapes 6 columns, real
  tooltips per cell. 42 library shapes: cloud/actor/cube/prism/layer-stack/check/cross redrawn,
  rectangle/comment/panel/callout-stack culled from the flyout (still DSL words). Charts draw
  their card so ink adapts per theme; fixed a Pixi crash (shared label container destroyed each
  frame) that froze the canvas after any chart; table rows cap at 40 px; panel `sr-only` leak.
  SVG: decorations and charts were double-transformed. Selection holds many connectors
  (marquee, ⌘A, Delete, tree); free-end connectors indexed by their point. Style bar for a
  multi-connector selection is a marked ceiling. `OpenCanvasSemanticSceneTree` has no caller.
- Chart UI review 2026-09-22 (Opus): data panel docks in the right workspace slot (rail shifts,
  one panel at a time) as a spreadsheet grid — sticky header/label column, fixed column widths,
  scrolls; chart type is an icon grid and the bar button shows the current kind; the Icon button
  is hidden for charts/ink/images (`withIcon` would have turned them into architecture nodes)
  and uses the smiley glyph to match the rail. Pie wedges close through the centre (were
  arc-minus-chord), zero slices skipped, white % labels; radar draws 4 rings + spokes with label
  room; the `legend` array is now rendered (swatch marks + labels) for pie/donut and multi-series
  charts. Popover side placement grows upward when it does not fit below the anchor (rail
  flyouts from low buttons use the space above) and side layers are clamped to the band between
  the top and bottom toolbar lanes (`layout.bottomLane` token), capped in height so they scroll.
- Connect agent moved to the rail 2026-09-22 (Opus): 5th rail item + welcome button open a
  panel (`V2AgentConnect`: hero, steps when off, live card + capability grid when on); top-bar
  plug is status-only and opens the panel. No shortcut (Alt+A = align left).
- Rail polish 2026-09-22 (Opus): assistant hero empty state; provider config is a header badge →
  `V2AiProviderDialog` (send without key opens it); error row Retry/Check provider; slides hero.
- UI cleanup 2026-09-22 (Codex): layer hierarchy, undoable visibility/lock, page badge+rename.
- Phase 5 done 2026-09-22 (opencode/deepseek-v4.1): C4 model layer. `src/dsl/model/`
  (`ArchModel` elements/relations/views/flows, dotted ids, implied relations, view
  predicates); architecture family v2 + Structurizr importer (`services/dsl/structurizrToDsl`);
  generate = one page per view, one undo, matched by view id; model-aware rename/remove/
  unplace/relate across views; model panel (Alt+M), breadcrumb, drill-down, flow playback
  + Mermaid/PlantUML/sequence export, tag perspectives, ADRs; folder workspace
  (`architecture.ofk`, `views/*.snap`, `adr/*.md`); MCP discover/drift/explain +
  `openflowkit discover|drift|build`.
- Verified: typecheck, lint, vite build, 1097 unit tests, 31 MCP tests, 34 headed e2e checks.
- Review 2026-09-22 (Opus, phases 2–4): diagnostics + Mermaid → DSL fixes (sequence/state/
  ER/class edge cases, crow's-foot regex in `domain/connectors/presentation.ts`); Canvas menu
  → Open file…; DSL fuzz test; 124 dead V1 files + 8 deps deleted; Structurizr paste converts.
- Phase 5 review (Opus): fixed `X.*` predicate, empty custom views, regenerate-unchanged
  throwing, relation only on current view, remove keeping child view/page, `list_diagrams`
  counting boundary frames; MCP `create/update_diagram` land a C4 workspace as pages.
- 2026-09-22 (Opus): every `<details>` summary (agent connect, ADRs, style "more") uses our
  `IconChevronDown`, native marker hidden. `Checkbox` draws its own box + IconCheck/IconMinus;
  native `Select` primitive deleted (unused; `Dropdown` is the listbox).
- Placement 2026-09-22 (Opus): every shape tool ghosts its real outline under the pointer
  (`setPlacementGhost`, world-space, quick-create colours); the ghost becomes the drag box past
  the click threshold. Click-place now uses the per-shape size table (was the 160×72 default
  for every library shape — actor/folder came out squashed).
## Next
- Phase 7 — motion export ([phase-7-motion.md](docs/plan/phase-7-motion.md)), owner calls
  decided: ship 7.1 timeline → 7.2 SVG → 7.5 dialog (step chips) → 7.3 DSL → 7.4 encoders →
  7.6 agent → 7.7 audit. Zero infra: all in-browser. Keyframes/Present = phase 8 (stub written).
- 2026-09-22 (Opus): `/` reopens the last document (`ofk:last-document`, `e2e/home.spec.ts`);
  it minted a new doc per visit. Canvas menu "Open workspace folder…" hidden where
  `showDirectoryPicker` is missing (Brave default, Safari, Firefox) — was a silent no-op.
  `web/` landing site deleted (openflowkit.com lives in another repo); docs-site stays.
- Owner feel-test on `/`: paste the C4 example, drill 3 levels, play a flow, run `drift`.
- Touch 2026-09-22 (Opus): `useV2Touch` synthesises what touch lacks — two fingers pinch/pan
  (`pinchCamera`, stateless from the gesture start), second tap ≤300 ms/24 px is a double-tap,
  500 ms still press dispatches `contextmenu`. `dblclick` ignored after a touch pointer. ≤600 px
  the workspace rail drops under the document bar. `scripts/touch-probe.mjs` (headed) proves
  all three on a 390 px viewport. Known: style bar can still cover the left rail on phones.
  Dev servers on 5173/4173 had a stale Vite dep cache (pixi loaded twice → blank page); restart.
- Model JSON is copied onto every view frame (~3 KB/page today). Moving it to one
  document-level slot means `serialize(frame)` needs the document — an API change across
  Edit-as-code, `get_diagram`, folder save. Do it when a workspace passes ~20 views.

## Deferred
- Phase 6: **6.6 frames/tools** (phones/tablet/browser presets, row/column split, laser
  pointer) and **6.7 wireframe widgets** (40 `widget` kinds + `wireframe` DSL family) not
  built; **6.10** audit partly done (docs + llms.txt + regenerated DSL reference shipped,
  VoiceOver sweep and the export diff not run). Reason: slice order was changed to put the
  owner's chart screenshots first, and the remaining budget went into making 6.1–6.5/6.8–6.9
  complete rather than starting two more kinds of node. Reclaimed rail space: eraser and lasso
  are keyboard-only (X/Q) until 6.6 builds the Insert panel; sticky markers and laser are
  missing with them.
- Phase 6 ceilings marked in code: chart data panel commits per blur (not per keystroke);
  image aspect lock is Shift-lock (the inverse of the spec's default); pen strokes with
  pressure samples skip Catmull-Rom; the venn outline is the union envelope (no lens fill).
- Drafts (5.5) model diff/merge not built. Plan checks not run: 10 GitHub Structurizr
  workspaces (4 shipped), discovery precision on 3 OSS repos. Canvas-only content on a model
  page is not in the DSL (document JSON only, not folder save); perspectives dim, not hide.
- `drift` matches by name/tech only; Pixi stray `1` glyph after repeated generates; group
  top-level only; crude `person`; no hand-drawn stroke; PDF = print dialog; no zip export;
  docs-site prose outside mcp-server/github-embed/dsl-reference is V1-era; bridge is long-poll.
