# State

Plan: [docs/plan/README.md](docs/plan/README.md). Phases 0–5 done, no gates.
## Now
- Phase 6 — creation library ([phase-6-library.md](docs/plan/phase-6-library.md)): slices
  6.1 rail → 6.2 shapes → 6.3 connectors → 6.4 ink → 6.5 image/emoji → 6.6 frames/tools →
  6.7 wireframe → 6.8 charts → 6.9 quadrant+DSL+MCP → 6.10 audit. 6.1 claimed
  2026-09-22 (opencode/deepseek-v4.1).
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
