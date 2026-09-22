# Changelog

Notable changes to the OpenFlowKit app. The MCP server ships on its own version
line — see [`mcp-server/package.json`](mcp-server/package.json) — because it has
npm consumers whose upgrades should not be driven by the app's brand version.

This project follows [Semantic Versioning](https://semver.org/).

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
