---
draft: false
title: Diagram Families
description: Choose the right diagram family in OpenFlowKit for flows, architecture maps, mind maps, journeys, class diagrams, ER diagrams, and more.
---

OpenFlowKit supports multiple diagram families because not every problem should be forced into the same node and edge model.

## Families in the current editor

| Family | Best for |
| --- | --- |
| `flowchart` | General process and system flows |
| `architecture` | Cloud, service, and platform diagrams |
| `mindmap` | Branching ideation and hierarchical thinking |
| `journey` | User journey or multi-stage experience mapping |
| `stateDiagram` | State transitions and event-driven logic |
| `classDiagram` | Object modeling and relationships |
| `erDiagram` | Tables, entities, and relational structure |
| `gitGraph` | Git history and branching flows |

## How to choose

Use the family that matches the semantics of the diagram, not just the visual look.

- Choose `flowchart` when the problem is procedural.
- Choose `architecture` when services, infrastructure, or trust boundaries matter.
- Choose `mindmap` when branching and hierarchy matter more than exact routing.
- Choose `journey` when stages, actors, and sentiment or score matter.
- Choose `classDiagram` or `erDiagram` when the relationships themselves carry meaning.

## Why it matters

Different families unlock different node behavior, import paths, layout assumptions, and inspector controls. Picking the right family early usually means less cleanup later.

## Related pages

- [Node Types](/node-types/)
- [Choose an Input Mode](/choose-input-mode/)
- [Studio Overview](/studio-overview/)
