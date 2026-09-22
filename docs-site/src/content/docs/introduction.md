---
title: Introduction
description: OpenFlowKit is a local-first, agent-native canvas where technical diagrams live as text first and as pictures always.
---

OpenFlowKit is an infinite canvas for technical diagrams that treats text as the source of
truth. A small line-oriented language — OpenFlow DSL — compiles to shapes, connectors and
layout; the canvas edits the same document; and an agent can drive either through MCP.

## Three ways in

- **Draw it.** Shapes, connectors, ink, images and charts, with the [canvas](/canvas-basics/)
  shortcuts a drawing tool should have.
- **Write it.** [OpenFlow DSL](/openflow-dsl/) in the code panel: nine diagram families, one
  forgiving grammar, per-line diagnostics.
- **Delegate it.** Connect an [MCP client](/mcp-server/) or bring your own key to
  [generate from a prompt](/ai-generation/); both paths produce the same DSL through the same
  compiler.

All three land in the same document. Code generates a frame; dragging on the canvas never
rewrites the text; **Generate** makes the text authoritative again as one undo step.

## Smallest example

```openflow
flowchart
Client -> API : request
API -> Database : query
```

## What local-first means here

Documents live in your browser's storage, not on a server. There is no account and no
telemetry; exports are files you download. See [Local-first diagramming](/local-first-diagramming/)
for the details, including crash recovery and what "opening a file" does.

## Where to go next

- [Quick start](/quick-start/) — five minutes from empty canvas to exported diagram.
- [OpenFlow DSL](/openflow-dsl/) — the text language and its workflow.
- [MCP Server](/mcp-server/) — put an agent on the canvas.
- [Keyboard shortcuts](/keyboard-shortcuts/) — every key, generated from the app's map.
