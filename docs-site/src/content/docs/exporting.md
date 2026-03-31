---
draft: false
title: Exporting
description: Export diagrams from OpenFlowKit as images, cinematic media, JSON, code formats, design-tool handoff, or share/embed links.
---

Export lives in the top-right menu of the editor and covers both downloadable files and clipboard-oriented formats.

The right export choice depends on whether your next step is editing, publishing, presenting, embedding, or collaboration.

## Downloaded file exports

### PNG and JPG

Use PNG or JPG for:

- docs
- slides
- tickets
- lightweight visual sharing

PNG is usually the better default when you want cleaner transparency handling. JPG is useful when a simple white-background image is enough.

### SVG

Use SVG when you need vector output for docs, websites, or further design-tool handling. SVG is the best choice when the diagram needs to stay crisp across sizes.

### JSON

This is the most faithful archival format for re-import into OpenFlowKit. Use it for:

- backups
- browser-to-browser handoff
- preserving the most editable version of the graph
- long-term retention of a diagram you may need to revise later

If you are unsure what to save as the master file, choose JSON.

### Cinematic video

Use cinematic video export when the diagram is meant to communicate change over time rather than a single static state. This is useful for demos, changelogs, social posts, and process walkthroughs.

These exports are presentation-oriented. Keep JSON as the editable master if you may need to revise the underlying diagram later.

## Clipboard-oriented exports

These exports are generated from the current graph and copied rather than downloaded:

- OpenFlow DSL
- Mermaid
- PlantUML
- Figma editable export

Use these when the next tool in the workflow expects text or design-tool-compatible handoff rather than an image.

## Sharing

The export menu also includes **Share / Embed** for viewer-link and collaboration-oriented workflows. Use this when you want a room link, viewer URL, or embed-style flow instead of a file.

## Recommended export pattern

For serious work, a practical pattern is:

1. keep JSON as the editable master
2. export Mermaid or DSL for text workflows
3. export PNG, JPG, or SVG for presentation
4. use share/embed when the diagram should remain interactive

## Related pages

- [Choose an Export Format](/choose-export-format/)
- [Collaboration & Sharing](/collaboration-sharing/)
- [Embed Diagrams in GitHub](/github-embed/)
