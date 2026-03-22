---
draft: false
title: Canvas Basics
description: Learn how to move, select, edit, and recover work on the OpenFlowKit canvas.
---

The canvas is the main editing surface in OpenFlowKit. It is optimized for desktop and larger-tablet workflows, with direct manipulation on the graph and exact edits in the side rails.

## When to use the canvas

Use the canvas when you want to:

- sketch a diagram manually
- refine something created by AI, imports, or code
- inspect structure spatially instead of as text
- move quickly between direct manipulation and inspector-based editing

## Navigation

### Pan and zoom

- Mouse wheel zooms the canvas
- `Space + Drag` pans
- `H` switches to hand mode
- `V` switches back to selection mode
- `Shift + 1` fits the current graph in view
- `Cmd/Ctrl + +/-` zooms in or out

### Move around large diagrams

For large canvases, combine:

- fit view to regain context
- search from the Command Center to jump to named nodes
- auto layout to re-establish readable structure

## Selecting things

### Single selection

Click any node or edge to inspect and edit it.

### Multi-selection

Use either of these:

- `Shift + Click`
- `Shift + Drag` to draw a selection box

When multiple nodes are selected, the right rail switches to **Bulk edit** mode.

## Direct manipulation vs exact editing

The canvas is where you move, select, and compose the graph. For exact values and family-specific settings, switch to the [Properties Panel](/properties-panel/). For templates, search, layout, and workflow switching, use the [Command Center](/command-center/).

## History and recovery

Use regular undo/redo for short corrections and snapshots for larger rollback points. See [Playback & History](/playback-history/).
