# Changelog

Notable changes to the OpenFlowKit app. The MCP server ships on its own version
line — see [`mcp-server/package.json`](mcp-server/package.json) — because it has
npm consumers whose upgrades should not be driven by the app's brand version.

This project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- MCP (0.2.0): remote MCP Apps endpoint (`start:http`) with render_diagram + inline viewer; stores nothing.
- **A real home page.** A sidebar with Recents, Starred, Templates and Archive, search (`/`), your starred diagrams,
  a dated What's new page, and links to request a feature or star the project (with its live star count). Diagrams show as a grid
  or a list with a live thumbnail, sorted by last edited or name. Each card has star, rename, duplicate, open in a
  new tab and archive, from its menu or a right-click. Select several with ⌘/Ctrl- or Shift-click, the
  checkbox, Shift+arrows or ⌘A, then star or archive them from the bar. Arrow keys walk the cards (Space, S, F2,
  Delete). Archiving takes a diagram off the list with an Undo and keeps it until you
  delete it forever. ⌘K finds any diagram, template or
  action. Import (or drop anywhere) OpenFlowKit `.json` files, or a Mermaid, D2, Structurizr or OpenFlow DSL file,
  which opens drawn. A first visit gets four ways in and the templates as pictures. `N` starts a new diagram.
  In the editor the logo is now the menu, and its first item is Back to home.
- **Tips at the moment they help.** Draw three shapes and Diagram as code offers to do it from text; paste Mermaid on
  the canvas and it offers to draw it; select two shapes for the connect shortcut; a first export points at
  animation; a growing diagram without an AI key points at the assistant. One a session, each once, never over an
  open panel, Escape closes it.

- **Your v1 diagrams move over by themselves.** On first boot, every diagram from the
  previous editor (IndexedDB, the localStorage fallback and the pre-March tabs store) is
  copied into the new document store, read-only; the old rows are never touched. A home
  list shows them tagged "From v1", the document menu offers a v1 backup download, and
  Open file accepts that backup. Bring-your-own-key settings carry over.
- Old links resolve: `#/flow/:id` opens the imported diagram, `#/view?flow=…` explains
  what it was, and the other v1 routes land on home. The v1 service worker removes itself.
- **MCP: Mermaid, Structurizr and D2 in.** `create_diagram`, `update_diagram` and
  `validate_openflow_dsl` take Mermaid (fenced or not, front matter included), Structurizr DSL
  or D2 and return `converted: { from, dsl, losses }`, losses on the agent's own line numbers.
  Unconvertible Mermaid families say which ones convert.
- **D2 import** in the code panel and the agent tools: flowchart with groups, sequence, or erd
  from `sql_table`s, tested on the D2 project's own example files.
- **Agent skill** (`skills/openflowkit/SKILL.md`) and a `llms.txt` that describes v2 (it still
  described the 1.x DSL). `npm run eval:validity` measures how often a model's diagrams compile.
- **`openflowkit` CLI covers every op.** `openflowkit op <name>` runs any MCP op on a
  `.openflow.json` (new ops appear without CLI code), plus `render` (→ SVG), `convert`
  (→ `.openflow.json`), `validate` and `ops`. Stdin, `--json`, `--strict`, exit codes 0/1/2.
- **MCP: headless layout is ELK**, the editor's engine, so file mode and the CLI draw the same
  diagram as the app. Over 1000 shapes or 400 connections stops with a message.
- **MCP schema fix (0.2.0): `add_shape` advertises its fields.** Its refined schema exposed only
  `documentId`, so clients sent no `kind`/`label` and every call failed validation.
- **MCP (0.2.0, schema change): `openflow_save` takes an optional `svg` boolean** (default false). When true it also
  writes the first page as `<same name>.svg` next to the file and returns its path as `svg`. CLI: `--svg` on
  `convert -o` and `op --doc`; `openflowkit discover --out` now writes `<name>.svg` beside the model too (`--no-svg` to skip). If the SVG
  fails after the file is saved, the save stands: the CLI exits 1 naming the saved path, `openflow_save` returns `svgError`.
- **MCP: icons in headless exports.** File-mode SVG and animated SVG, and the
  `openflowkit build` site, draw the same icon art as the editor.
- **The assistant edits hand-drawn shapes, not only diagrams.** "Make the selected box red and move it right" now
  works: `move_shapes`, `style_shapes`, `delete_shapes`, `add_shape` and `list_shapes` queue into the same review as
  diagram changes, each row rebuilt on the page the rows before it leave, and apply as one undo step. Shapes inside a
  generated diagram still change through its text; locked shapes and shapes outside the selection are left alone.
- **Start from a template, no API key.** The empty canvas offers the five starter diagrams the MCP server ships;
  one click draws it and opens the text that drew it.
- The provider dialog's model field lists the provider's own models (fetched when you focus it, chat models only,
  kept for the session). A wrong key, a closed port or a refused request quietly keeps the built-in suggestions.

### Changed

- **A diagram names its document.** Starting from a template, an import or Generate in an untitled document names
  it after the diagram's `title:`, in the same undo step, so Home is not a wall of "Untitled diagram".
- Home and first paint load less than half the JavaScript they did (566 KB → 231 KB): the v1 importer, the agent
  op registry and the Structurizr/D2 converters load when first used.
- **Failures say what happened and what to do.** No WebGL: the canvas says how to turn it on, hides the drawing
  tools and offers Diagram as code and All diagrams (the old link went nowhere). Blocked or full storage, a damaged
  diagram, an unreadable old link, a broken file, and an agent bridge with nothing listening (it names the port) each
  have their own copy, an illustration and a way back. Home notices carry a tone; a backup opening is no longer an alert.
- The canvas welcome's templates are one tidy row of chips, and on a phone the welcome starts below the rail.

- **Edges can end on a group.** `Client -> Payments` next to `group Payments { … }` connects to the
  group's frame instead of drawing a second box called Payments. D2 containers and Mermaid
  subgraphs (`subgraph one [Group One]`, `c --> one`) import the same way, with no loss note.
- Bring-your-own-key defaults: Claude `claude-sonnet-5-5` (Opus 5.5 is one pick away; mid-tier is the cheaper surprise), OpenAI `gpt-6.1-sol`.
- **The agent bridge is token-gated by default.** The editor makes a pairing token once; "Copy MCP configuration"
  puts it in the config's `env`, so the server and the window pair without typing. The token travels in the query
  string (a plain request), so servers that predate it still pair, and a server started without a token stays open.
  The server also answers browser preflights now, for clients that send the token as a header, and the editor says
  so when a server rejects the token.
- Edits at 5,000 nodes cost about half as much: the document is checked once per command, not twice.
- **MCP server 0.2.0 is a breaking release** for 0.1.x users: `create_viewer_url` and
  `find_icon` are gone (use `create_diagram` + `export`, and `search_icons`), and the
  `convert_mermaid_to_openflow` prompt is gone because the tools take Mermaid directly.
- The `openflowkit build` CLI compiles with the editor's icon rule (icons from labels on).

### Thanks

V1's contributors: [@Ken-vdE](https://github.com/Ken-vdE) (edge dash animation loop, #76) and
[@Mr-Macharia](https://github.com/Mr-Macharia) (retired Groq model IDs, #79; one `AIProvider` type, #80).
Their work shipped in v1; v2 is a rewrite, so the code itself did not carry over. Thank you.

### Fixed

- The Docker image's CSP blocked the local agent bridge and custom AI endpoints; it now matches the hosted one.
- Home asked GitHub for the star count on every visit while rate-limited or offline; a failed lookup now waits a day.
- **Code panel:** long lines wrap instead of scrolling sideways, with the highlight wrapping at the same places;
  ⌘Z undoes a Tab or an accepted completion (it did nothing); a CRLF file highlights and jumps to diagnostics on the
  right line; Enter during IME composition no longer picks a completion.
- The selection toolbar moves below the selection when it would cover the label of a connector arriving from above.
- The `auth-flow` starter template dropped its decision line (`Valid {"Valid?"}` opened a block).
- A full or blocked browser storage no longer resets every preference when the bridge token is first saved.
- **Agent pairing after a reload.** With the agent still enabled, a reload started the bridge before the document
  had loaded, and the editor never told the server about it: it looked connected while the agent saw no editor.
- DSL: a column named `title`, `direction` or `appearance` inside an entity (`courses { title text }`) was read as
  the diagram's title and dropped. Only top-level lines are directives now.
- Mermaid import keeps what models actually write: `interface X {}`, `abstract class` and `enum` become stereotyped
  classes; `database id[Label]` or `queue id[Label]` in an architecture diagram becomes a labelled service; both
  say what they assumed. "No valid architecture nodes" now shows the real node syntax.

- Mermaid: one-line flowcharts (`graph LR; A-->B; B-->C`) import; loss notes point at the
  real Mermaid line (they were numbered 1, 2, 3…); a label with a line break stays one
  label; our own `mindmap`, `architecture` and `gitgraph` DSL is no longer offered as
  Mermaid to convert.
- DSL: two nodes with the same label (`API` and `api-2 = API`) no longer merge on re-read;
  a node labelled `queue`, `person` or `...etc` survives a round trip; a quoted first word is
  never read as a keyword.
- C4 deployment views draw the model's relations between instances (they drew none).
- Structurizr import, checked against Structurizr's own example workspaces: `/* */` comments,
  `live = deploymentEnvironment`, instance references, a bare `autoLayout`, and AWS/Azure/GCP
  theme tags as icons.
- Icon ids: `tech/react` (in the docs) resolves, and `developer/react` no longer picks Preact.
- A quoted `\n` in a label stays a line break; it was flattened to a space on every re-read.
- Mermaid ids that differ only in case (`A`, `a`) stay two nodes; they merged into one.
- The v1 import lists exactly what v1 showed: an old localStorage or pre-March copy of a diagram
  deleted in v1 no longer comes back (it stays in the v1 backup download). The backup also reads
  the localStorage copies when IndexedDB will not open.

### Removed

- The Slides workspace button: it opened a mock-up that saved nothing. It returns when slides are real.
- The `gh-pages` deploy script and `public/CNAME`; the app deploys on Cloudflare Pages.

## [2.0.0] — 2026-09-22

A rebuild, not a release on top of 1.x. The React Flow editor is gone; the canvas,
the document model, the language and the agent surface were rewritten around one
idea: **the text is the hub, and the canvas is a view of it.**

### Added

- **Pixi/WebGL canvas.** Zoom-to-cursor, box select, move/resize/rotate, snapping
  with alignment guides, group and section framing, z-order, lock. One undo step
  per user intent, and every command has an inverse.
- **Connectors that hold.** Bind to a node side or a free point, orthogonal routing
  around obstacles recomputed live, manual waypoints that survive a bound node
  moving, parallel and reverse edges, labels and markers.
- **Diagram as code.** A forgiving line-oriented DSL with positional attributes,
  per-line warnings and a deterministic serializer: `serialize(parse(text)) == text`.
  Eight families — flowchart, architecture, sequence, state, ERD, class, gitgraph,
  mindmap. The grammar is versioned at [`src/dsl/grammar.md`](src/dsl/grammar.md).
- **Mermaid import** with an honest loss report, and Structurizr → C4 workspaces.
- **Agents as a first-class surface.** An MCP server that drives the *live* editor
  over a local bridge or works on `.openflow.json` files, with one reversible
  command per operation. Bring-your-own-key generation lands as a reviewable
  proposal, never a silent edit.
- **Motion export.** An `animate` block in the text drives animated SVG, GIF, MP4
  and WebM, encoded in a worker.
- **Architecture layer.** C4 model with drill-down, flows, `discover` and `drift`.
- **Creation library.** 42 shapes, connector kinds, ink, images and emoji, charts,
  and 1,600+ icons.

### Changed

- Local-first storage on IndexedDB with a last-known-good copy for crash recovery.
- Keyboard for every action, with a `?` cheatsheet kept honest by a test that fails
  when the dispatcher reads a key the sheet does not document.

### Removed

- The React Flow editor, yjs collaboration, in-app i18n, rollout flags and the
  `/flow/:id` and `/_labs/*` routes. Translation bundles for the deleted i18n system
  were removed from `public/` in this release.

### Fixed

- A locked shape no longer moves on an arrow-key nudge or an agent `move` call.
- The keyboard cheatsheet advertised Alt for snap bypass; the canvas reads ⌘/Ctrl,
  and Alt resizes from the centre.

[2.0.0]: https://github.com/Vrun-design/openflowkit/releases/tag/v2.0.0
