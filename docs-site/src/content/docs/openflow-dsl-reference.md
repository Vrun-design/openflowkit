---
title: OpenFlow DSL reference
description: The complete, versioned OpenFlow DSL grammar — families, statements, attributes, canonical form.
---

:::note[Generated]
This page is generated from `docs/plan/grammar.md` in the repository by
`npm run generate:dsl`. Edit the grammar, not this file.
:::


Contents: §0 prior art · §1 goals and where we lose · §2 lexical rules · §3 header and
directives · §4 core statements · §5 attributes · §6 ids, ordering, canonical form,
round-trip · §7 layout hints · §8 families · §9 model layer (phase 5 reservations) ·
§10 error model · §11 import loss tables · §12 versioning · §13 agent contract ·
§14 worked examples (golden tests) · Appendix A `get_syntax` cheat-sheet.

---

## 0. Prior art (verified 2026-09-21 by fetching each page listed)

### 0.1 Koboyo — https://koboyo.com/docs

Pages read: `/docs/syntax`, `/docs/attributes`, `/docs/reference`, `/docs/architecture`,
`/docs/flowcharts`, `/docs/sequence-diagrams`, `/docs/state-machines`,
`/docs/entity-relationship`, `/docs/class-diagrams`, `/docs/mind-maps`, `/docs/git-graphs`,
`/docs/editing`, `/docs/error-handling`, `/docs/import-mermaid`, `/docs/import-eraser`,
`/docs/mcp-server`.

What they have: first line optionally names the family (`flowchart`, `bpmn`, `orgchart`,
`statemachine`, `sequence`, `erd`, `class`, `wireframe`, `mindmap`, `gitgraph`, `gantt`,
`sankey`, `timeline`, `journey`, `cycle`, `funnel`, `pyramid`, `venn`, `matrix`, `chart bar`),
default `architecture`. Nodes `Name [attrs]` / `id = Name [attrs]`, labels slugified to
ids. Quote a name only when it contains `->`, `<->`, `-->`, `:`, `=`, `,`, `[`, `]`, `{`,
`}`, `//`. Edges `->`, `<-`, `<->`, `-->`, `<--`, `<-->`, label after `:` to end of line
(or to a trailing `[…]`), fans `A -> B, C` and `A, B -> C`, chains. `group Name [color] { }`
nests; `[group: Name]` also places. Directives `title:`, `direction:` (right/down/left/up),
`icons:` (inside/badge), `colorMode:`. Positional attribute vocabulary: 45+ shapes with
aliases, nine palette colours (hex/CSS snap to nearest), fill modes `pastel|bold|outline`,
`shadow`, `rounded|sharp`, icons `set/name` (`aws/lambda`) or bare known names, key:value
escape hatch (`icon`, `color`, `shape`, `fill`, `label`, `link`, `head:` circle/cross/arrow,
`flow`, `invisible`). Unknown attribute word = diagnostic, rest of the line still applies.
Diagnostics keyed to line; warning = something ignored, error = whole line unparseable;
nothing stops rendering. Duplicate ids: first wins, later ones fill unset attributes.
Editing: "Manual shape edits … do not update the stored source"; serializer is "a pure
function of the diagram", "re-serializing reproduces the text byte for byte". Mermaid
import covers every Mermaid type, flips `-->`→`->`, `-.->`→`-->`, drops `init` directives,
image nodes, sequence `box`/`rect`. Eraser import maps `>`→`->`, `[icon: aws-ec2]`→
`[aws/ec2]`, comments out `styleMode`/`typeface`. MCP: `get_syntax` = "cheatsheet for one
diagram kind, with examples that work"; `update_diagram` redraws a frame from new code,
keeps id; parameters and patch model undocumented.

| Feature | They | We | Why |
|---|---|---|---|
| Family = optional first line, default architecture | yes | adopt | zero-ceremony sketches; `architecture` default matches our icon-first product |
| Names double as ids, slugified | yes | adopt | agents and humans write labels, not ids |
| Quote only when reserved token present | yes | adopt + extend | same list plus reserved keywords in statement position (§2.4) |
| Edges auto-declare nodes | yes | adopt | forgiveness |
| Positional attrs typed by vocabulary | yes | adopt | no key soup; LLMs emit `[cylinder, red]` reliably |
| key:value escape hatch | yes | adopt | needed for `label:`, `pin:`, `tech:` |
| Unknown attr word = warning, rest applies | yes | adapt | we also **keep** unknown words (re-emitted at tail) so round-trip never silently loses text |
| Duplicate declaration: first wins, later fills gaps | yes | adopt | forgiving, deterministic |
| Fans `A -> B, C` | yes | adopt (input only) | canonical form expands to one edge per line (§6.4) |
| `[group: Name]` placement attr | yes | reject | two ways to say membership breaks canonical uniqueness; blocks only |
| `icons: badge/inside` directive | yes | reject in v1 | renderer concern, not language; per-node `[badge]` style later if asked |
| Nine-colour palette, hex snaps to nearest | yes | adapt | palette names canonical; `#hex` kept verbatim (we render true colour, they snap) |
| Manual edits don't rewrite code | yes | adopt | README §2 contract |
| Byte-for-byte deterministic serializer | yes | adopt + define | we write down the canonical form (§6); they don't publish it |
| Diagnostics per line, never fatal | yes | adopt + codes | we add stable codes + col + hint (§10) so MCP clients can branch on them |
| 20 families incl. venn/funnel/pyramid | yes | later | phase 3 ships 8; the rest are header-only reservations |
| Legends `legend { key: meaning }` | yes | later | reserve keyword, no semantics in v1 |

### 0.2 LikeC4 — https://likec4.dev

Pages read: `/dsl/model/`, `/dsl/views/`, `/dsl/views/predicates/`, `/dsl/views/dynamic/`,
`/dsl/deployment/model/`, `/dsl/styling/`.

What they have: `specification { element kind; relationship kind; deploymentNode kind }`
then `model { }` with `kind name 'Title' 'tech'` or `name = kind 'Title'`, unlimited
nesting, dotted paths (`cloud.api`), properties in a block (`title`, `summary`,
`description`, `technology`, `#tag` first, `link`, `metadata {}`), relations `a -> b`,
`a -[kind]-> b`, nested `this -> x`. `views { view name of element { include/exclude … } }`;
predicates: `element`, `element.*` (children), `element.**` (descendants), `element._`
(expand), `a -> b`, `-> a`, `a ->`, `-> a ->`, `a <-> b`, `where kind is X and tag is not
#y`, `with { title color navigateTo }`, `style * { }`, `group 'name' { include }`,
`autoLayout LeftRight 120 110`, `rank same { a, b }`, `extends`. Dynamic views: `dynamic
view name { a -> b 'label'; a <- b; par {}; alt { when 'x' {} else {} }; loop; opt; break;
try/catch }`, variants `diagram|sequence`. Deployment: `deployment { environment prod { zone
eu { api = instanceOf backend.api } } }`, relations between instances. Styling: colours
`primary secondary muted amber gray green indigo red`, shapes `rectangle component storage
cylinder browser mobile person queue bucket document`, `border`, `opacity`, `multiple`,
icons `aws: azure: gcp: tech:`, relation `line`, `head`, `tail`.

| Feature | They | We | Why |
|---|---|---|---|
| Model / views split | yes | adopt (phase 5) | one object many views is the whole point of C4 tooling |
| Element kinds user-defined in `specification` | yes | reject | fixed C4 vocabulary (`person system container component store queue external`) — agents can't guess a bespoke spec; `[kind: x]` attr covers custom |
| Dotted paths `cloud.api` | yes | adopt (model only) | needed for nested reuse; `.` reserved in explicit ids (§2.5) |
| `name = kind 'Title'` | yes | adapt | ours is `kind Title [attrs]` / `id = kind Title [attrs]` — label-first like the rest of the language |
| `#tag` prefix | yes | adapt | `@tag` (`#` collides with `#hex` colours in our attr lists) |
| include/exclude predicates with `*`, `.*`, `.**`, `->` | yes | adopt subset | `.*`, `.**`, `->` forms; `where` clauses only `kind is`/`tag is`; no `._`, `with {}` in v1 |
| `where` on metadata | yes | reject | metadata filtering is a query language; YAGNI |
| Dynamic views with `par/alt/loop/opt/break` | yes | adopt as `flow` | maps 1:1 onto IcePanel's 8 step kinds + sequence family |
| `try/catch/finally` blocks | yes | reject | no diagramming tool renders them distinctly |
| Deployment model + `instanceOf` | yes | adopt (`deployment {}` + `instance`) | Structurizr refugees need it |
| `rank same {}` / `autoLayout dir` | yes | adopt | our `align` statement and family-line direction |
| Manual layout in `.snap` sidecar that fights model | yes | reject | pins live in text (`[pin:]`) or in the frame; never a sidecar |
| Graphviz layout | yes | reject | ELK in worker; their #1 pain |

### 0.3 Structurizr DSL — https://docs.structurizr.com/dsl/language, /dsl/expressions, /dsl/cookbook/*

What they have: `workspace [name] [desc] { model { } views { } }`; `person`, `softwareSystem`,
`container name [desc] [tech] [tags] { component … }`, `deploymentEnvironment { deploymentNode
{ containerInstance id } infrastructureNode }`; identifiers `x = container "Name"`,
`!identifiers hierarchical|flat`; relationships `a -> b [desc] [tech] [tags]` and scoped
`-> b`; `!impliedRelationships true|false` using
`CreateImpliedRelationshipsUnlessAnyRelationshipExistsStrategy` (a child→child relation
implies parent→parent unless any relation already exists there); `!include file|url`;
views `systemLandscape`, `systemContext id`, `container id`, `component id`, `dynamic scope`,
`deployment scope env`, each with `include *|id|expr`, `exclude`, `autoLayout tb|lr …`;
expressions `element.type==Container && element.parent==x`, `->id`, `id->`, `->id->`,
`*->*`, `relationship.tag==`; `styles { element "Tag" { } }` with `light/dark`; `properties`,
`perspectives`, `!docs`, `!adrs`, `group`, `url`. Strings quoted with `"`.
Cloud EOL: workspaces read-only since 1 Jul 2026, shutdown 30 Sep 2026
(https://www.patreon.com/posts/cloud-service-of-142577083,
https://www.archyl.com/blog/structurizr-cloud-shutdown-what-to-do).

| Feature | They | We | Why |
|---|---|---|---|
| workspace/model/views | yes | adopt shape, drop `workspace` | our file *is* the workspace; `model {}` and `views {}` blocks reserved |
| C4 element kinds | yes | adopt | same names minus `softwareSystem` → `system`; importer renames |
| `desc tech tags` positional strings | yes | adapt | ours are attrs `[tech: Go, desc: "…"]` and `@tag` — one attr syntax everywhere |
| Implied relations | yes | adopt same strategy | proven rule; importer parity |
| `!include` | yes | reject in v1 | local-first single file; phase 5.7 workspace folder revisits |
| `!identifiers hierarchical` | yes | adopt as the only mode | dotted paths; flat mode is a footgun the importer resolves |
| View kinds by C4 level | yes | adopt | `view context of X`, `view container of X`, `view component of X`, `view landscape`, `view deployment of X in Env` |
| Expression language `element.type==` | yes | adapt | `where kind is container` — words, not operators, so LLMs emit it right |
| `styles` by tag | yes | later | `[…]` attrs on elements cover 90 %; tag styles phase 5.5 |
| `!docs`, `!adrs`, `perspectives` | yes | reject / phase 5.5 | `[link:]` attr covers ADR pointers |
| Dynamic view step numbering by order | yes | adopt | `flow` steps numbered in line order |

### 0.4 Mermaid — https://mermaid.js.org/syntax/*

Pages read: `flowchart`, `sequenceDiagram`, `stateDiagram`, `classDiagram`,
`entityRelationshipDiagram`, `gitgraph`, `mindmap`, `userJourney`, `architecture`.

What must transpile losslessly (per type, verified against the pages):
- **flowchart/graph**: directions `TD TB LR RL BT`; shapes `[ ] ( ) ([ ]) [[ ]] [( )] (( ))
  > ] { } {{ }} [/ /] [\ \] [/ \] [\ /] ((( )))` and `@{ shape: … }` (≈50 names incl.
  `cyl`, `diam`, `hex`, `doc`, `docs`, `person`, `cloud`, `bolt`, `flag`, `fork`, `st-rect`);
  links `--> --- -.-> -.- ==> === ~~~ --o --x <-->`, lengths by extra dashes, text
  `-- t -->` / `-->|t|`; chains; `&` fans; `subgraph id[title] … end` with `direction`;
  `style`, `classDef`, `class`, `:::`, `linkStyle`, `click`, `%%` comments, `---config---`
  front-matter, markdown strings.
- **sequenceDiagram**: `participant/actor X as Y`, stereotypes (boundary, control, entity,
  database, collections, queue), `create/destroy`, `box`, arrows `-> --> ->> -->> <<->> -x
  --x -) --)`, `+`/`-` activation, `note over|left of|right of`, `loop alt else opt par and
  critical option break`, `rect`, `autonumber`, `link`.
- **stateDiagram-v2**: `[*]`, `state "desc" as id`, `id : desc`, `a --> b : label`,
  `state id { }`, `--` concurrency, `<<fork>> <<join>> <<choice>>`, notes, `direction`,
  `classDef`.
- **classDiagram**: `class X { }`, `X : +int id`, visibility `+ - # ~`, `$` static, `*`
  abstract, generics `~T~`, `<<interface>>`, arrows `<|-- *-- o-- --> -- ..> ..|> ..`,
  cardinality `"1" -- "*"`, `: label`, `namespace { }`, `note for`.
- **erDiagram**: `E { type name PK "comment" }`, keys `PK FK UK`, `?` nullable, crow's foot
  `|o || }o }|` with `--`/`..`, word aliases (`one or zero`, `many(0)`), `["Display"]`
  aliases, `direction`.
- **gitGraph**: `commit id: type: NORMAL|REVERSE|HIGHLIGHT tag:`, `branch x order: n`,
  `checkout|switch`, `merge x id: tag: type:`, `cherry-pick id: parent:`, orientation
  `LR|TB|BT`, config `mainBranchName parallelCommits showBranches showCommitLabel`.
- **mindmap**: relative indentation, `root(( ))`, shapes `[ ] ( ) (( )) )( ) ( {{ }}`,
  `::icon()`, `:::class`, `tidy-tree` layout.
- **journey**: `title`, `section`, `Task: score: Actor1, Actor2` (score 1–5).
- **architecture-beta**: `group id(icon)[title] in parent`, `service id(icon)[title] in g`,
  `junction`, edges `a:L -- R:b`, `<-- -->`, `{group}` suffix, `align row|column`, icons
  `cloud database disk internet server` + iconify `pack:name`.

| Feature | They | We | Why |
|---|---|---|---|
| Node shape by bracket type `A[( )]` | yes | reject | unreadable, un-emittable; positional word attrs instead |
| `-->` solid arrow | yes | flip | `->` solid, `-->` dashed — Koboyo/D2/Eraser agree; importer flips |
| `&` fans, chains | yes | adopt (`,` fans) | input sugar; canonical expands |
| `subgraph … end` | yes | adapt | `group … { }` |
| `classDef`/`style`/`linkStyle` | yes | adapt | folded into attrs where a palette/shape matches; else loss |
| `%%{init}%%` / front-matter config | yes | reject (loss) | renderer config, not diagram content |
| `click` | yes | adapt | `[link: url]`; callbacks dropped |
| sequence `box`, `rect`, `critical/option` | partial | adapt | `box` → `group` of participants; `rect` dropped; `critical/option` → `alt/else` |
| `autonumber` | yes | adopt | `autonumber` directive line |
| state `[*]` | yes | adopt | verbatim; it is the one token everyone knows |
| ER word aliases (`one or zero`) | yes | reject | crow's-foot glyphs only in canonical; importer converts |
| gitgraph `order:`, `parallelCommits` | yes | reject | lane order = declaration order |
| mindmap bracket shapes | yes | adapt | `[circle]` etc. attrs on the bullet |
| `architecture-beta` edge sides `a:L -- R:b` | yes | adapt | `[from: left, to: right]` attrs — port hints survive round-trip |
| Markdown in labels | yes | reject in v1 | plain text; `\n` for line breaks |

### 0.5 D2, Eraser, PlantUML-C4 — one paragraph each

**D2** (https://d2lang.com/tour/connections, /tour/composition, verified 2026-09-21).
Better than all of the above at: composition — `layers` (new base), `scenarios` (inherit
base), `steps` (inherit previous step) give multi-board documents from one file; connections
referenced by index `(a -> b)[0]` so styling a specific edge is precise; repeated
connections create new edges instead of overriding; crow's-foot arrowheads on any edge
(`cf-one`, `cf-many`); `d2 fmt` autoformatter. We adopt: repeated edges = new edges;
`format()` as a first-class function; the idea that a view/step inherits (our `flow` steps,
phase 5). We reject D2's `key: label` container-by-dot addressing (`a.b.c`) for free-text
nodes — labels are our keys — but use dotted paths for model elements only.

**Eraser** (https://docs.eraser.io/docs/syntax, verified 2026-09-21). Better at: the
tersest connector set (`>`, `<`, `<>`, `-`, `--`, `-->`) and `Name { }` as a group with no
keyword; `colorMode`/`styleMode`/`typeface` document directives; no header — family is
detected from content. We adopt: `Name { }` as group shorthand in graph families (canonical
still emits `group`). We reject `>` arrows (they collide with `->`/`->>` and with nothing
an LLM already knows) and family auto-detection (an explicit header is one line and makes
`get_diagram` unambiguous; the Eraser importer prepends it).

**C4-PlantUML** (https://github.com/plantuml-stdlib/C4-PlantUML, verified 2026-09-21).
Better at: a fixed macro vocabulary an LLM has memorised (`Person(alias, label, descr)`,
`Container(alias, label, techn, descr)`, `System_Boundary(alias, label) { }`, `Rel(from,
to, label, techn)`, `Rel_D/U/L/R`, `BiRel`, `Deployment_Node`, `Lay_D/Lay_R`); legends
(`SHOW_LEGEND`); sprites from any icon set; entirely offline. We adopt: positional
`[tech]`/`desc` on elements and relations; `Lay_*` becomes `align`/`[rank:]`. We reject
the macro syntax itself (parentheses and commas make every label need escaping) and
positional description strings (ours are keyed attrs).

---

## 1. Goals and honest losses

Goals, in priority order: (a) forgiveness — any text yields the best diagram it can plus
diagnostics; (b) round-trip — two laws (§6.6) hold for every fixture; (c) agent
emit-ability — every construct fits Appendix A; (d) C4 model reuse — one element, many
views, without a second grammar.

Where we are consciously worse:
- **Terser than Eraser? No.** Every edge is a full `A -> B` line in canonical form; chains
  and fans are accepted but expanded. Cost: longer canonical text. Gain: line = statement,
  so patches, diffs and diagnostics are one-to-one.
- **Fewer shapes than Koboyo (45+).** v1 ships 16 shape words (§5.1). Cost: some Mermaid
  `@{shape}` names degrade to `rect` with a warning. Gain: every shape has a Pixi renderer
  before the word exists in the grammar (README §3 "honest").
- **No user-defined element kinds (LikeC4 `specification`).** Cost: bespoke taxonomies use
  `[kind: x]` and get plain styling. Gain: agents never need to read a spec block first.
- **No Markdown in labels, no `!include`, no multi-board composition in v1.** Cost: D2
  layers/scenarios and Structurizr `!include` import as flattened text with a warning.
- **Keywords are case-sensitive lowercase.** `Group -> X` is a node named "Group". Cost:
  an LLM that capitalises `Flowchart` gets a node instead of a family (with warning W110
  "did you mean the family header?"). Gain: no ambiguity, no heuristic retry pass.

---

## 2. Lexical rules

### 2.1 Lines
- Input is UTF-8 text, split on `\n` (`\r\n` accepted; canonical is `\n`, trailing newline).
- One statement per line. `;` separates statements on one line (accepted; canonical never
  emits `;`). A `{` at end of a line opens a block that closes at a line containing only
  `}`. A block may also open and close on one line: `users { id uuid pk; email text }`.
  Blocks nest. An unclosed block at EOF closes
  with warning W103 at the opening line.
- Blank lines and whitespace-only lines are ignored. Leading whitespace is insignificant
  except in `mindmap` (§8.8) where indentation is the structure.
- Hard limit 20 000 lines; beyond it parsing stops with one error E002 and the diagram so
  far is used.

### 2.2 Comments
- `//` to end of line is a comment, unless inside a quoted string or glued to a word:
  a comment needs a whitespace boundary (or line start) before it, so `[link: https://…]`
  and `https://…` in a label stay one token. Full-line comments are
  preserved by `format()` and by `serialize()` only when they were parsed
  (`metadata.dsl.comments` keyed by the following statement's line); a comment with no
  following statement is kept at end. Trailing comments are dropped with info I001 —
  tradeoff: keeping them would need a per-statement slot; nobody has asked.
- `%%` is *not* a comment. It is only valid as the version pragma (§3.1). Any other line
  starting with `%%` is dropped with warning W101 and the hint "Mermaid comment? Paste as
  Mermaid to convert."

### 2.3 Tokens
Reserved punctuation: `->` `-->` `<->` `<-->` `<-` `<--` `--` `->>` `-->>` `--|>` `..|>`
`*--` `o--` `..>` `||` `|o` `o|` `}|` `|{` `}o` `o{` `..` `:` `=` `,` `[` `]` `{` `}` `//`
`;` `@` `"`. Which arrows are live depends on the family (§8); a family that does not know
an arrow treats it as text and warns W111.

### 2.4 Names and quoting
- A **name** is any run of characters that contains none of the reserved punctuation
  above, trimmed. Spaces and Unicode are fine: `API Gateway`, `Zahlungs-Service` (a single
  `-` is fine; only `--`, `->` … are reserved).
- Quote with `"…"` when a name contains reserved punctuation or **starts with a reserved
  keyword** (§2.5): `"Cache: L2"`, `"group"`, `"state machine"`. Inside quotes `\"` is a
  quote and `\\` a backslash; `\n` is a line break in the label. Nothing else is escaped.
- Names are trimmed and internal whitespace collapsed to one space.
- The **escape rule for reserved words**: a keyword is only a keyword as the first token of a
  statement (after optional `-` bullet in mindmap). Anywhere else it is a name. `A -> group`
  is an edge to a node named "group". At statement start, `group` is the keyword; write
  `"group"` for the node. The serializer always quotes a label whose exact text is a
  keyword, wherever it appears — so canonical text is unambiguous regardless of position.

### 2.5 Reserved keywords (all lowercase, statement position only)
- Header/family: `flowchart architecture sequence state erd class mindmap gitgraph bpmn org
  gantt wireframe chart sankey journey timeline`.
- Directives: `title direction autonumber legend align`.
- Structure: `group note`.
- Sequence: `participant activate deactivate loop alt else opt par and break`.
- State: `state fork join choice`.
- Gitgraph: `commit branch checkout switch merge cherry-pick`.
- Mindmap: `central`.
- **Reserved for phase 5 (parsed as plain nodes/groups today, kind preserved):** `model
  views view person system container component store queue external deployment node
  instance flow step goto include exclude extends rank pin`.

Keyword arguments (e.g. `view context of X`) are parsed only inside their statement.

### 2.6 Explicit ids
`id = Label`. An explicit id matches `[A-Za-z_][A-Za-z0-9_-]*`. `.` is reserved for model
paths (§9.2); in a non-model statement `a.b = X` → warning W120 and the id is slugified
(`a-b`). Ids are case-sensitive; slugs are lowercase.

---

## 3. Header and directives

### 3.1 Version pragma
```
%% ofk 1
```
Optional on input, first non-blank line when present. Always emitted first by the
serializer. Missing → assumed current version, info I002. Higher than current → warning
W001, parsed as current. See §12.

### 3.2 Family line
```
<family> [<direction>]
flowchart right
sequence
```
Optional; first non-blank line after the pragma. Missing → `architecture`, info I003.
Unknown word in that position is a node (a diagram can legitimately start with a node), so
the parser also emits W110 when the first statement is a single bare word that
case-insensitively equals a family name. Directions: `down` (default for flowchart, state,
gitgraph=`right`, mindmap radial), `right`, `left`, `up`. Aliases accepted, not canonical:
`TB TD LR RL BT`, `top-down`, `left-right`.

### 3.3 Directives
```
title: Image upload service
direction: right            // same as on the family line; family line wins if both
appearance: paper           // diagram palette: pastel | paper | builder | mono
autonumber                  // sequence only
legend { key: meaning }     // reserved, parsed and re-emitted, not rendered in v1
```
Canonical: `title:` is the third line (after pragma and family), `appearance:` the
fourth. `direction` is folded into the family line. Directives elsewhere in the file
are hoisted, warning W104 if a directive repeats (first wins); an unknown `appearance`
value is W102 and the default palette applies.

`appearance:` picks the palette colours are resolved from at compile time — the
language keeps using colour words, the palette decides their hex. `pastel` is the
default and is never emitted; a non-default palette is recorded on the frame and on
every node it compiled, so the renderer and the serializer can resolve the same way
without knowing the document. Palettes: `paper` (warm stock, dark ink), `builder`
(neutral cards, brand orange accent), `mono` (greyscale, for print).

---

## 4. Core statements (all graph families: flowchart, architecture, state, erd, class,
   plus model blocks)

```
Name                                 // declare node
Name [attr, attr, key: value]        // declare with attributes
id = Name [attrs]                    // explicit id
A -> B                               // edge; A and B auto-declared
A -> B : label                       // label runs to end of line or to trailing [attrs]
A -> B : label [dashed, red]         // edge attributes
A -> B -> C                          // chain (input only)
A -> B, C                            // fan out; A, B -> C fan in (input only)
group Name [attrs] {                 // container; nodes first seen inside are members
  Member [attrs]
  Other
}
group id = Name [attrs] { … }        // explicit group id
Start [ellipse] -> Check [diamond] : ok [thick]   // inline node attrs (see below)
Name {                               // group shorthand (graph families), canonical = group
  Member
}
note Name : text                     // sticky attached to a node (all families)
```

Edge arrows in graph families:

| arrow | canonical | meaning |
|---|---|---|
| `->` | yes | solid, arrow at target |
| `-->` | yes | dashed, arrow at target |
| `<->` | yes | solid, both ends |
| `<-->` | yes | dashed, both ends |
| `--` | yes | solid line, no heads |
| `<-` `<--` | no | reversed; canonical swaps endpoints and emits `->` / `-->` |

Inline attrs on an edge line: a `[…]` that is followed by an arrow or by `:` belongs to
the node it follows; a `[…]` after the label belongs to the edge. A `[…]` at end of line
with no label is split by vocabulary: edge flags (`dashed`, `thick`, `invisible`, `flow`)
and edge keys (`head:`, `tail:`, `from:`, `to:`, `label:`) stay on the edge, everything
else (shape, colour, fill, `shadow`, icon, `tech:`…) lands on the target node — so
`A -> B [dashed, red]` is a dashed edge to a red B and `A -> B [from: right]` exits B's
left. Canonical never emits node attrs inline — the node gets its own declaration line.

Node membership: a node belongs to the innermost group in which it is **first declared or
first mentioned**. Mentioning an already-declared node inside another group does not move
it (warning W121 "already in group X"). A node with no group is top-level.

Repeated edges between the same pair create parallel edges (D2 rule), each with its own
line; the serializer orders them by line.

---

## 5. Attributes

`[` comma-separated list `]`. Each item is a bare **word** or `key: value`. Words are typed
by vocabulary; the same word means the same thing everywhere. Two words of the same type
→ last wins, warning W130. Unknown word → warning W131, kept verbatim in
`metadata.dsl.unknownAttrs` and re-emitted last (round-trip safe).

### 5.1 Vocabulary (v1)
- **shape** (nodes): `rect` (default), `rounded`, `circle`, `ellipse`, `diamond`,
  `cylinder`, `hexagon`, `cloud`, `doc`, `note`, `parallelogram`, `person`, `queue`,
  `component`, `browser`, `mobile`. Aliases (not canonical): `box`→`rect`, `oval`→`ellipse`,
  `decision`→`diamond`, `database`/`db`/`storage`→`cylinder`, `document`→`doc`,
  `actor`/`user`→`person`, `io`/`data`→`parallelogram`, `start`/`end`/`terminator`→`ellipse`.
- **colour**: `blue green red orange violet teal pink yellow gray` or `#rgb`/`#rrggbb`.
  Aliases `grey`→`gray`, `purple`→`violet`. Hex kept verbatim (lowercase canonical).
- **fill**: `pastel` (default, not emitted), `bold`, `outline`.
- **style flags**: nodes `shadow`; edges `dashed` (same as `-->`; canonical uses the arrow),
  `thick`, `invisible`, `flow` (animated). Text: `italic`, `bold-text` — reserved, W131 in v1.
- **icon**: `set/name` (`aws/lambda`, `gcp/pubsub`, `tech/react`) resolved against
  `src/services/shapeLibrary` packs; a bare word that is a known icon name (`server`,
  `database` — note `database` is a shape alias first; use `icon: database` to force).
  Unknown → W132, plain node.
- **edge heads**: `head: arrow|circle|cross|none`, `tail: none|arrow|circle|cross`,
  `from: top|right|bottom|left`, `to: …` (port side hints, §7).
- **keys**: `label:` (override display label; needed when the id is the name), `link:`,
  `tech:`, `desc:`, `kind:`, `tags:` (comma list; `@tag` is sugar, §9), `pin:` (`x,y`),
  `rank:` (int), `width:`/`height:` (px), `icon:`, `color:`, `shape:`, `fill:`.
  Key values containing `,` or `]` must be quoted.

### 5.2 Canonical attribute order
`shape, colour, fill, flags (shadow, thick, invisible, flow), icon, head/tail, from/to,
label, tech, desc, kind, tags, link, pin, rank, width, height, unknown…`. Within a class,
canonical spelling from the tables above. Defaults are never emitted (`rect`, `pastel`,
`head: arrow`). An empty list is not emitted. `pin:` is written `pin: "x,y"` (a comma
inside a value is quoted); `pin: 240,80` is accepted on input.

Rendering notes (v1): every shape word above maps onto a renderer primitive — `rect`/
`rounded`/`component` are boxes (component keeps its word for round-trip), `person` is
the actor glyph with its label below, `note` is a sticky, `browser`/`mobile` are wireframe
frames, and a node with a resolved `icon` renders as an icon card with the label beneath.
The nine palette words map onto the app palette: `green`→emerald, `orange`→amber,
`gray`→slate, `teal`→cyan.

---

## 6. Ids, ordering, canonical form, round-trip

### 6.1 Id derivation (deterministic)
`slug(label)`: NFKD-normalise, strip combining marks, lowercase, replace every run of
non-`[a-z0-9]` with `-`, trim `-`; empty → `n`. Duplicates in **line order** get `-2`, `-3`
… (`API` twice → `api`, `api-2`). Explicit `id = Label` overrides; if that id was already
taken by a slug, the slug holder is renumbered (declared ids win over derived ones) and
info I010 explains it. Ids are stable across re-parses of the same text — required for
`metadata.dsl.id` to match scene node ids between generates so the frame keeps positions
of unchanged nodes.

### 6.2 When the serializer emits `id = Label`
Only when `slug(label) != id`: explicit ids that differ from the slug, or duplicate labels
(`api-2 = API`). Otherwise the name alone.

### 6.3 Declaration necessity
A node line is emitted only if the node (a) has attributes, (b) has an explicit id, (c)
belongs to a group, or (d) has no edges. Everything else is auto-declared by its edges.

### 6.4 Canonical form
`format(text) = serialize(parse(text))`. Canonical text is exactly:
1. `%% ofk 1`
2. family line with direction only if not the family default
3. `title: …` if present
4. one blank line if 5–7 is non-empty
5. top-level node declarations needing emission (§6.3), in order (§6.5)
6. groups as blocks, in order; inside: member declarations, nested groups, then edges whose
   both endpoints are inside this group (deepest common group), 2-space indent per level
7. remaining edges, one per line, in order
8. `align` lines, then `note` lines, then `legend`, then trailing comments
- One statement per line; no `;`; single spaces around `->`, `:`, `=`; attrs `[a, b]`;
  labels unquoted unless required (§2.4); reversed arrows normalised; chains/fans expanded;
  aliases replaced by canonical words; keys lowercase; `#hex` lowercase; trailing newline.
- Family-specific statement order is defined in §8 (e.g. sequence keeps strict line order
  because order *is* meaning).

### 6.5 Ordering rule
Every parsed record carries `metadata.dsl.line`. Within each §6.4 section, serialize sorts
by `line`, ties by
`(kind: node < group < edge, id)`. Records without `line` (created on the canvas by hand,
or imported) sort after all lined records by `(floor(y/16), x, id)` for nodes and by
`(sourceOrder, targetOrder)` for edges. Once serialized and re-parsed, they have lines.

### 6.6 Round-trip laws
1. `serialize(parse(text)) == format(text)` for every text; and `format(c) == c` for
   canonical `c` (idempotent).
2. `normalize(parse(serialize(frame))) deepEquals normalize(frame)` where `normalize` drops
   `transform`, `size`, `zIndex`, `layerId`, ports, `metadata.dsl.line/hash/source`,
   waypoints, and any appearance value equal to its default. Layout is *not* part of the
   law — only structure and attributes. Pins (§7) *are* part of it.
Golden fixtures in §14 are the first test corpus.

### 6.7 What the canvas does and does not write back
Manual moves, resizes, recolours on the canvas never touch `metadata.dsl.source` (README
§2). "Edit as code" shows `source` if `hash(scene) == metadata.dsl.hash`, else
`serialize(frame)` with the banner "canvas edited — regenerate will overwrite". Generate
replaces the frame contents as one undo step; nodes whose id is unchanged keep their
position unless the layout is forced (`⌘⇧↵`) — that is the only persistence of manual
layout, and it lives in the scene, not the text. Tradeoff: text-only users lose nothing;
canvas-first users must pin (§7) to make a position survive a fresh generate elsewhere.
Exception: chart *data* is content, not layout — the chart data panel writes the source, so
a cell edit regenerates the same chart with the new value (§8.9).

---

## 7. Layout hints (survive round-trip, never written by drags)

| hint | where | effect |
|---|---|---|
| `flowchart right` | family line | ELK direction for the whole frame |
| `group X [right]` | group attrs | direction inside the group (ELK hierarchy handling) |
| `[rank: n]` | node | ELK layer constraint; nodes with the same `n` share a layer |
| `align row A, B, C` / `align column A, B` | statement | same layer / same position constraint (Mermaid `align`, LikeC4 `rank same`) |
| `[pin: 240,80]` | node | fixed position (frame-relative px); ELK treats as fixed; canvas drag of a pinned node shows a pin badge and does not move the pin in text |
| `[width: 200, height: 80]` | node | fixed size |
| `[from: right, to: left]` | edge | preferred port sides; ELK port constraints `FIXED_SIDE` |
| `[order: n]` | sequence participants, gitgraph branches | explicit lane order |

Hints are attributes, so they follow all attribute rules (unknown → kept). They are
emitted only when present in the parsed text or in `metadata.dsl.hints` (set by explicit
"Pin in code" / "Align in code" commands, which are edits to the text, not drags).

---

## 8. Families

Family = header word. Shared: lexical rules, attrs, `title`, `group`, `note`, diagnostics.
Each family adds statements and defines its canonical order. Everything not listed falls
back to §4.

### 8.1 flowchart (default direction `down`)
Statements: §4. Shape role aliases: `process`→`rect`, `decision`→`diamond`,
`start|end|terminator`→`ellipse`, `io|data`→`parallelogram`, `prep`→`hexagon`,
`subroutine`→`component`, `doc`. Decision branches are labelled edges (`Ok? -> Ship : yes`).

### 8.2 architecture (default direction `right`)
Statements: §4. Default node kind = icon card (icon above label) when an icon attr is set,
`rect` otherwise. Icons: `[aws/lambda]`. Group = boundary box. Phase 5 makes `system`,
`container` … meaningful here; today they are groups/nodes with `metadata.dsl.kind`.

### 8.3 sequence (no direction)
```
participant Name [actor|person|db|queue|icon]   // optional; order = first appearance
alias = Long Participant Name
A -> B : message              solid, arrow
A --> B : reply               dashed
A ->> B : async               open head
A -->> B : async reply
A -> A : self call
activate A / deactivate A
loop every 5s {  … }
alt ok { … } else fail { … }
opt cached { … }
par { … } and { … }
break timeout { … }
note over A, B : text  |  note left of A : text  |  note right of A : text
autonumber
```
Canonical order: strict line order (order is meaning). Chains/fans not allowed (W112).
`alt`/`par` branches continue the same block (`} else fail {`, `} and {`); a participant's
`id = Label` form is canonical when the label does not slug to the id. Blocks render as
fragment frames (`annotation` nodes) that enclose their messages; participants are
`sequence_participant` nodes with lifelines sized to the last message.

### 8.4 state (default `down`)
```
[*] -> Idle                   start; Idle -> [*] end
Idle -> Running : start
state Running { … }           composite; `--` line inside = concurrent region divider
F [fork] ; J [join] ; C [choice]      pseudo-states via shape words
```
`[*]` is a token, never a name; before an arrow it is the initial state, after one the
final state (two distinct nodes). Canonical: composites as `state Name { … }` blocks,
then transitions in §6.4 order. `fork`/`join` render as filled bars and `choice` as a
diamond (the name stays addressable but fork/join bars draw no text).

### 8.5 erd (default `right`)
```
users [blue] {
  id uuid pk
  email text unique
  org_id uuid fk
  "full name" text
}
users ||--o{ orders : places        // crow's foot: || |o o| }| |{ }o o{ ; -- identifying, .. non-identifying
users -> orders : has               // unspecified cardinality
```
Row = `name [type] [pk|fk|unique|null|not-null]*` in that canonical flag order; a name with
spaces is quoted. Cardinality words (`1:N`, `one or many`) are accepted and canonicalised to
glyphs; a plain arrow (`->`, `-->`) means an uncarded relation and canonicalises to `--`.
Entities render as `er_entity` tables (44px header, 18px rows); relations carry
`semantics.erRelation`.

### 8.6 class (default `down`)
```
Order [interface|abstract|enum] {
  +id: int
  -items: Item[]
  ---
  +total(): Money
  +save()$              // $ static, * abstract
}
Order --|> Base : extends      inheritance   |  Order ..|> Serializable   realization
Order *-- Item                 composition   |  Order o-- Tag             aggregation
Order ..> Money                dependency    |  Order --> Customer        association
Order "1" --> "*" Item : has   multiplicity in quotes beside the arrow
```
Members are lines; `(` in a member makes it a method. `---` is accepted on input and
emitted only when a class has both attributes and methods. Member text canonicalises
spacing (`+id: int`, `+go(): void`); `[interface|abstract|enum]` sets the stereotype.
Reversed relations normalise by swapping endpoints (`Order <|-- Base` → `Base --|> Order`);
multiplicity is quoted beside the arrow (`Order "1" --> "*" Item`).
Canonical: classes in line order as blocks, relations after. Nodes are `class` tables with
attribute/method compartments sized so every member is visible.

### 8.7 mindmap (radial)
```
mindmap
central: Product            // or root:, or first bare line
- Growth [green]
  - SEO
  - Referrals [icon: users]
- Retention
```
Indentation is structure: each line parents to the nearest previous line with a smaller
indent (2 or 4 spaces per level, tabs = 4). `-` or `*` bullet optional on input; canonical
is `- ` with two spaces per level *below the first*, so depth-1 bullets sit at column 0.
Max depth 6, deeper flattens (W140). Colour on a branch cascades to its descendants and is
only re-emitted where it changes. Shape attrs map onto mindmap wrappers (`circle` →
double-circle, `ellipse` → stadium, `rect` → square, `component` → subroutine, `hexagon`);
`[icon:]` is kept in text but not drawn yet. No edges; `->` lines are W111. The root is
`central: Label` (or `root:`, or the first bare line).

### 8.8 gitgraph (default `right`)
```
commit Initial [tag: v1.0, highlight|revert]
branch feature
checkout main            // switch = alias
merge feature [tag: v1.1, label: …]
cherry-pick initial      // by commit slug
```
Imperative; canonical = line order. `main` exists implicitly and `branch X` creates *and*
switches to X (Mermaid behaviour); `checkout`/`switch` move the cursor without committing.
Unknown branch or commit → W150. Each branch is a lane, each commit a column; commits are
circles with the label beneath, `merge` draws a curve from the merged branch's tip, and
`cherry-pick` a dashed curve from the picked commit.

### 8.9 chart — implemented (slice 6.9, 2026-09-22)
```
chart bar                     // bar | line | area | scatter | pie | donut | radar | heatmap | table | quadrant
title: Monthly revenue
Revenue: Jan 12, Feb 19, Mar 9, Apr 22, May 17     // series: category value pairs, one series per line
Costs: Jan 8, Feb 9, Mar 7, Apr 11, May 12

chart quadrant
x: Low Effort, High Effort
y: Low Impact, High Impact
quadrants: Quick wins, Big bets, Deprioritise, Time sinks
Feature A [0.32, 0.78]        // point: label [x, y] with x, y in 0–1
```
Canonical: the family line keeps the kind (`chart bar`), then `title:`, then one series
line per series in declaration order (the first line's categories define the axis), or the
quadrant directives and points. A series line is `Name: Category value, …`; a category with
spaces is quoted. Chart *data* is the one place where a canvas edit writes text back: the
chart data panel serializes through `Edit as code` (grammar §6.7), because moving a bar is
a data edit, not a layout edit. Unknown kinds warn W131 and fall back to `bar`.

### 8.10 Later families (header reserved, parsed as flowchart with W105 "family not yet
rendered"): `bpmn` (lanes = groups, `[event|task|gateway]` shapes), `org` (edges = reports-to),
`gantt` (`section`, `Task : 2026-01-01, 5d [done|active|crit|milestone]`), `wireframe`
(control words), `sankey` (`A -> B : 12`), `journey` (`section`, `Task : 4 : Actor`),
`timeline`.

---

## 9. Model layer — implemented in phase 5 (2026-09-22)

### 9.1 Blocks
```
model {
  person Customer [desc: "Buys things"]
  system Shop [tech: …] {
    container Web [tech: React] {
      component Cart
    }
    container API [tech: Go] @core
    store DB [cylinder, tech: Postgres]
    queue Events
  }
  external Stripe
  Customer -> Web : browses
  Web -> API : calls [tech: HTTPS/JSON]
  API -> DB : reads/writes
}
deployment Prod {
  node AWS [aws/cloud] {
    node ECS { instance Shop.API }
    node RDS { instance Shop.DB }
  }
}
views {
  view landscape
  view context of Shop
  view container of Shop { exclude Events }
  view component of Shop.Web
  view deployment of Shop in Prod
  view custom "Data paths" [right] { include Shop.** where kind is store; include -> DB }
}
flow "Checkout" {
  step Customer -> Web : opens cart
  alt "paid" { step Web -> API : POST /orders } else { step Web -> Customer : show error }
  par { step API -> DB : write } and { step API -> Events : publish }
  goto "Fulfilment"
  note "Idempotent by order id"
}
```
Implementation (phase 5, `src/dsl/model/` + `families/architecture/`): the architecture
family detects a `model|views|flow|deployment` block and switches to C4 semantics; plain
graph lines in the same family keep the v1 contract. The model is compiled into one frame
per view (`compileWorkspace`), each frame carries `metadata.dsl.arch = { model, view }`,
and placed nodes carry `metadata.model.elementId`. Pages are matched to views by stable
view id (`view:container:shop`, `view:custom:<slug>`), so Generate updates the same pages
instead of duplicating them. The serializer re-emits the whole workspace from any view
frame, so "Edit as code" anywhere gives the same text.

Editing rules (the product contract for the model layer): a label edit on a placed node
renames the element in every view (one undo step); Delete unplaces from the current view
only (`⌘⇧⌫` or the context menu removes it from the model everywhere); a connector drawn
between two placed nodes records the matching relation; tags drive perspectives; snapping
`views/*.snap` positions overrides ELK per element.

Flow step keywords (`flow "Name" { … }`): `intro "text"`, `step A -> B : label`
(message), `process "text"`, `alt "x" { } else { }`, `par { } and { }`,
`goto "Flow name"`, `note "text"` (IcePanel's info), `conclusion "text"`. Exports:
sequence-family DSL, Mermaid `sequenceDiagram`, PlantUML (`flowTo*` in `src/dsl/model/flowExport.ts`).

### 9.2 Paths and ids
Element ids inside `model` are dotted paths of their explicit ids or slugs
(`shop.web.cart`). References may be relative inside the nearest enclosing element
(`Web -> API` inside `Shop`) or absolute (`Shop.API`). Path lookup is case-insensitive on
slugs, exact on explicit ids. Outside `model`, `.` in an id is W120 (§2.6).

### 9.3 Implied relations (Structurizr strategy)
`a.x -> b.y` implies `a -> b` on any view where `a` and `b` are shown but `x`/`y` are
not, **unless any explicit relation `a -> b` exists**. Implied relations are derived, never
serialized; they carry `metadata.model.implied = true`.

### 9.4 View predicates (subset) — implemented

A typed view starts from its scope's default element set and `include`/`exclude` refine it
(Structurizr semantics); a `view custom` starts empty so it can be a real subset.
Relations project onto the nearest shown ancestor, which is exactly the ancestor pair the
plan spells out as an implied relationship; `deriveImpliedRelations` remains the model-level
helper (agent reports, `explain`) and is never serialized.

`include X`, `include X.*` (children), `include X.**` (descendants), `include *`, `include
X -> Y`, `include -> X`, `include X ->`, `exclude …` same forms, `where kind is
container`, `where tag is @core`, `where tag is not @deprecated`, `and`/`or`. Order matters
(later overrides). Anything else → W160 "unsupported predicate, kept verbatim".

### 9.5 Tags
`@core` after a name = `[tags: core]`; several allowed. Canonical: `[tags: a, b]` inside the
attr list, `@` sugar accepted. Tags never affect ids.

---

## 10. Error model

Shape returned by `parse`, `compile`, importers, the code panel and MCP (`validate`,
`create_diagram`, `update_diagram`):
```ts
interface Diagnostic {
  code: `I${number}` | `W${number}` | `E${number}`;   // stable, documented below
  severity: 'info' | 'warning' | 'error';
  line: number;            // 1-based, in the text as submitted
  col: number;             // 1-based; 1 when the whole line is meant
  endCol?: number;
  message: string;         // one sentence, no trailing period
  hint?: string;           // what to type instead, when known
  source: 'parse' | 'compile' | 'import';
}
```
Severity meaning: `info` = nothing lost; `warning` = the line was dropped or something in
it was ignored, diagram still renders; `error` = document-level limit or invalid import
header — still renders whatever parsed. **Nothing is fatal; `parse` never throws** (fuzz
test: random bytes → diagnostics only).

| code | when | hint |
|---|---|---|
| I001 | trailing comment dropped | move comment to its own line |
| I002 | no version pragma | `%% ofk 1` added on save |
| I003 | no family line | `architecture` assumed |
| I010 | slug renumbered because an explicit id took it | — |
| W001 | pragma version newer than parser | parsed as version 1 |
| W101 | line could not be parsed, dropped | shows the first offending token |
| W102 | unterminated quote, line dropped | close the quote |
| W103 | unclosed block at EOF | `}` inserted |
| W104 | duplicate directive, first wins | — |
| W105 | family reserved, rendered as flowchart | — |
| W110 | first statement looks like a family header with wrong case | `flowchart` |
| W111 | arrow not valid in this family, line dropped | list of valid arrows |
| W112 | chain/fan not allowed in this family | one edge per line |
| W120 | `.` in id outside `model`, slugified | — |
| W121 | node mentioned in a second group, not moved | — |
| W122 | unknown element reference, relation dropped | nearest declared name |
| W130 | two attributes of the same type, last wins | — |
| W131 | unknown attribute word, kept verbatim | nearest known word (Levenshtein ≤ 2) |
| W132 | unknown icon, plain node | `find_icon` suggestion |
| W140 | mindmap depth > 6, collapsed | — |
| W150 | gitgraph unknown branch/commit | — |
| W160 | unsupported view predicate, kept verbatim | — |
| W170 | self-edge in a family that cannot draw it (erd, class), dropped | — |
| W180 | import: construct has no equivalent, dropped (see §11) | — |
| E001 | empty document | — |
| E002 | > 20 000 lines, rest ignored | — |
| E003 | import: unknown source header | — |

The code panel lists diagnostics under the editor keyed to line and underlines `col..endCol`.
MCP returns the array as-is plus `summary: { info, warning, error }` counts.

---

## 11. Import targets — loss tables

Importers produce OFK text + `Diagnostic[]` (source `import`, W180 for drops) — never
throw. Column key: **1:1** = round-trips back to equivalent source; **degrades** = kept
with changed fidelity; **dropped** = W180.

### 11.1 Mermaid

Implementation note (2026-09-21): the transpiler (`src/services/dsl/mermaidToDsl.ts`) is
built on the repo's own DOM-free per-family parsers (`detectMermaidDiagramType` +
`parseMermaidByType`), which already carry the semantics and the 56-fixture corpus —
Mermaid's own parser needs a browser and returns a different model, so it is not used for
conversion. Losses are surfaced as W180 diagnostics in the code panel.
| Mermaid | OFK | fidelity |
|---|---|---|
| `flowchart LR/TD/…` | `flowchart right/down/…` | 1:1 |
| `A[text]`, `A(text)`, `A([ ])`, `A[[ ]]`, `A[( )]`, `A(( ))`, `A{ }`, `A{{ }}`, `A[/ /]` | `a = text [rect|rounded|ellipse|component|cylinder|circle|diamond|hexagon|parallelogram]` | 1:1 |
| `A>text]`, `A[\ /]`, `A(((…)))`, most `@{shape}` names | nearest of the 16 shapes | degrades |
| `@{ shape: icon }`, `@{ img }` | node with `[icon: …]` / plain node | degrades / dropped |
| `-->` `---` `-.->` `==>` `~~~` `--o` `--x` `<-->` | `->` `--` `-->` `-> [thick]` `-> [invisible]` `[head: circle]` `[head: cross]` `<->` | 1:1 |
| link length (extra dashes) | ignored | dropped (info) |
| `-->|text|`, `-- text -->` | `: text` | 1:1 |
| `A --> B & C`, chains | fans/chains (input), expanded | 1:1 |
| `subgraph id[title] … direction LR … end` | `id = title [right] { }` group | 1:1 |
| `style`, `classDef`+`class`/`:::`, `linkStyle` | attrs when fill/stroke maps to a palette colour or hex | degrades (font/stroke-width dropped) |
| `click A "url"` | `[link: url]` | 1:1; callbacks dropped |
| `%%{init}%%`, `---config---` | — | dropped |
| markdown strings | plain text | degrades |
| `sequenceDiagram` participants/actors/aliases | `participant`, `id = Name [person]` | 1:1 |
| stereotypes boundary/control/entity/database/collections/queue | `[db]`/`[queue]`/plain | degrades |
| `->>`, `-->>`, `->`, `-->`, `<<->>`, `-x`, `-)` | `->>`, `-->>`, `->` (no head → `[head: none]`), `-->`, `<->`, `[head: cross]`, `->>` | 1:1 except `-)` degrades |
| `+`/`-` activation suffix | `activate`/`deactivate` lines | 1:1 |
| `loop alt else opt par and break` | same | 1:1 |
| `critical/option` | `alt/else` | degrades |
| `box`, `rect`, `create/destroy`, `link`, `autonumber n step` | `group` of participants / dropped / dropped / `[link:]` / `autonumber` | degrades / dropped |
| `stateDiagram-v2` `[*]`, transitions, `state X { }`, `--`, `<<fork>>`, `<<join>>`, `<<choice>>`, `state "d" as id` | same, `[fork]`… , `id = d` | 1:1 |
| state `note`, `classDef` | `note X : …`, colour attrs | 1:1 / degrades |
| `classDiagram` members, visibility, `$`, `*`, `<<interface>>`, all arrows, cardinality, labels, `namespace` | same; namespace → `group` | 1:1 |
| generics `~T~` | `T<…>` in member text | degrades |
| `erDiagram` entities, PK/FK/UK, comments, crow's foot, `..`/`--`, aliases `["…"]` | same (`UK`→`unique`, comment dropped) | 1:1 except comments |
| `gitGraph` commit id/type/tag, branch, checkout, merge, cherry-pick | same (`type: REVERSE`→`revert`, `HIGHLIGHT`→`highlight`) | 1:1; `order:`, `parent:` dropped |
| `mindmap` indentation, `root((x))`, bracket shapes, `::icon(fa fa-x)` | `central: x`, `[circle]`… , `[icon: x]` if in catalog | 1:1 / degrades |
| `journey`, `architecture-beta`, `gantt`, `pie`, `timeline`, `sankey-beta` | reserved families (§8.9) | degrades until phase 3.8 |
| `C4Context` etc. (Mermaid C4) | `model {}` blocks | phase 5 |

### 11.2 Structurizr DSL
| Structurizr | OFK | fidelity |
|---|---|---|
| `workspace "n" "d" { }` | `title: n` | 1:1 (desc dropped) |
| `model { }`, `views { }` | same blocks | 1:1 |
| `person`, `softwareSystem`, `container`, `component` with `"desc" "tech" "tags"` | `person|system|container|component Name [tech:, desc:, tags:]` | 1:1 |
| `x = container "Name"` | `x = container Name` | 1:1 |
| `!identifiers hierarchical` / flat | always hierarchical; flat ids rewritten to paths | 1:1 (ids change) |
| `a -> b "desc" "tech" "tags"` | `a -> b : desc [tech:, tags:]` | 1:1 |
| scoped `-> b` inside element | resolved to `this -> b` | 1:1 |
| `!impliedRelationships true` | default behaviour | 1:1; `false` → W180 |
| `deploymentEnvironment`, `deploymentNode`, `containerInstance`, `infrastructureNode` | `deployment Env { node X { instance a.b } }`, infra → `node` | 1:1 |
| `group "name" { }` | `group name { }` | 1:1 |
| `systemLandscape`, `systemContext x`, `container x`, `component x`, `deployment x env`, `dynamic x` | `view landscape|context of x|container of x|component of x|deployment of x in env`, dynamic → `flow` | 1:1 |
| `include *`, `include a b`, `exclude a`, `->a->`, `a->`, `->a` | same forms | 1:1 |
| `element.type==`, `element.tag==`, `&&`, `\|\|` | `where kind is`, `where tag is`, `and`, `or` | 1:1 for these; `element.parent==`, `technology==`, `relationship.*` → W160 |
| `autoLayout lr 300 300` | view direction `[right]`; separations dropped | degrades |
| `styles { element "Tag" { background shape icon } }` | phase 5.5 tag styles; today attrs copied onto every tagged element | degrades |
| `!include`, `!docs`, `!adrs`, `properties`, `perspectives`, `url` | `!include` inlined if local file given, else W180; `url` → `[link:]`; rest dropped | degrades / dropped |
| `theme`, `branding`, `terminology`, `configuration` | — | dropped |

### 11.3 LikeC4
| LikeC4 | OFK | fidelity |
|---|---|---|
| `specification { element kind }` | kind → nearest C4 kind by name (`actor`→person, `service|app`→container, `db|database`→store, else `[kind: x]`) | degrades |
| `model { kind name 'Title' 'tech' { … } }` | `name = kind Title [tech:] { }` | 1:1 |
| `title/summary/description/technology/link/#tag` props | `label:`, `desc:` (summary+description joined), `tech:`, `link:`, `@tag` | 1:1 (summary/description merged) |
| `metadata { }` | dropped | dropped |
| `a -> b 'label' 'tech'`, `-[kind]->`, `this -> x` | `a -> b : label [tech:]`; kind → `[kind: x]` | 1:1 |
| `views { view name of x { include/exclude } }` | `view custom "name" of x { … }` | 1:1 |
| predicates `*`, `x.*`, `x.**`, `->`, `where kind/tag` | same | 1:1 |
| `x._`, `with { }`, `where metadata…`, `global predicateGroup`, `extends` | kept verbatim | W160 |
| `style * { color }`, `autoLayout LeftRight`, `rank same { }` | attrs, direction, `align row` | degrades / 1:1 / 1:1 |
| `dynamic view { a -> b 'l'; par; alt when/else; loop; opt; break }` | `flow "name" { step …; par; alt/else; loop; opt; break }` | 1:1 |
| `try/catch/finally`, `navigateTo`, `notes` on steps | dropped / dropped / `note` | dropped / degrades |
| `deployment { env { zone { api = instanceOf backend.api } } }` | `deployment env { node zone { api = instance backend.api } }` | 1:1 |
| styling colours `primary secondary muted indigo amber` | `blue gray gray violet orange` | degrades |
| shapes `storage bucket browser mobile queue person` | `cylinder cylinder browser mobile queue person` | 1:1 except bucket |
| icons `aws:x`, `tech:x` | `aws/x`, `tech/x` | 1:1 when in catalog |
| `.snap` manual layout | ignored | dropped |

---

## 12. Versioning

- Grammar version is an integer. `%% ofk N`. Parser knows `CURRENT = 1`.
- A version bump is required only for a change that makes previously canonical text parse
  differently. Adding a keyword, attribute word, family or diagnostic is *not* a bump
  (old text still parses the same; old parsers see new words as unknown attrs / nodes).
- Migration rule: `migrate(text, from, to)` is a chain of pure functions
  `m1to2`, `m2to3` …, each a line rewrite that emits its own diagnostics. `parse` runs
  `migrate` first when `N < CURRENT`, then updates the pragma; the serializer always writes
  `CURRENT`. Frames store `metadata.dsl.version` = the version their `source` is in.
- `N > CURRENT` → W001, parse as current (forgiveness beats refusal; the user sees why).
- No pragma → `CURRENT`.

---

## 13. Agent contract

- `get_syntax(family?)` returns Appendix A (all families) or one family's block (≤ 60
  lines total). It is the only thing an LLM needs to emit valid text.
- `create_diagram(text) → { id, diagnostics, canonical }` — always returns the canonical
  text so the agent's next patch is against known lines.
- `get_diagram(id) → { canonical, hash, diagnostics }`.
- `update_diagram(id, { base_hash, patches: [{ start, end, lines }] } | { text })` —
  patches are 1-based inclusive line ranges over the last returned canonical text;
  `base_hash` mismatch → rejected with the current canonical (agent re-patches); result is
  re-canonicalised and returned. Because each statement is one line and ordering is
  stable, "add an edge" = one inserted line, "recolour X" = one replaced line.
- Determinism guarantees an agent can rely on: same text → same ids → same node identity
  across generates; canonical text diff == semantic diff.

---

## 14. Worked examples (golden tests for 2.2)

Each example: `input` then `canonical` (`= input` when already canonical). Golden test:
`format(input) == canonical` and `format(canonical) == canonical`, and the listed
diagnostics (if any) are produced exactly.

### 14.1 Minimal sketch (architecture default)
input:
```
Frontend -> Backend -> Database
```
canonical:
```
%% ofk 1
architecture

Frontend -> Backend
Backend -> Database
```
diagnostics: I002, I003.

### 14.2 Flowchart with decision, fans, aliases
input:
```
flowchart
Start [terminator] -> Validate
Validate -> Ok? [decision]
Ok? -> Ship, Notify: yes
Ok? -> Fix: no
Fix -> Validate
Ship [process] -> End [terminator]
```
canonical:
```
%% ofk 1
flowchart

Start [ellipse]
Ok? [diamond]
End [ellipse]

Start -> Validate
Validate -> Ok?
Ok? -> Ship : yes
Ok? -> Notify : yes
Ok? -> Fix : no
Fix -> Validate
Ship -> End
```
Note `Ship [process]` is dropped as a declaration: `process` = default `rect`.

### 14.3 Architecture with icons, groups, title, direction
input:
```
architecture down
title: Image upload
group VPC [violet] {
  API Gateway [aws/api-gateway]
  Resize [aws/lambda, green]
  Resize -> Bucket
}
Bucket [aws/s3, orange]
Postgres [cylinder, blue]
Resize --> Postgres : async write
API Gateway -> Resize : invoke
```
canonical:
```
%% ofk 1
architecture down
title: Image upload

Bucket [orange, aws/s3]
Postgres [cylinder, blue]
group VPC [violet] {
  API Gateway [aws/api-gateway]
  Resize [green, aws/lambda]
}
Resize -> Bucket
Resize --> Postgres : async write
API Gateway -> Resize : invoke
```
Note attr order (colour before icon) and that `Resize -> Bucket` leaves the group because
Bucket is outside it.

### 14.4 Forgiving input (bad lines, unknown attrs, reversed arrow, keyword as name)
input:
```
flowchart
Cache [cylinder, chartreuse, octahedron]
B <- A
this line has no meaning ]]]
"group" -> Cache
```
canonical:
```
%% ofk 1
flowchart

Cache [cylinder, chartreuse, octahedron]

A -> B
"group" -> Cache
```
diagnostics: W131 line 2 col 18 ("chartreuse" — hint: `teal`?), W131 line 2 col 30
("octahedron" — hint `hexagon`), W101 line 4 col 1.

### 14.5 Duplicate labels and explicit ids
input:
```
API [blue]
api2 = API [green]
API -> api2
```
canonical:
```
%% ofk 1
architecture

API [blue]
api2 = API [green]

API -> api2
```
ids: `api`, `api2`.

### 14.6 Group shorthand and nested groups
input:
```
Edge {
  CDN; WAF
  CDN -> WAF
  Inner { Origin }
}
WAF -> Origin
```
canonical:
```
%% ofk 1
architecture

group Edge {
  CDN
  WAF
  group Inner {
    Origin
  }
  CDN -> WAF
  WAF -> Origin
}
```

### 14.7 Layout hints
input:
```
flowchart right
A [pin: 0,0] -> B [rank: 2]
align column B, C
A -> C : side [from: bottom, to: top]
```
canonical:
```
%% ofk 1
flowchart right

A [pin: 0,0]
B [rank: 2]

A -> B
A -> C : side [from: bottom, to: top]
align column B, C
```

### 14.8 Sequence
input:
```
sequence
autonumber
participant Browser [browser]
Browser -> API : GET /orders
activate API
API -> DB : SELECT
DB --> API : rows
alt found {
  API -->> Browser : 200
} else {
  API -->> Browser : 404
}
deactivate API
note over Browser, API : cached 60s
```
canonical: input with `%% ofk 1` prepended and a blank line after `sequence` (sequence
keeps strict line order; only the header is normalised).

### 14.9 Sequence with par and self-call
input:
```
sequence
Worker -> Worker : poll
par { Worker -> Queue : ack } and { Worker -> Metrics : emit }
```
canonical:
```
%% ofk 1
sequence

Worker -> Worker : poll
par {
  Worker -> Queue : ack
} and {
  Worker -> Metrics : emit
}
```

### 14.10 State machine
input:
```
state
[*] -> Idle
Idle -> Running : start
state Running {
  Loading -> Ready : ok
  --
  Logging
}
Running -> [*] : stop
F [fork]
```
canonical:
```
%% ofk 1
state

F [fork]
state Running {
  Loading -> Ready : ok
  --
  Logging
}
[*] -> Idle
Idle -> Running : start
Running -> [*] : stop
```

### 14.11 ERD
input:
```
erd
users { id uuid pk; email text unique }
orders [blue] {
  id uuid pk
  user_id uuid fk
}
users 1:N orders: places
```
canonical:
```
%% ofk 1
erd

users {
  id uuid pk
  email text unique
}
orders [blue] {
  id uuid pk
  user_id uuid fk
}
users ||--o{ orders : places
```

### 14.12 Class
input:
```
class
Order {
  +id: int
  +total(): Money
}
Shape [interface] { +area(): float }
Order --|> Base
Order "1" --> "*" Item : has
```
canonical:
```
%% ofk 1
class

Order {
  +id: int
  ---
  +total(): Money
}
Shape [interface] {
  +area(): float
}
Order --|> Base
Order "1" --> "*" Item : has
```

### 14.13 Mindmap
input:
```
mindmap
central: Product
* Growth [green]
    * SEO
    * Referrals
* Retention
```
canonical:
```
%% ofk 1
mindmap
central: Product

- Growth [green]
  - SEO
  - Referrals
- Retention
```

### 14.14 Gitgraph
input:
```
gitgraph
commit Initial
branch feature
commit Start work
checkout main
merge feature [tag: v1.1]
cherry-pick start-work
```
canonical: input with `%% ofk 1` prepended and a blank line after `gitgraph`.

### 14.15 Notes and links
input:
```
Cache [cylinder, link: https://wiki/cache]
note Cache : evicts LRU
```
canonical:
```
%% ofk 1
architecture

Cache [cylinder, link: https://wiki/cache]
note Cache : evicts LRU
```

### 14.16 C4 — context level (phase 5 view; v1 parses as groups/nodes)
input:
```
architecture
model {
  person Customer
  system Shop @core
  external Stripe
  Customer -> Shop : buys
  Shop -> Stripe : charges [tech: HTTPS]
}
views {
  view context of Shop
}
```
canonical:
```
%% ofk 1
architecture

model {
  person Customer
  system Shop [tags: core]
  external Stripe
  Customer -> Shop : buys
  Shop -> Stripe : charges [tech: HTTPS]
}
views {
  view context of Shop
}
```

### 14.17 C4 — container level with implied relation
input:
```
architecture
model {
  person Customer
  system Shop {
    container Web [tech: React]
    container API [tech: Go]
    store DB [tech: Postgres]
    Web -> API : calls
    API -> DB : reads
  }
  Customer -> Shop.Web : uses
}
views { view container of Shop }
```
canonical:
```
%% ofk 1
architecture

model {
  person Customer
  system Shop {
    container Web [tech: React]
    container API [tech: Go]
    store DB [cylinder, tech: Postgres]
    Web -> API : calls
    API -> DB : reads
  }
  Customer -> Shop.Web : uses
}
views {
  view container of Shop
}
```
Phase 5 semantics: `view context of Shop` shows `Customer -> Shop` implied from
`Customer -> Shop.Web`. `store` implies `cylinder` (emitted, so v1 renders it).

### 14.18 C4 — component level with predicates
input:
```
architecture
model {
  system Shop { container API { component Router; component Orders; component Auth @deprecated; Router -> Orders; Router -> Auth } }
}
views {
  view component of Shop.API { exclude * where tag is @deprecated }
}
```
canonical:
```
%% ofk 1
architecture

model {
  system Shop {
    container API {
      component Router
      component Orders
      component Auth [tags: deprecated]
      Router -> Orders
      Router -> Auth
    }
  }
}
views {
  view component of Shop.API {
    exclude * where tag is @deprecated
  }
}
```

### 14.19 C4 — deployment
input:
```
architecture
model { system Shop { container API; store DB } }
deployment Prod {
  node AWS [aws/cloud] {
    node ECS { instance Shop.API }
    node RDS { instance Shop.DB }
  }
}
views { view deployment of Shop in Prod }
```
canonical:
```
%% ofk 1
architecture

model {
  system Shop {
    container API
    store DB [cylinder]
  }
}
deployment Prod {
  node AWS [aws/cloud] {
    node ECS {
      instance Shop.API
    }
    node RDS {
      instance Shop.DB
    }
  }
}
views {
  view deployment of Shop in Prod
}
```

### 14.20 C4 — flow (dynamic)
input:
```
architecture
model { person Customer; system Shop { container Web; container API; store DB } }
flow "Checkout" {
  step Customer -> Web : opens cart
  alt "paid" { step Web -> API : POST /orders } else { step Web -> Customer : error }
  step API -> DB : write
  goto "Fulfilment"
}
```
canonical:
```
%% ofk 1
architecture

model {
  person Customer
  system Shop {
    container Web
    container API
    store DB [cylinder]
  }
}
flow "Checkout" {
  step Customer -> Web : opens cart
  alt "paid" {
    step Web -> API : POST /orders
  } else {
    step Web -> Customer : error
  }
  step API -> DB : write
  goto "Fulfilment"
}
```

### 14.21 Mermaid import (flowchart)
mermaid input:
```
flowchart LR
  A[Start] --> B{Ok?}
  B -->|yes| C([Ship])
  B -.->|no| D[(Cache)]
  subgraph infra[Infra]
    D
  end
  style D fill:#f9f
```
OFK canonical:
```
%% ofk 1
flowchart right

a = Start
b = Ok? [diamond]
c = Ship [ellipse]
group infra = Infra {
  d = Cache [cylinder, #ff99ff]
}
a -> b
b -> c : yes
b --> d : no
```
diagnostics: none (all constructs mapped). Explicit ids are kept because Mermaid ids are
the identity the user may reference elsewhere; `#f9f` expanded to six digits.

### 14.22 Structurizr import (context + container)
input:
```
workspace "Shop" {
  model {
    customer = person "Customer" "Buys things"
    shop = softwareSystem "Shop" {
      web = container "Web" "" "React"
      api = container "API" "" "Go"
    }
    customer -> web "Uses"
    web -> api "Calls" "JSON/HTTPS"
  }
  views {
    systemContext shop { include * autoLayout lr }
    container shop { include * }
  }
}
```
OFK canonical:
```
%% ofk 1
architecture
title: Shop

model {
  customer = person Customer [desc: Buys things]
  shop = system Shop {
    web = container Web [tech: React]
    api = container API [tech: Go]
  }
  customer -> shop.web : Uses
  shop.web -> shop.api : Calls [tech: JSON/HTTPS]
}
views {
  view context of shop [right] {
    include *
  }
  view container of shop {
    include *
  }
}
```
diagnostics: W180 "autoLayout separations dropped" (none here since none given).

### 14.23 Empty / whitespace / garbage
input: `"   \n\n"` → canonical `%% ofk 1\narchitecture\n`, diagnostics E001.
input: 3 KB of random bytes → some W101/W102 lines, never a throw; canonical is
`%% ofk 1\narchitecture\n` plus whatever nodes survived.

---

## Appendix A — `get_syntax` cheat-sheet (≤ 60 lines; returned verbatim by MCP)

```
OFK diagram language, v1. One statement per line. // comment. Bad lines are skipped with a warning.
Line 1 (optional): %% ofk 1     Line 2 (optional): family [direction]  → flowchart | architecture (default) |
  sequence | state | erd | class | mindmap | gitgraph ; direction: down | right | left | up
title: My diagram         PALETTE   appearance: pastel | paper | builder | mono  (compile-time colours)
NODES     Name                      Name [shape, colour, icon, key: value]      id = Long Name [attrs]
          Names are ids (slugified). Quote a name only if it has -> : = , [ ] { } // or starts with a keyword: "Cache: L2"
EDGES     A -> B : label [attrs]     -> solid   --> dashed   <-> both   --  line     A -> B -> C  A -> B, C (expanded)
GROUPS    group Name [attrs] {  Member  Other  }      nodes first seen inside belong to the group; groups nest
NOTE      note Name : text
ATTRS (positional, any order):  shape: rect rounded circle ellipse diamond cylinder hexagon cloud doc note
          parallelogram person queue component browser mobile   colour: blue green red orange violet teal pink
          yellow gray #hex   fill: bold outline   flags: shadow thick invisible flow   icon: aws/lambda gcp/pubsub
          tech/react  keys: label: tech: desc: link: tags: pin: x,y rank: n width: height: head: circle|cross|none
          from:/to: top|right|bottom|left   Unknown words → warning, kept.   @tag = tags: tag
LAYOUT    family direction; group X [right]; [rank: 2]; [pin: 120,40]; align row A, B; align column A, B
--- sequence (order = meaning) ---
participant Name [person|browser|db|queue]     A -> B : msg   A --> B : reply   A ->> B : async   A -> A : self
activate A / deactivate A   autonumber   note over A, B : text   note left of A : text
loop label { … }   alt label { … } else label { … }   opt label { … }   par { … } and { … }   break label { … }
--- state ---
[*] -> Idle   Idle -> Running : event   Running -> [*]   state Running { A -> B  --  C }   F [fork]  J [join]  C [choice]
--- erd ---
users [blue] { id uuid pk   email text unique   org_id uuid fk }     users ||--o{ orders : places
cardinality glyphs: || exactly one  |o zero or one  }| one or many  }o zero or many ; -- identifying, .. non-identifying
--- class ---
Order [interface|abstract|enum] { +id: int   -items: Item[]   ---   +total(): Money   +save()$ }
Order --|> Base (inherit)  Order ..|> Iface (realize)  Order *-- Item (compose)  Order o-- Tag (aggregate)
Order ..> Money (depend)  Order "1" --> "*" Item : has (associate + multiplicity)
--- mindmap (indent = structure) ---
central: Topic       - Branch [green]        - Child          - Grandchild [icon: users]
--- gitgraph ---
commit Label [tag: v1, highlight|revert]   branch name   checkout name   merge name [tag: v2]   cherry-pick label-slug
--- chart (family: chart <kind>) ---
chart bar|line|area|scatter|pie|donut|radar|heatmap|table|quadrant
Revenue: Jan 12, Feb 19        // one series per line: Category value pairs
chart quadrant:  x: low, high   y: low, high   quadrants: tl, tr, bl, br   Feature A [0.32, 0.78]
--- C4 model (phase 5; today renders as boxes/groups) ---
model { person P  system S { container C [tech: Go] { component X }  store DB  queue Q }  external E   P -> C : uses [tech: HTTPS] }
deployment Prod { node AWS [aws/cloud] { node ECS { instance S.C } } }
views { view landscape | context of S | container of S | component of S.C | deployment of S in Prod
        view custom "Name" { include S.*  include -> DB  exclude * where tag is @old } }
flow "Checkout" { step P -> C : opens   alt "ok" { step … } else { step … }   par { … } and { … }   goto "Other"   note "…" }
RULES     canonical output: one edge per line, attrs in fixed order, no ; , reversed arrows normalised to ->
          same text → same ids. Edit by line: get_diagram returns canonical text + hash; update_diagram patches line ranges.
```
