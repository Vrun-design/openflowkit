---
title: Mind maps
description: The mindmap family — a central idea with indentation-defined branches, radial layout and colour cascade.
---

Mind maps organise ideas around a centre. Indentation is the structure: each line parents to
the nearest previous line with a smaller indent.

## Header

```openflow
mindmap
central: Product strategy
- Growth
  - SEO
  - Referrals [blue]
- Retention
  - Onboarding
- Platform
```

`mindmap` has no direction; the layout is radial. The root is `central: Label` (or `root:`, or
the first bare line). `-` or `*` bullets are optional on input; canonical output is `- ` with
two spaces per level below the first.

## Statements

| Statement | Example | Notes |
| --- | --- | --- |
| Root | `central: Product strategy` | also `root:`, or the first bare line |
| Branch | `- Growth` | depth follows indentation |
| Nested branch | `  - SEO` | two or four spaces per level; tabs count as four |
| Colour | `- Referrals [blue]` | cascades to descendants until it changes |
| Shape | `- Growth [ellipse]` | `circle`, `ellipse`, `rect`, `component`, `hexagon` |

Depth is capped at six levels; a deeper line flattens to the cap with warning W140.

## What it does not do

- **No edges between branches.** `->` lines are warning W111; a mind map is a tree.
- **`[icon:]` is kept but not drawn.** The attribute survives round-trip; the renderer does
  not draw the icon yet.
- **No layout control.** Branches are placed radially by depth and order; `pin`, `rank` and
  `align` do not apply.
- A branch that appears before the root is an ordinary node; only the declared root is central.

## Where to go next

- [Flowchart diagrams](/diagram-flowchart/) — when ideas connect, not nest.
- [OpenFlow DSL](/openflow-dsl/) — the code panel workflow.
