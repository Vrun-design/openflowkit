---
title: Context menu
description: Right-click on a shape, a connector, a generated frame or empty canvas for the actions that apply to it.
---

Right-click (or long-press on touch) opens a menu scoped to what is under the pointer. Menu
items that cannot apply are disabled rather than hidden, so the shape of the menu tells you
what is possible.

## On empty canvas

| Item | What it does |
| --- | --- |
| Paste | Paste the clipboard at the cursor |
| Select all | Select every node on the page |
| Zoom to fit | Frame the whole page |
| Zoom to 100% | Reset to one-to-one scale |
| Show grid | Toggle the dot grid |
| Snap to grid | Toggle grid snapping |

The last two are the same preferences as [Settings](/settings/), kept here because they are
things you reach for mid-drag.

## On a shape or a selection

| Item | What it does |
| --- | --- |
| Cut / Copy / Duplicate | Clipboard and duplication |
| Edit label | Open the in-place label editor |
| Edit as code | Appears on a generated frame; reopens its DSL source |
| Icons from labels | Appears on a generated flowchart or architecture frame; ticks on or off [icons from labels](/diagram-architecture/#icons-from-labels) for that diagram |
| Remove icon | Appears when the selection has icons; one undo step for all of them |
| Open … view / Unplace / Remove from model | Appears when the shape is a [C4 model](/architecture-c4/) placement |
| Style → Copy style / Paste style | Copy the appearance between shapes |
| Reorder → Front / Forward / Backward / Back | Z-order, or the whole selection's order |
| Transform → Flip, Align, Distribute | The arrange actions, with Align and Distribute enabled for multi-selections |
| Group / Wrap in section / Ungroup | Container actions; Ungroup appears when the selection can be unwrapped |
| Export… | Open the [export panel](/exporting/) scoped to this element — a container brings its whole subtree |
| Zoom to selection | Frame the selection |
| Lock / Unlock | Toggle the lock |
| Delete | Delete the selection |

## On a connector

| Item | What it does |
| --- | --- |
| Edit label | Edit the connector's label |
| Path → Elbow / Straight / Curve | Change the routing |
| Reverse direction | Swap the endpoints and the arrow head |
| Style → Copy / Paste style | Appearance between connectors |
| Export… | Export just this connection, without its endpoints |
| Delete | Remove the connector |

## What it cannot do

- **No custom menus or plugins.** The menu is the set of operations the editor has.
- **No multi-connector operations.** One connector at a time; style copy/paste works from a
  node to a node and from a connector to a connector, not across the two.
- **No "open in new tab" style items.** Everything acts on the current page.

## Where to go next

- [Keyboard shortcuts](/keyboard-shortcuts/) — the same actions on keys.
- [Properties panel](/properties-panel/) — the style editors the menu links to.
