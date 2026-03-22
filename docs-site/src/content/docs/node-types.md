---
draft: false
title: Node Types
description: Understand the core node families available in OpenFlowKit and how they map to different diagram workflows.
---

OpenFlowKit supports both generic and family-specific nodes. The node model in the app covers flow, architecture, mind map, journey, class, ER, annotation, grouping, and media use cases.

## Core node families

### Flow nodes

These are the default building blocks for most workflows:

- `start`
- `process`
- `decision`
- `end`
- `custom`

Use them when the diagram is primarily procedural and you do not need a richer family model.

### Mind map nodes

Mind map nodes carry extra structure such as:

- depth
- parent id
- left/right side
- branch style

They are better than plain flow nodes when hierarchy and branch structure matter more than route semantics.

### Architecture and asset-backed nodes

Architecture-oriented diagrams can use provider-backed icon nodes and related visual grouping structures such as sections and boundaries.

These are useful when the diagram should read like a system topology instead of a generic flowchart.

### Journey and experience nodes

Journey-oriented nodes help when the diagram represents user or process stages instead of system topology. They are a better fit when actor, stage, and score-like information matter.

### Media and wireframe nodes

OpenFlowKit also supports image nodes and browser/mobile wireframe-style nodes for product, UX, and annotated architecture workflows.

## How to choose

Choose the node family that matches the semantics of the work, not just the shape you want on the canvas.

- Use flow nodes for generic process logic.
- Use architecture nodes for system and infrastructure modeling.
- Use mind map nodes for branching ideation.
- Use journey nodes for experience mapping.

## Related pages

- [Diagram Families](/diagram-families/)
- [Properties Panel](/properties-panel/)
- [Templates & Starter Flows](/templates-assets/)
