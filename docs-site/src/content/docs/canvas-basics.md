---
draft: false
title: Canvas Basics
---

The canvas is the main editing surface. It is optimized for desktop and large tablet layouts, with selection, panning, layout, and right-rail editing built around a large-screen workflow.

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

## Moving and editing nodes

### Reposition

Drag nodes directly on the canvas.

### Rename

- double-click directly on a node for fast label editing
- or select the node and edit its content from the Properties panel
- `F2` triggers rename for the current selection

### Duplicate and delete

- `Cmd/Ctrl + D` duplicates the current selection
- `Option/Alt + Drag` performs duplicate-drag
- `Delete` or `Backspace` removes the current selection

## Creating connections

Drag from a node handle to another node to create an edge. After that, use the edge inspector to refine:

- label
- route style
- color
- condition semantics
- appearance and animation flags

Architecture edges expose extra semantics such as protocol, port, and direction.

## Working styles

The editor supports two primary interaction modes:

- **Select mode** for object manipulation
- **Pan mode** for navigation

This matters most on dense diagrams, where accidental node moves become expensive.

## Canvas support tools

### Command Center

Use `Cmd/Ctrl + K` to add assets, browse templates, search nodes, or run layout without leaving the canvas.

### Properties rail

Select a node or edge to open the right-side inspector.

### History and snapshots

Open the snapshots/history panel when you need recovery points or want to revisit a previous graph state.

## Practical advice

- Use sections to create visual boundaries before a diagram gets large
- Use auto layout early, not only when a canvas is already messy
- Switch to OpenFlow DSL or Mermaid in Studio when structural edits are faster in text than by drag-and-drop
