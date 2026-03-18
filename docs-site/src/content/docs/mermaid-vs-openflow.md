---
draft: false
title: Mermaid vs OpenFlow
---

Mermaid and OpenFlow DSL solve adjacent but different problems in OpenFlowKit.

## Choose Mermaid when

- the diagram must live in Markdown, docs sites, or README files
- your team already reviews Mermaid in pull requests
- external tooling expects Mermaid syntax

## Choose OpenFlow DSL when

- the diagram is primarily maintained inside OpenFlowKit
- you want a format closer to the native graph model
- you want fewer compatibility constraints during editing
- you want a better target for OpenFlowKit-specific AI and Studio workflows

## Practical difference

Mermaid is a broad ecosystem format.

OpenFlow DSL is an editor-native format.

That usually means:

- Mermaid is better for portability
- OpenFlow DSL is better for fidelity inside this product

## Recommended team pattern

If you need both:

- treat JSON or OpenFlow DSL as the editing master
- publish Mermaid as a downstream representation when required

This avoids losing detail every time a diagram moves between ecosystems.

**Mermaid.js:**
- Renders SVGs based on predefined themes (default, dark, forest, neutral).
- Customizing styles requires inline CSS classes, which can clutter your markdown.

**OpenFlowKit:**
- Features a full **White-Label Design System**.
- You can inject [Theming](/docs/en/theming) tokens dynamically (colors, corner radii, fonts).
- Nodes automatically adopt glassmorphism, shadows, and modern UI treatments without writing a single line of CSS.

## 2. Interaction and Editing

**Mermaid.js:**
- Strictly code-in, diagram-out. To move a node, you rewrite the code.
- Layouts are handled automatically by Dagre, which is great but offers zero manual control if a line routes awkwardly.

**OpenFlowKit:**
- **Two-Way Sync**: Write code and watch the canvas update, *or* drag a node on the canvas and watch the code update automatically. 
- You get full drag-and-drop capabilities, manual edge routing, and [Smart Layouts](/docs/en/smart-layout) via ELK.js.

## 3. Export Options

**Mermaid.js:**
- Typically exports as SVG or PNG via a CLI or browser extension.

**OpenFlowKit:**
- Native [Exporting](/docs/en/exporting) to SVG, high-res PNG/JPG.
- **Figma Editable**: OpenFlowKit can export diagrams directly to your clipboard in a format that pastes into Figma as native, editable vector layers and text objects.

## 4. Artificial Intelligence

While AI can write Mermaid syntax, iterating on it is difficult.

**OpenFlowKit:**
- Integrated [Flowpilot AI](/docs/en/ask-flowpilot) directly into the [Command Center](/docs/en/command-center).
- You can prompt the AI, generate the canvas, and then manually adjust the final 10% visually instead of trying to perfectly craft a prompt to fix a misaligned node.
- Supports **BYOK (Bring Your Own Key)** for 7 different AI providers.

## Direct Compatibility

We love Mermaid. That is why OpenFlowKit has a native [Mermaid Integration](/docs/en/mermaid-integration). You can paste any existing Mermaid flowchart or state diagram into OpenFlowKit, and it will instantly convert it into editable, styled React Flow nodes.

Try converting your Mermaid diagrams today in the [Editor](/#/canvas).
