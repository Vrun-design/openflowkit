# Mermaid.js vs OpenFlowKit

Mermaid.js is an incredible text-based diagramming tool that has become the standard for markdown-based documentation. However, when you need a presentation-ready, highly interactive canvas, raw Mermaid can sometimes feel limiting.

This is why **OpenFlowKit is built on top of Mermaid.js**, giving you the best of both worlds: Diagram-as-code speed with visual-editor polish.

## 1. Aesthetics and Branding

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
- Integrated [AI Studio](/docs/en/ask-flowpilot) directly into the [Command Center](/docs/en/command-center).
- You can prompt the AI, generate the canvas, and then manually adjust the final 10% visually instead of trying to perfectly craft a prompt to fix a misaligned node.
- Supports **BYOK (Bring Your Own Key)** for 7 different AI providers.

## Direct Compatibility

We love Mermaid. That is why OpenFlowKit has a native [Mermaid Integration](/docs/en/mermaid-integration). You can paste any existing Mermaid flowchart or state diagram into OpenFlowKit, and it will instantly convert it into editable, styled React Flow nodes.

Try converting your Mermaid diagrams today in the [Editor](/#/canvas).
