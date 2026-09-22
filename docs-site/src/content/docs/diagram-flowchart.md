---
title: Flowchart diagrams
description: The flowchart family — nodes, edges, groups and notes for process and system flows, compiled from OpenFlow DSL.
---

The flowchart family is the default and the most forgiving: declare nodes where you use them,
label edges with `: text`, and let the layout decide the rest. Use it for process flows,
request paths and anything that reads as boxes and arrows.

## Header

```openflow
flowchart
Start [ellipse]
Check [diamond]
Ship [rounded]

Start -> Check : submit
Check -> Ship : yes
Check -> Fix : no
Fix [note] -> Check : rework
```

`flowchart` may be followed by a direction: `down` (default), `up`, `right` or `left`. The
direction is the layout's main axis; a group can override it with `group X [right] { … }`.

## Statements

Everything in the [DSL reference](/openflow-dsl-reference/) §4 works here. The ones you will
use most:

| Statement | Example | Notes |
| --- | --- | --- |
| Node | `Cache [cylinder, red]` | shapes and colours are attributes |
| Explicit id | `db = Customer records [cylinder]` | when the label is not a good id |
| Edge | `Client -> API : request` | `-->` dashed, `<->` both ends, `--` plain |
| Edge attributes | `API -> DB [thick, head: circle]` | heads, dash, ports |
| Chain (input) | `A -> B -> C` | the serializer writes one edge per line |
| Fan (input) | `A -> B, C` | fan out; `A, B -> C` fans in |
| Group | `group Edge { CDN, WAF }` | a boundary box; membership follows first mention |
| Note | `note API : retries twice` | a sticky attached to the node |
| Layout hint | `API [rank: 0]`, `DB [pin: 120,40]`, `align row A, B` | survives round-trip; drags do not write it |

Shape words include `rect`, `rounded`, `circle`, `ellipse`, `diamond`, `cylinder`, `hexagon`,
`cloud`, `doc`, `note`, `parallelogram`, `person`, `queue`, `component`, `browser` and
`mobile`; the full list with aliases is in the [reference](/openflow-dsl-reference/).

## What it does not do

- **No manual positioning in the text.** ELK lays the graph out; `pin` and `rank` are hints,
  not coordinates. Move shapes on the canvas instead.
- **Chains and fans are input-only.** They are expanded when compiled and never written back.
- **`browser` and `mobile` are frame nodes, not full wireframes.** They render as frames in
  the app; the SVG export draws them as plain cards.
- A line the parser cannot read is dropped with a warning, not fatal — the rest of the diagram
  still compiles. Warnings are listed in the code panel.

## Where to go next

- [OpenFlow DSL](/openflow-dsl/) — the workflow around the text.
- [Architecture diagrams](/diagram-architecture/) — when boxes need icons and boundaries.
- [Sequence diagrams](/diagram-sequence/) — when order in time matters more than layout.
