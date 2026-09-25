---
title: Insert media
description: Icons, emoji, images, frames and wireframe controls — everything the toolbar inserts besides shapes.
---

Besides shapes, four kinds of content go onto the canvas: icons, emoji, images and charts.
All of them are single nodes with one undo step per insert.

## Icons

Press `I` (or use the Icons and emoji button) to open the icon library. Search across the
packs the app ships, then pick: the icon lands as an icon node whose label you can edit
immediately. `E` opens the same library on the emoji tab.

The DSL can declare the same icons with an icon id — `Lambda [aws/lambda]`,
`React [tech/react]`. The id resolves against the same packs. In exported SVG and PNG the
icon draws as a labelled card; the icon art itself is part of the app's rendering.

## Emoji

Emoji live in the same picker on their own tab, with search and a recents row that remembers
your last picks. An emoji is inserted as a text node, so it scales with the usual text
controls.

## Images

Three ways in, one node each:

- **Toolbar** (`Shift + I`) opens a file picker; the image lands at the viewport centre.
- **Paste** an image file or an image URL — anything matching `http(s)…png/jpg/svg/webp/gif`.
- **Drop** a file onto the canvas; the image lands where you dropped it.

Image bytes from a file are stored as a data URL in the document and copied to the browser's
asset store, so the picture survives a reload without touching the network. A pasted URL stays
a URL: the document keeps the address and exports reference it, so a link that later dies is a
broken image. Hold `Shift` while resizing an image to keep its aspect ratio.

## Charts

The Charts flyout inserts a chart node of any of the ten kinds (bar, line, area, scatter,
pie, donut, radar, heatmap, table, quadrant). Charts are also a diagram family — the [chart
family](/diagram-chart/) page covers the data format and the data panel.

## More: frames, tools and wireframe

The **More** button (`Shift + S`) at the bottom of the toolbar opens three sections:

- **Frames** — a plain frame (`F`), phone, tablet, browser and window. A frame is named above
  its top edge, holds whatever you drop on it, and moves it along. Device chrome is part of the
  export; for a dashed frame, set the outline style.
- **Tools** — lasso (`Q`), laser pointer (`K`), eraser (`X`) and sticky note (`N`). The laser
  draws a fading red trail for presenting and never touches the document.
- **Wireframe** — 35 controls, from buttons and toggles to date pickers. With a frame selected,
  each one stacks into the frame. The [wireframe family](/diagram-wireframe/) writes the same
  screens as text.

## What it cannot do

- **No icon uploads.** The library is what ships; there is no custom pack import.
- **No image cropping or filters.** Resize, rotate and aspect-lock only.
- **URL images are not copied.** A pasted link is fetched by the browser at render/export
  time; the document keeps the URL, not the bytes.
- Emoji are text: they follow the system font on the machine that renders the export.

## Where to go next

- [Shapes and connectors](/shapes-and-connectors/) — the geometry side of the canvas.
- [Exporting](/exporting/) — how each media kind leaves the app.
