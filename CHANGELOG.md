# Changelog

Notable changes to the OpenFlowKit app. The MCP server ships on its own version
line — see [`mcp-server/package.json`](mcp-server/package.json) — because it has
npm consumers whose upgrades should not be driven by the app's brand version.

This project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

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
- **MCP: icons in headless exports.** File-mode SVG and animated SVG, and the
  `openflowkit build` site, draw the same icon art as the editor.

### Changed

- **MCP server 0.2.0 is a breaking release** for 0.1.x users: `create_viewer_url` and
  `find_icon` are gone (use `create_diagram` + `export`, and `search_icons`), and the
  `convert_mermaid_to_openflow` prompt is gone because the tools take Mermaid directly.
- The `openflowkit build` CLI compiles with the editor's icon rule (icons from labels on).

### Fixed

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

### Removed

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
