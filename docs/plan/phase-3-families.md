# Phase 3 — Families + Mermaid transpiler (week 3)

Goal: one family per day on the hub; Mermaid paste just works.

Each family = one file in `src/dsl/families/<family>.ts` + `grammar.md` section +
`fixtures/<family>/` (≥ 5 goldens incl. one ugly one) + node kinds the renderer
needs. Families share the tokenizer; each owns its statement parser, layout and
scene mapping. Families that need no ELK (gitgraph, sequence) implement layout as
pure functions.

## Slices (each ≤ 1 day; order by value)

### 3.1 gitgraph (no ELK; the demo family)
- Statements: `commit <label> [tag: v1.0] [highlight] [revert]`, `branch <name>`,
  `checkout|switch <name>`, `merge <name> [label: …]`, `cherry-pick <slug>`.
- Layout: one lane per branch (y), one column per commit in written order (x),
  branch curve from the previously active lane, merge curve back. Tags above dots.
- Scene: commits as `circle` nodes, lanes as coloured polylines (connectors with
  `route.kind: 'bezier'`, `ownership: 'imported-fixed'`), tags as text nodes.
- Check: fixtures incl. Mermaid docs examples; round-trip laws.

### 3.2 sequence
- `participant A [actor]`, `A -> B : msg`, `A --> B : reply`, `A ->> B` async,
  `activate/deactivate`, `loop|alt|opt|par <label> { … } [else { … }]`, `note over
  A,B : text`, `A -> A : self`.
- Layout: participants in order left→right, messages top→bottom; existing
  `src/services/sequenceLayout.ts` may be reused if it is pure (verify).
- Scene: participant nodes + lifelines, message connectors with markers, fragment
  frames. Check: fixtures + laws.

### 3.3 state
- `[*] -> Idle`, `Idle -> Running : start`, `state Running { … }` composite,
  `fork`/`join`/`choice`, `Running -> [*]`. ELK layered, down.

### 3.4 erd
- `users { id int pk; email text unique; org_id int fk }`,
  `users ||--o{ orders : places` (crow's-foot marks `|| |o o{ }|`). Node kind
  `table` with rows; connector markers per side. ELK.

### 3.5 class
- `class Order { +id: int; +total(): Money; -items: Item[] }`,
  `Order --|> Base` (inherit), `Order --* Item` (composition), `--o`, `..>`
  (dependency), stereotypes `<<interface>>`. Node kind `class` with compartments.

### 3.6 mindmap
- Indentation-based: root line, children by 2-space indent. Radial/tree layout
  (ELK `mrtree` or a pure radial). Node kind `rounded`, edge `bezier` no arrows.

### 3.7 Mermaid transpiler
- `src/dsl/mermaid/`: `detect(text)` (reuse `services/mermaid/detectDiagramType.ts`),
  `toDsl(text) → { dsl, losses: string[] }` per type: flowchart/graph, sequence,
  state, erDiagram, classDiagram, gitGraph, mindmap. Use `mermaid`'s own parser
  (`mermaid.mermaidAPI.getDiagramFromText`) to get the AST — do not hand-write
  Mermaid parsers; `services/mermaid/parseMermaidByType.ts` already wraps this.
- Semantics mapping written in `grammar.md` §Mermaid: `-->` → `->`, `-.->` → `-->`,
  `-->|x|` → `: x`, subgraph → group, `%%{init}%%` dropped (loss), `click`/style
  directives → attrs where possible else loss.
- Code panel: on paste/typing, if `detect` says Mermaid → banner "Mermaid detected —
  Convert" → replaces text with DSL + shows losses as warnings. Also `⌘⇧M`.
- Check: the existing Mermaid fixture corpus (`services/mermaid/*Corpus*`) converts
  with zero errors; goldens for losses.

### 3.8 Second wave (after the month, same shape): bpmn (lanes), orgchart, gantt,
wireframe, chart (bar/line/pie), sankey, journey, kanban.

## Done when
Six families + Mermaid convert pass laws and fixtures; owner pastes any Mermaid
from the Mermaid docs and gets an editable diagram with an honest loss list.
