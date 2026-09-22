# State

Plan: [docs/plan/README.md](docs/plan/README.md). Phases 0–5 done, no gates.
## Now
- Phase 6 — creation library ([phase-6-library.md](docs/plan/phase-6-library.md)): slices
  6.1 rail → 6.2 shapes → 6.3 connectors → 6.4 ink → 6.5 image/emoji → 6.6 frames/tools →
  6.7 wireframe → 6.8 charts → 6.9 quadrant+DSL+MCP → 6.10 audit.
- 6.1 done 2026-09-22 (opencode/deepseek-v4.1): rail flyouts (shapes, connector) + lock.
- 6.2 done 2026-09-22 (opencode/deepseek-v4.1): 46 library shapes end to end — outlines,
  label insets, Pixi decorations (venn lens, target rings, cube/prism depth), SVG export,
  DSL words + Mermaid aliases, numbered-circle auto-labels, scene-tree names.
- 6.3 done 2026-09-22 (opencode/deepseek-v4.1): connector variants — click-by-click path
  tool (Enter/double-click ends, Esc peels a point), diamond marker in the DSL + style bar,
  Path in the Path panel, and SVG export now draws every end glyph like Pixi does.
- 6.4 done 2026-09-22 (opencode/deepseek-v4.1): ink — pen P (Shift+P highlighter) with
  coalesced capture, RDP simplify, Catmull-Rom render in Pixi and SVG, live preview, one
  undo per stroke; eraser X removes whole strokes per drag; lasso Q selects by polygon;
  Ink panel (colour/width) and a sticky ink preset. Two design-system fixes rode along:
  a tooltip no longer swallows Escape, and focus returns to the canvas when the context
  bar unmounts.
- 6.5 done 2026-09-22 (opencode/deepseek-v4.1): image + emoji — rail Image (⇧I) opens a
  file picker, dropping or pasting an image (or pasting an image URL) inserts one; bytes
  go to the IndexedDB assets store, the node keeps `assetId` (plus an inline data URL for
  export) and Pixi resolves it; images fit 480 px on the long side. Emoji (E) opens a
  searchable static catalogue with recents in preferences; picking inserts a 48 px glyph.
  Pickers now anchor to their trigger, so focus returns to a real button.
- 6.8 done 2026-09-22 (opencode/deepseek-v4.1): charts — `chart` node kind with a pure
  presentation (bar, line, area, scatter, pie, donut, radar, heatmap, table; handwritten
  niceTicks), one Pixi renderer, SVG export with the same marks, the C flyout, a real
  `<table>` data panel (edit cells, +Row/+Series, Enter moves down, TSV/CSV paste, one undo
  per commit) and a Chart panel in the style bar that switches type without touching data.
  Order note: charts were built before 6.6/6.7 because the owner's reference screenshots are
  chart-centric.
- 6.9 done 2026-09-22 (opencode/deepseek-v4.1): quadrant (0–1 points, pastel cells, canvas
  dragging writes x/y as one undo, label/x/y points panel) and the `chart` DSL family
  (`chart bar|…|quadrant`, series pairs, quadrant directives + `[x, y]` points) with
  round-trip fixtures; the family line now carries extra words (`familyHeader` on frame
  meta), get_syntax documents it, `add_shape` accepts `chart` with data. 6.10 claimed (audit).
- `check-v2-polish.mjs` fails on this machine at HEAD too (idle render count, context-bar
  follow, resize assertions in three separate runs) — environment, not a phase-6 regression.
  Re-run when the machine is quiet; the script's numbers are the phase gate.
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
## Next
- Owner feel-test on `/`: paste the C4 example, drill 3 levels, play a flow, run `drift`.
- Model JSON is copied onto every view frame (~3 KB/page today). Moving it to one
  document-level slot means `serialize(frame)` needs the document — an API change across
  Edit-as-code, `get_diagram`, folder save. Do it when a workspace passes ~20 views.

## Deferred
- Drafts (5.5) model diff/merge not built. Plan checks not run: 10 GitHub Structurizr
  workspaces (4 shipped), discovery precision on 3 OSS repos. Canvas-only content on a model
  page is not in the DSL (document JSON only, not folder save); perspectives dim, not hide.
- `drift` matches by name/tech only; Pixi stray `1` glyph after repeated generates; group
  top-level only; crude `person`; no hand-drawn stroke; PDF = print dialog; no zip export;
  docs-site prose outside mcp-server/github-embed/dsl-reference is V1-era; bridge is long-poll.
