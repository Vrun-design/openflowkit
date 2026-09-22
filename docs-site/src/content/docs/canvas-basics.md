---
title: Canvas basics
description: Select, move, resize, arrange and recover — the direct-manipulation half of OpenFlowKit.
---

The canvas is direct manipulation: everything you can do with a mouse has a keyboard form,
and every gesture is one undo step.

## Selecting

| Do this | To get |
| --- | --- |
| Click a shape | That shape selected |
| Shift + click | Add to or remove from the selection |
| Drag on empty canvas | Box-select everything the box touches |
| `Q` then drag | Lasso: select by a hand-drawn outline |
| `⌘`/`Ctrl + A` | Select all on the page |
| `Esc` | Dismiss the current panel or clear the selection |

## Moving and transforming

| Do this | Effect |
| --- | --- |
| Drag | Move the selection |
| Arrow keys / `Shift + arrows` | Nudge 1 px / 10 px |
| Drag a corner or edge handle | Resize |
| `Shift` + resize | Lock the aspect ratio |
| `Alt` + resize | Resize from the centre |
| Drag the rotate handle | Rotate |
| `Shift` + rotate | Snap to 15° increments |

Snapping pulls edges and centres to other shapes and to the grid, with alignment guides shown
while you drag. Hold `⌘`/`Ctrl` during a drag to bypass snapping. Grid and snap toggles live in
[Settings](/settings/).

## Edges of the keyboard

| Shortcut | Action |
| --- | --- |
| `⌘C` / `⌘X` / `⌘V` | Copy, cut, paste |
| `⌘Alt + C` / `⌘Alt + V` | Copy style, paste style |
| `⌘D` | Duplicate |
| `Backspace` | Delete the selection — on a [model view](/architecture-c4/), unplace it instead |
| `⌘Shift + Backspace` | Remove the element from the model everywhere |
| `⌘]` / `⌘[` | Bring forward / send backward |
| `]` / `[` | Bring to front / send to back |
| `⌘Alt + ]` / `⌘Alt + [` | Same, but moving the whole group at once |
| `⌘G` / `Shift + G` | Group / ungroup |
| `⌘L` | Lock / unlock (locked shapes ignore move and resize) |
| `⌘Z` / `⌘Shift + Z` | Undo / redo |

Bold, italic and underline toggles (`⌘B`, `⌘I`, `⌘U`) apply to the labels of the selected
shapes.

## Navigating

| Shortcut | Action |
| --- | --- |
| `Space + drag` or `H` | Pan |
| `⌘`/`Ctrl + scroll`, trackpad pinch | Zoom at the pointer |
| `⌘0` | Zoom to fit |
| `Shift + 2` | Zoom to the selection |
| `⌘1` / `Shift + 1` | Zoom to 100% |
| `⌘=` / `⌘-` | Zoom in / out |

## Structure

- **Layers** (`L`) lists the page's nodes with visibility and lock toggles.
- **Pages** live in the document bar: add, rename, duplicate, reorder, delete.
- **Groups** wrap a selection in a container; containers clip their children and move as one.
- **Frames** are what generated diagrams live in; each page can hold several diagrams.

## Text

Double-click empty canvas to place a text node. Double-click a shape to edit its label, or
press `Enter`/`F2` with it selected. Labels support line breaks and the text style toggles;
the [context bar](/properties-panel/) adjusts size and alignment.

## Touch

On a tablet, two fingers pinch and pan, a quick second tap is a double-tap, and a still press
opens the context menu. The chrome itself is desktop-sized; there is no separate mobile layout.

## What it cannot do

- **No layers like a paint program.** The Layers panel is the page's node tree, ordered by
  z-order; there is no separate layer system to create or rename.
- **No rulers, guides or coordinates panel.** Snapping and alignment guides are the geometry
  tools.
- **Lock protects against move and resize only.** A locked shape can still be deleted,
  restyled or re-parented.

## Where to go next

- [Shapes and connectors](/shapes-and-connectors/) — what you are manipulating.
- [Properties panel](/properties-panel/) — exact values for the selection.
- [Keyboard shortcuts](/keyboard-shortcuts/) — the generated full map.
