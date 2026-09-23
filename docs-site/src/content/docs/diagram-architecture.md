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

## Icons from labels

A node whose label names a technology gets its logo without an icon id: `Postgres`,
`React app`, `Node.js API`, `Cloudflare Workers`, `S3 bucket`. Short noun labels get a
neutral glyph for the concept — `Orders DB`, `Email queue`, `Load balancer`, `Users`. On
C4 elements `tech:` is read first. Decisions, terminals, people and notes keep their shape,
and a step that starts with a verb (`Validate user`) is left alone.

The inferred icon is never written into the text, so the source stays as you wrote it.
Three ways to say no, from narrow to wide:

| Scope | How |
| --- | --- |
| One node (or a selection) | Right-click → **Remove icon**, or **Remove icon** in the style bar's icon picker; the text gets `icon: none` |
| This diagram | Right-click the frame → **Icons from labels**, or **Remove all** on the toast after Generate; the text gets `icons: off` |
| Every new diagram | Settings → **Icons from labels** |

```text
flowchart right
icons: auto              // or off; absent = the Settings switch
Web app [tech: React] -> API [tech: Node.js] -> Postgres
Legacy box [icon: none]
```

Undo brings back whatever a removal took. Turning icons back on for a diagram lays it out
again, since cards are larger than plain shapes. In a C4 workspace the model holds the
choice: removing an element's icon, or ticking the toggle off on any view, changes every
view, and the regenerated workspace text keeps `icon: none` and `icons: off` (and
`appearance:`).

Renaming a node moves an inferred icon with it — `Postgres` renamed `MySQL` swaps the logo,
renamed `Ledger` goes back to a plain shape. A chosen icon never moves, and a plain node is
not turned into a card by a rename; the next Generate does that.

Exports carry the icon art (SVG, PNG, PDF, animated SVG, GIF and video), inlined so the
file opens anywhere. An agent working through the MCP server gets icons from labels too;
its own SVG export, with no editor open, draws the plates without the art.

## The C4 workspace

The same family hosts the model layer: `model`, `views`, `flow` and `deployment` blocks turn
one diagram into a linked workspace with drill-down and playback. That is a chapter of its
own — [Architecture (C4)](/architecture-c4/).

## What it does not do

- **`kind:` is metadata, not syntax.** An element typed `container` is still drawn as a node
  unless a view or group says otherwise.
- **Reserved families are not here.** `bpmn`, `org`, `gantt`, `wireframe`, `sankey`,
  `journey` and `timeline` parse as a flowchart with warning W105.
- Icons do not affect layout size beyond the icon-card default.

## Where to go next

- [Architecture (C4)](/architecture-c4/) — model, views, flows and drill-down.
- [Architecture workspace](/architecture-workspace/) — folder sync, discovery and drift.
- [Sequence diagrams](/diagram-sequence/) — when a flow needs time ordering.
