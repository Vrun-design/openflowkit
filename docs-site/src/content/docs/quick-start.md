---
title: Quick start
description: From an empty canvas to an exported diagram in five minutes — shapes, connectors, code, export.
---

Open the app at [app.openflowkit.com](https://app.openflowkit.com), or run it yourself:
`npm install` then `npm run dev` in the repository and open the URL Vite prints.

## 1. Draw something

Press `R` and click to place a rectangle. Press `O` and place an ellipse next to it. Hover the
rectangle: four side handles appear — drag from the right one to the ellipse to connect them.
The canvas is infinite: `Space + drag` to pan, `⌘`/`Ctrl + scroll` to zoom at the pointer.

Everything is autosaved to your browser; the cloud icon in the document bar shows the save
state. Press `?` any time for the shortcut cheatsheet.

## 2. Or write it

Press `⌥D` for the code panel, paste this, then press `⌘↵` or click **Generate diagram**:

```openflow
flowchart
Start [ellipse]
Check [diamond]
Ship [rounded]

Start -> Check : submit
Check -> Ship : yes
Check -> Start : no
```

The text compiles into one frame. Edit the text and generate again: the frame is replaced in
place, and one undo restores what was there before. Right-click a generated frame and choose
**Edit as code** to get its source back at any time.

## 3. Export

Open the canvas menu → **Export…**, or the document bar's export item. Pick a format (PNG, SVG,
PDF or JSON), a scope (selection, page or all pages), and for PNG an image scale. The export
carries the theme you pick — light, dark or print — and transparency is free for PNG and SVG.

## 4. Put an agent on it

- **MCP** — open the **Connect agent** panel, enable the bridge, and point an MCP client at
  `npx -y @vrun-design/openflowkit-mcp`. Every tool then acts on the document you see.
  See [MCP Server](/mcp-server/).
- **Bring your own key** — press `⌘J`, add a provider key in the assistant panel, and describe
  the diagram you want. The proposal is shown before it lands and accepts as one undo step.
  See [AI generation](/ai-generation/).

## Where to go next

- [OpenFlow DSL](/openflow-dsl/) — the language behind **Generate**.
- [Keyboard shortcuts](/keyboard-shortcuts/) — the full map.
- [Exporting](/exporting/) — every format and option.
