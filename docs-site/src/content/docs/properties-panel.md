---
draft: false
title: Properties Panel
description: Use the right-side inspector to make exact node, edge, bulk-edit, and Studio-related adjustments in OpenFlowKit.
---

The Properties panel is the right-side inspector that appears when you select a node or edge. It is the main place for exact edits after rough structure is already on the canvas.

## When to use it

Use the Properties panel when:

- the rough structure is correct but the details are not
- you need exact labels, colors, shapes, or typography
- you want edge labels and routing adjustments
- a diagram family exposes settings that are not convenient to edit directly on the graph

## What opens in the right rail

The rail changes based on selection state:

- one node selected: node inspector
- multiple nodes selected: bulk edit
- one edge selected: edge inspector
- Studio mode active: AI, code, lint, or other Studio tabs instead of properties

## Node editing

For a typical node, the inspector exposes combinations of these sections:

- **Content** for label and sublabel
- **Shape** for geometry selection
- **Color** for presets and custom color
- **Icon** for icon changes
- **Typography** for font and emphasis controls
- **Image** settings for image nodes
- **Variant** settings for browser/mobile wireframes

Some families add their own controls. For example:

- mind maps expose child and sibling creation actions
- architecture nodes expose architecture-specific semantics
- icon-backed asset nodes expose asset search and category filtering

## Edge editing

When an edge is selected, the panel exposes:

- **Label**
- **Route**
- appearance-related settings where supported

## Bulk edit

When multiple nodes are selected, the right rail switches to bulk edit so you can update common styling and shared properties together.
