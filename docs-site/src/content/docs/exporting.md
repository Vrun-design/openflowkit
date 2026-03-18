---
draft: false
title: Exporting
---

Export lives in the top-right menu of the editor and covers both downloadable files and clipboard-oriented formats.

## Downloaded file exports

### PNG

Best for:

- docs
- slides
- issue trackers
- transparent-background diagram drops

### JPG

Best for:

- white-background presentations
- lightweight sharing where transparency is not required

### JSON

This is the most faithful archival format for re-import into OpenFlowKit. Use it for:

- backups
- migration between browsers or machines
- preserving playback metadata where present
- team handoff of editable diagrams

## Clipboard-oriented exports

These exports are generated from the current graph and copied rather than downloaded:

- OpenFlow DSL
- Mermaid
- PlantUML
- Figma-friendly SVG payload

Use these when the next destination is another editor rather than a file browser.

## Animated export

The codebase supports playback export to:

- GIF
- browser-recorded video

These options appear only when the animated export rollout flag is enabled.

## Fidelity guidance

Choose formats by goal:

- use **JSON** for maximum round-trip fidelity
- use **OpenFlow DSL** for editor-native textual workflows
- use **Mermaid** when the target is Markdown or docs tooling
- use **PlantUML** when the destination stack already expects PlantUML
- use **PNG/JPG** when the result only needs to be viewed

## Import pairing

If you expect to continue editing later, always export a JSON copy alongside any presentation export.

That one habit prevents most avoidable rework.

Perfect for slides, documents, or sharing on Slack.

### PNG (Portable Network Graphics)
Exports a high-resolution, pixel-based image of your current flow.
*   **Best for**: Slides, Web, General Sharing.
*   **Settings**: Includes transparency by default if enabled in settings.

### JPEG (Joint Photographic Experts Group)
Exports a compressed image file.
*   **Best for**: Email attachments, situations where file size matters.
*   **Note**: Does not support transparency (background will be white).

## Data & Code Exports

FlowMind is a "Diagram-as-Code" tool, so we treat your diagram data as a first-class citizen.

### JSON (FlowMind Native)
Downloads the raw `.json` file containing all node positions, styles, and data.
*   **Best for**: Backups, Version Control, Sharing editable files with other FlowMind users.

### FlowMind DSL
Copies the simplified Domain Specific Language (DSL) representation to your clipboard.
*   **Best for**: Storing diagram logic in your codebase comments or generating similar flows via AI.

### Mermaid.js
Converts your current diagram into [Mermaid](https://mermaid.js.org/) syntax and copies it to the clipboard.
*   **Best for**: Embedding diagrams in GitHub `README.md` files, Notion, or Obsidian.
*   **Supported**: Basic Flowcharts, Sequence Diagrams.

### PlantUML
Copies the PlantUML representation of your diagram.
*   **Best for**: Enterprise wikis (Confluence) or legacy documentation systems.

### Figma
Copies a vector representation compatible with Figma's paste format.
*   **Best for**: Handing off diagrams to designers for high-fidelity polishing.

> [!WARNING]
> Figma export is experimental. Complex custom nodes may not transfer 100% perfectly.
