---
title: Architecture diagrams
description: The architecture family — icon-backed nodes, boundaries and typed elements for system diagrams and the C4 model.
---

The architecture family is the flowchart engine with a system-design vocabulary: icon ids,
technology labels and groups that read as boundaries. Use it for system landscapes, cloud
diagrams and the C4 workspace.

## Header

```openflow
architecture right
Client [person]
API [component, tech: Node.js]
Lambda [aws/lambda]
Store [cylinder]

Client -> API : HTTPS
API -> Lambda : invoke
Lambda -> Store : write
```

`architecture` defaults to `right` (left-to-right reading). `down` is often better for a
portrait page.

## Elements

Node attributes carry the model vocabulary: `tech:`, `desc:`, `kind:`, `tags:` and `link:`.
An icon id (`aws/lambda`, `gcp/pubsub`, `tech/react`) makes the node an icon card: icon above,
label below. Icon ids resolve against the packs the app ships; an unknown id is a warning and
a plain node.

| Statement | Example | Notes |
| --- | --- | --- |
| Icon node | `Lambda [aws/lambda]` | resolved against the bundled packs |
| Element metadata | `API [tech: Node.js, desc: "public edge"]` | read by the model panel |
| Typed kind | `web = Web app [container]` | `person`, `system`, `container`, `component`, `store`, `queue`, `external`, `node`, `instance` |
| Boundary | `group Cloud [blue] { … }` | a group box |
| Relation | `API -> DB : reads` | label and `tech:` both render |
| Tag | `API [tags: critical]` | powers tag perspective in the model panel |

Everything in [DSL reference](/openflow-dsl-reference/) §4 works, including notes and layout
hints.

## The C4 workspace

The same family hosts the model layer: `model`, `views`, `flow` and `deployment` blocks turn
one diagram into a linked workspace with drill-down and playback. That is a chapter of its
own — [Architecture (C4)](/architecture-c4/).

## What it does not do

- **Icons are app-side art.** The app draws the icon; the SVG and PNG exports draw the card,
  the label and the technology line. Keep that in mind for icon-heavy handoff.
- **`kind:` is metadata, not syntax.** An element typed `container` is still drawn as a node
  unless a view or group says otherwise.
- **Reserved families are not here.** `bpmn`, `org`, `gantt`, `wireframe`, `sankey`,
  `journey` and `timeline` parse as a flowchart with warning W105.
- Icons do not affect layout size beyond the icon-card default.

## Where to go next

- [Architecture (C4)](/architecture-c4/) — model, views, flows and drill-down.
- [Architecture workspace](/architecture-workspace/) — folder sync, discovery and drift.
- [Sequence diagrams](/diagram-sequence/) — when a flow needs time ordering.
