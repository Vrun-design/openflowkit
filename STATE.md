# State

Plan: [docs/plan/README.md](docs/plan/README.md). Phases 0–5, no gates.
## Now
- Connect agent moved to the rail 2026-09-22 (Opus): 5th rail item + welcome button open a
  panel (`V2AgentConnect`: hero, steps when off, live card + capability grid when on); top-bar
  plug is status-only and opens the panel. No shortcut (Alt+A = align left).
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
- Review 2026-09-22 (Opus, phases 2–4): live diagnostics no longer flag valid
  sequence/class/erd lines; Mermaid → DSL fixed (alt/else, par/and, activations, note order,
  autonumber, state composites + notes, hyphenated ER names, all 32 crow's-foot tokens via one
  regex in `domain/connectors/presentation.ts`, class `..|>`, `<<iface>> X`); Canvas menu →
  Open file… (JSON export or V1 file → new doc); DSL fuzz test. Deleted 124 dead V1 files +
  8 unused deps (`mermaid`, `zustand`, …) and the `localAgent`/`agent/actions` surface
  (align+distribute already cover "tidy row"); Structurizr paste converts like Mermaid.
- Phase 5 review (Opus): fixed `X.*` predicate, empty custom views, regenerate-unchanged
  throwing, relation only on current view, remove keeping child view/page, `list_diagrams`
  counting boundary frames; MCP `create/update_diagram` land a C4 workspace as pages.
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
