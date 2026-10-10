---
title: Shapes and connectors
description: The shape library and the four connector kinds — routes, ports, labels, markers and waypoints.
---

Shapes carry structure; connectors carry meaning between them. Both are created from the
toolbar, the keyboard or the DSL, and both are editable afterwards.

## Shapes

The Shapes flyout (S) has two sections. **Basic** holds rectangle (`R`) and ellipse (`O`).
**All shapes** holds the 19 shapes diagrams use: diamond, triangle, circle, parallelogram,
trapezoid, hexagon, octagon, cylinder, document, note, speech bubble, cloud, folder, rounded
rectangle, pill, chevron, tag, arrow (rotate it for other directions) and star. Each cell's
icon is the shape's own outline.

Older shapes — cube, prism, layer stack, heart, pin, actor, brackets and the like — are no
longer offered in the flyout, but documents and DSL that use them still draw them.

| Tool | Shortcut |
| --- | --- |
| Select | `V` |
| Hand | `H` |
| Rectangle | `R` |
| Ellipse | `O` |
| Shapes flyout | `S` |
| Text | `T` |
| Pen / Highlighter | `P` / `Shift + P` |
| Eraser | `X` |

Shapes arrive with sensible sizes; drag the handles to resize, hold `Shift` to keep the
aspect, hold `Alt` to resize from the centre. Rotation has its own handle just outside the
corner.

## Connectors

Click the Connector button to open its three kinds; `A` arms the last one picked:

| Kind | Route | Use for |
| --- | --- | --- |
| Arrow | direct | the default; goes straight where you drag it |
| Elbow | orthogonal | flowcharts and architecture; routes around obstacles |
| Curve | bezier | soft links where the elbow path looks busy |

A connector binds to a node's side or to a free point. Orthogonal routes recompute while
either end or any bound node moves; drag a segment to add a bend; manual waypoints survive that recomputation.
Set the end to None in the style bar for a link with no head.
Hovering a shape shows four side handles — drag from one to draw, release on empty canvas to
create a connected shape of the same kind with its label open.

Edge attributes in the DSL map onto the same connector: `-->` dashed, `<->` both ends, `--`
plain, plus `head:`/`tail:` markers, `from:`/`to:` port hints and a `: label`.

## What it cannot do

- **No custom shapes.** The library is the library; DSL shape words and toolbar entries are
  the same set.
- **No connector kinds beyond the three.** Dashes, heads and labels are attributes, not kinds.
- **No arrowheads on free ink.** Pen strokes are ink nodes; only connectors have marker heads.
- **Waypoints are per connector and manual.** There is no "route through this corridor"
  control.

## Where to go next

- [Canvas basics](/canvas-basics/) — selecting, moving and arranging the results.
- [Diagram as code](/openflow-dsl/) — declaring the same shapes in text.
- [Insert media](/insert-media/) — icons, emoji and images among the shapes.
