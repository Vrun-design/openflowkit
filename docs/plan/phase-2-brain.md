# Phase 2 — Brain: diagram-as-code hub (week 2, parallel with phase 1)

Goal: text → diagram → text through one pipeline. Everything else (families,
Mermaid, AI, MCP) plugs into this. New pure-TS package at `src/dsl/`.

```
src/dsl/
  grammar.md          the language, versioned (v1). Written before code.
  tokenize.ts         lines → tokens (names, ->, [attrs], {blocks}, //comments)
  parse.ts            tokens → AST; forgiving; per-line diagnostics
  ast.ts              AST types (Diagram, Node, Edge, Group, Attr, Family)
  families/           one file per family: flowchart.ts, architecture.ts, ...
                      each exports { family, parse?, layout, toScene, fromScene }
  layout.ts           ELK adapter (worker); family passes ELK options
  compile.ts          text → { scene ops, diagnostics, frameMeta }
  serialize.ts        scene frame → text (deterministic)
  roundTrip.test.ts   the two laws, over every fixture in fixtures/
  fixtures/<family>/*.dsl  golden inputs (+ .expected.json)
```

Dependency rule: `src/dsl` imports `domain/` only. No React, Pixi, DOM. ELK runs in
a worker via a tiny port interface so tests can run it synchronously.

## The language (write `grammar.md` first; this is the spec)

Line-oriented. `//` comments. Blank lines ignored. `{ }` blocks span lines.
First meaningful line may name the family: `flowchart`, `architecture` (default),
`gitgraph`, `sequence`, `state`, `erd`, `class`, `mindmap`, later `bpmn`,
`orgchart`, `gantt`, `wireframe`, `chart`, `sankey`, `journey`.
Optional direction after the family: `flowchart down` / `right`.

```
Frontend -> Backend -> Database          // edges auto-declare nodes
Cache [cylinder, red, bold]              // positional attrs: shape, colour, style
api = API Gateway [aws-api-gateway]      // explicit id when label is long/duplicate
Backend -> Cache : reads                 // edge label after ':'
Backend --> Queue                        // dashed
Queue <-> Worker                         // bidirectional
group Data { Cache; Database }           // container; ';' separates on one line
group "Edge Tier" [blue] {
  CDN -> WAF
}
```

Attributes are positional and typed by vocabulary: a shape word is a shape
(`rect` default, `rounded`, `circle`, `diamond`, `cylinder`, `hexagon`, `cloud`,
`doc`, `note`), a colour word is a colour (palette names + `#hex`), `bold`/`italic`/
`dashed`/`thick` are styles, `icon-*` or a known icon id is an icon, `label: …`
overrides the label, unknown words → warning, kept in `metadata.unknownAttrs`.
Names need quotes only if they contain reserved tokens (`->`, `-->`, `<->`, `:`,
`=`, `,`, `[`, `]`, `{`, `}`, `//`, `;`). Ids are slugified labels; duplicates get
`-2`, `-3`, and the serializer emits `slug = Label` when a label is not unique.

Each family file documents its extra statements in `grammar.md` (e.g. gitgraph
`commit/branch/checkout/merge/cherry-pick`, sequence `A -> B : msg`, `loop {}`).

## Slices

### 2.1 Grammar + tokenizer + parser (flowchart/architecture subset)
- `grammar.md` v1 written and reviewed by the owner before parsing code lands.
- Tokenizer and parser for nodes, edges (all three arrows, chains), attrs, `=` ids,
  `:` labels, `group {}` nesting, family/direction header, comments, quoting.
- Diagnostics: `{ line, col, severity: 'error'|'warning', message }`. A bad line is
  skipped; parsing never throws. Bounded: 20k lines max, then a single error.
- Reserve for phase 5 (parse as plain nodes/groups now, no semantics): keywords
  `system|container|component|person|store|queue`, `view <kind> of <id>`,
  `flow "name" { ... }`, `alt {}`/`par {}`, `[tech: x]` attr, `@tag`. Reserved words
  must not be valid free-text ids.
- Check: unit tests per rule; fuzz test (random bytes never throw).

### 2.2 Compile → scene
- `compile(text, opts) → { nodes, connectors, groups, diagnostics, meta }` in page
  coordinates, using the family's layout (ELK layered for flowchart/architecture,
  direction from header). Node size from label measurement port (inject; default
  monospace estimate for tests).
- Scene mapping: DSL node → `SceneNode` (`kind` per shape, `content.label`,
  `appearance.fill/stroke`, icon in `content.icon`); edge → `SceneConnector` with
  `route.kind: 'orthogonal', ownership: 'automatic'`; group → frame node with
  children `parentId`. Every produced record carries `metadata.dsl = { id, line }`.
- The frame: one frame node wrapping the diagram with `metadata.dsl.source = text`,
  `metadata.dsl.version = 1`, `metadata.dsl.family`.
- Check: fixtures compile without diagnostics; snapshot of positions is stable.

### 2.3 Serialize (deterministic)
- `serialize(frame) → text`. Pure function of the scene: stable ordering (nodes in
  reading order top-left → bottom-right unless `metadata.dsl.line` exists, then by
  line), attrs in canonical order (shape, colour, styles, icon, label), ids only
  when needed, groups as blocks.
- Laws in `roundTrip.test.ts` over all fixtures:
  `serialize(compile(text)) === format(text)` and
  `normalize(compile(serialize(frame))) deepEquals normalize(frame)`.
  `format` = the formatter (same module): normalises whitespace/attr order.
- Check: laws pass; a hand-edited canvas (renamed node, added edge) serializes to
  sensible text.

### 2.4 ELK in a worker
- `layout.ts` with `LayoutPort { run(graph): Promise<Positions> }`; browser impl
  = `elkjs/lib/elk-worker` in a Web Worker; test impl = `elk.bundled` sync. Cancel
  in-flight layout when a new generate starts.
- Check: 500-node fixture lays out without blocking input (feel probe during
  generate: 0 dropped frames).

### 2.5 Code panel
- `⌥D` toggles a right-side panel: textarea (plain, monospace) with syntax
  highlighting via a tiny tokenizer→spans overlay (no CodeMirror; add only if
  highlighting/autocomplete cost > 300 lines), diagnostics list under it keyed to
  line, `Generate` button + `⌘↵`.
- Generate: if the panel is bound to a frame → replace frame contents as one undo
  step, keep frame id and position; else → create a frame to the right of the
  current content bounds, select it, pan to it.
- Right-click frame → "Edit as code" → panel opens with `metadata.dsl.source` (or
  `serialize(frame)` if a manual edit changed the frame since — detect via a
  content hash in `metadata.dsl.hash`). Panel shows "canvas edited — regenerate
  will overwrite" when hash differs.
- Autocomplete v1: on `[` show attr vocabulary; on line start show family names +
  existing node names. Arrow/Enter/Tab/Esc. Ctrl+Space opens.
- Check: headed: type 3 lines, ⌘↵, 3 nodes appear; edit text, ⌘↵, frame updates,
  one undo restores previous; right-click → Edit as code shows the text.

### 2.6 Icons in the language
- `[aws-lambda]`, `[gcp-pubsub]`, `[icon: kubernetes]` resolve via
  `src/services/shapeLibrary/` catalog; unknown icon → warning + plain node.
  `architecture` family default shape = icon card (icon above label).
- Check: fixture `architecture/aws-3tier.dsl` renders icons; unknown id warns.

## Done when
Flowchart + architecture families compile/serialize with the laws green; code
panel round-trips; ELK never blocks input; owner writes a 30-line architecture
diagram and edits it both ways without surprises.
