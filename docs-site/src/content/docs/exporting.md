---
title: Exporting
description: PNG, SVG, PDF and JSON — scopes, themes, scale, transparency, and what each format is actually good for.
---

Canvas menu → **Export…** opens one panel: format, scope, and the options that belong to the
format. Right-clicking an element and choosing **Export…** opens the same panel already scoped
to that element. Everything is produced in the browser from the same exported SVG.

## Formats

| Format | What you get | Options |
| --- | --- | --- |
| **PNG** | A raster image of the current view | 1× or 2× resolution; light/dark/print theme; transparent background; **Copy 2×** to the clipboard |
| **SVG** | Vector markup that opens in Figma, Illustrator and browsers | Light/dark/print theme |
| **PDF** | The browser's print dialog over the exported SVG — choose "Save as PDF" | — |
| **JSON** | The whole document, every page, in the canonical format | — |

## Scope

- **Selection** — the selected elements and everything inside them: a group, frame or section
  takes its whole subtree, connectors between those children come along, and a lone connection
  exports on its own. One element names the file after itself (`my-doc-login-frame.svg`).
- **Page** — everything on the current page (the default).
- **All pages** — one file per page for PNG and SVG; JSON is always the whole document.

Exporting an empty page is refused with a message rather than producing an empty file.

## Themes and transparency

The export theme is independent of the app theme: **Light** matches the light canvas, **Dark**
the dark one, and **Print** forces the white page background for paper. PNG and SVG can be
transparent; a transparent PNG has no background rectangle at all, which is what you want for
slides and dark READMEs.

## JSON is the round-trip format

**Export… → JSON** writes the document in the canonical format the app itself opens; **Open
file…** reads it back, including on a different browser. It is also what `openflow_save`
writes over [MCP](/mcp-server/). JSON export always covers every page and every asset
reference — the file is the document, not a rendering of it.

## What it cannot do

- **No direct PDF file.** PDF is the print dialog; the file is written by the browser and the
  page setup (margins, headers) belongs to the print dialog, not to OpenFlowKit.
- **No ZIP of all pages.** All-pages export downloads one file per page.
- **No Mermaid export.** Mermaid is an import path only — see
  [Mermaid import](/mermaid-import/).
- **No share links or embeds.** Exports are files; see
  [Local-first diagramming](/local-first-diagramming/) for why.
- **No format options beyond those above** — no JPEG, no WebP, no size presets for PNG.

## Where to go next

- [Animated export](/animated-export/) — SVG animation, GIF, MP4 and WebM.
- [Theming](/theming/) — where the light/dark/print themes come from.
