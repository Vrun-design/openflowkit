---
draft: false
title: Context Menu & Right-Click Actions
description: Right-click on nodes, edges, or canvas to access quick actions for editing, organizing, and managing diagram elements.
---

The context menu appears when you right-click on the canvas, a node, an edge, or multiple selected elements. It provides quick access to common editing operations without using the toolbar or keyboard shortcuts.

## Canvas Right-Click (Pane Menu)

Right-click on an empty area of the canvas to see:

- **Paste**: Paste copied nodes at the cursor position (if clipboard has content)

## Node Right-Click Menu

Right-click on a single node to access:

### Editing

- **Copy**: Copy the selected node to clipboard
- **Duplicate**: Create an exact copy offset from the original

### Layer Order

- **Bring to Front**: Move the node above all other elements
- **Send to Back**: Move the node behind all other elements

### Section Actions (for Section nodes)

When right-clicking on a Section node:

- **Fit Contents**: Resize the section to fit all its children
- **Bring Inside**: Move selected nodes into this section
- **Lock Section**: Prevent editing of section contents
- **Hide Section**: Toggle section visibility

When a node is inside a section:

- **Release From Section**: Remove the node from the current section

### Delete

- **Delete**: Remove the node from the diagram

## Edge Right-Click Menu

Right-click on an edge to access:

- **Edit Label**: Open inline editing to change the edge label
- **Reverse Direction**: Flip the edge to flow the opposite way
- **Delete Connection**: Remove the edge from the diagram

## Multi-Select Right-Click Menu

When multiple nodes are selected and you right-click:

### Alignment

A 6-button grid for aligning selected nodes:

- Align Left / Center / Right
- Align Top / Middle / Bottom

### Distribution

- **Distribute Horizontally**: Space nodes evenly from left to right
- **Distribute Vertically**: Space nodes evenly from top to bottom

### Grouping

- **Group**: Create a new group containing all selected nodes
- **Wrap in Section**: Create a new section and move all selected nodes into it

### Delete

- **Delete**: Remove all selected nodes from the diagram

## Keyboard Navigation

The context menu supports keyboard navigation:

- **Arrow keys**: Navigate between menu items
- **Enter**: Select the focused item
- **Escape**: Close the menu without making a selection

## Tips

- The menu auto-positions to stay within the viewport
- For frequently used actions, consider learning the corresponding keyboard shortcuts
- Multi-select alignment is faster with `Shift+Click` to select multiple nodes first
