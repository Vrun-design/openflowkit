# OpenFlowKit ⚡️

![OpenFlowKit](https://img.shields.io/badge/OpenFlowKit-Diagram_As_Code-indigo?style=for-the-badge&logo=github)
![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=for-the-badge&logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
[![Product Hunt](https://img.shields.io/badge/Product_Hunt-Launched-orange?style=for-the-badge&logo=product-hunt)](https://www.producthunt.com/products/openflowkit)

**The Open-Source, White-Label Diagramming Engine.**  
Built for developers and technical teams who want diagrams that actually look good. **100% Free & MIT Licensed.**

OpenFlowKit is a professional-grade canvas that combines the power of **React Flow**, **Diagram-as-Code**, and **AI generation** into one privacy-first, fully white-labelable tool.

![OpenFlowKit Canvas](public/readme/1.png)

## 📋 Table of Contents
- [Why OpenFlowKit?](#-why-openflowkit)
- [Key Features](#-key-features)
- [Flowpilot — AI Generation](#-flowpilot--ai-diagram-generation)
- [Node Types](#-node-types)
- [Export Formats](#-export-formats)
- [Architecture](#-architecture--project-structure)
- [Getting Started](#-getting-started)
- [Extensibility & Self-Hosting](#-extensibility--self-hosting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Why OpenFlowKit?

- **MIT Licensed**: 100% free to use, fork, and integrate into commercial products.
- **Pure White-Label**: The UI dynamically absorbs **YOUR** brand tokens. It looks like your product, not a third-party plugin.
- **Diagram-as-Code Native**: Full support for **Mermaid.js** and the **OpenFlow DSL V2**.
- **High-Fidelity UX**: Glassmorphism, smooth animations, and CAD-inspired aesthetics out of the box.
- **Privacy First**: Local-first architecture. Your data never leaves your device.
- **BYOK AI**: Bring your own API key for 7 providers — Gemini, OpenAI, Claude, Groq, NVIDIA, Cerebras, Mistral, or any custom OpenAI-compatible endpoint.

---

## 🔥 Key Features

### ⚪ White-Label Brand Engine
Don't just embed a tool—embed **your brand**. Our engine generates harmonious palettes from a single primary color:

- **Brand Kits**: Toggle between named identities — Wireframe, Executive, Dark Mode.
- **Dynamic Typography**: Native **Google Fonts** support (Inter, Roboto, Outfit, Playfair, Fira, and system fonts).
- **Design System Panel**: Fine-tune glassmorphism, corner radii, border weights, node padding, and edge styles from a unified panel.

![White-Label Brand Engine](public/readme/5.png)

### 🤖 Flowpilot — AI Diagram Generation
Generate entire diagrams from a text prompt. Bring your own API key — your key never leaves your device.

**Supported providers:**

| Provider | Free Tier | Key Prefix | Notes |
|---|---|---|---|
| **Gemini** | ✅ Yes | `AIzaSy...` | Google AI Studio — no credit card needed |
| **Groq** | ✅ Yes | `gsk_...` | Blazing fast · Llama 4 |
| **Cerebras** | ✅ Yes | `csk-...` | 2,400 tok/s on WSE-3 |
| **Mistral** | ✅ Yes | `azy...` | European AI · Codestral · Le Chat |
| **NVIDIA NIM** | ✅ Credits | `nvapi-...` | DeepSeek-V3.2, Llama 4 |
| **OpenAI** | 💳 Paid | `sk-...` | GPT-5 family |
| **Claude** | 💳 Paid | `sk-ant-...` | Anthropic Sonnet/Opus |
| **Custom** | — | any | Any OpenAI-compatible endpoint (Ollama, LM Studio, Together.ai…) |

- **Natural Language → Diagram**: Describe a workflow in plain English, get a complete flowchart.
- **Privacy First**: API keys stored locally, never sent to our servers.
- **OpenFlow DSL V2**: AI outputs type-safe DSL, auto-rendered on canvas.

![React Flow Canvas](public/readme/3.png)

### 🖌️ Native Figma Export
Generate clean, structured SVGs that behave like native Figma layers.
- **Vector Fidelity**: Perfect rounded corners and gradients.
- **Editable Text**: Labels export as text blocks, not paths.
- **One-Click Copy**: Paste directly into Figma with Cmd+V.

![Figma Export](public/readme/4.png)

### 🛠 Advanced Diagram-as-Code
First-class support for **Mermaid.js** and the **OpenFlow DSL V2**.
- **Mermaid Support**: Flowcharts, State Diagrams, and Subgraphs.
- **Live Two-Way Sync**: Edit visually, watch the code update. Edit code, watch the canvas update.
- **Auto-Layout**: Industrial-grade layout algorithms powered by **ELK.js**.
- **OpenFlow DSL V2**: Type-safe syntax with explicit node IDs, styling, groups, and edge customization.

![Diagram-as-Code](public/readme/2.png)

### ⌨️ Command Bar (Cmd+K)
A Spotlight-style command palette for power users:
- **Quick Actions**: Add nodes, run auto-layout, export, toggle panels — without leaving the keyboard.
- **Fuzzy Search**: Find commands, templates, and settings instantly.
- **Keyboard First**: Full shortcut support (Undo, Redo, Copy, Paste, Delete, Select All, Alt+Drag to duplicate).

### 🎬 Playback & Presentation Mode
Step through diagram construction like a slideshow:
- **Build-Order Replay**: Watch nodes and edges appear in the order they were created.
- **Speed Controls**: Adjust playback speed or step through manually.
- **Presentation Ready**: Perfect for walkthroughs, demos, and documentation.

### 📦 Starter Templates
Hit the ground running with **5 production-ready templates**:
- SaaS Subscription Flow
- E-commerce Fulfillment Pipeline
- AI Content Moderation System
- Smart Support Triage
- CI/CD DevOps Pipeline

### 📸 Snapshots & Version History
- **Manual Snapshots**: Save and restore named versions of your work.
- **Local Storage**: Everything stays on your device.

### 🧮 Alignment & Distribution
- **Align**: Left, center, right, top, middle, bottom.
- **Distribute**: Even horizontal/vertical spacing across selected nodes.
- **Smart Edge Routing**: Automatic path optimization to avoid node overlaps.

### ⚛️ Built on React Flow
Leveraging the industry standard for node-based UIs, OpenFlowKit is highly performant and infinitely extensible.

---

## 🧩 Node Types

OpenFlowKit supports **10+ node types** out of the box:

| Node Type | Description | Shapes Available |
|-----------|-------------|------------------|
| **Process** | Standard workflow step | Rounded, Rectangle, Capsule, Circle, Ellipse, Diamond, Hexagon, Parallelogram, Cylinder |
| **Decision** | Branching logic (if/else) | Diamond (default), all shapes |
| **Start** | Flow entry point | Capsule (default), all shapes |
| **End** | Flow termination | Capsule (default), all shapes |
| **Custom** | Freestyle node | All shapes |
| **Section / Group** | Container for grouping related nodes | Rounded rectangle with dashed border |
| **Annotation** | Sticky-note style comments | Folded corner card |
| **Text** | Standalone text labels | No border / transparent |
| **Image** | Embed images into diagrams | Rounded card |
| **Swimlane** | Lane-based process organization | Horizontal lanes |
| **Browser** | Browser mockup wireframe | Chrome-style frame |
| **Mobile** | Mobile device wireframe | Phone-style frame |

Every standard node supports:
- **9 color themes**: Slate, Blue, Emerald, Red, Amber, Violet, Pink, Yellow, Cyan
- **120+ Lucide icons** or custom icon URLs
- **Markdown labels** with bold, italic, links, and inline code
- **Font customization**: Family, size, weight, and style per node (or inherited from Design System)

---

## 📤 Export Formats

| Format | Type | Description |
|--------|------|-------------|
| **SVG** | File download | Scalable vector graphic |
| **PNG** | File download | Raster image |
| **JPG** | File download | Compressed image |
| **Figma** | Clipboard copy | Editable SVG layers (paste with Cmd+V) |
| **Mermaid** | Clipboard copy | Mermaid.js syntax |
| **PlantUML** | Clipboard copy | PlantUML syntax |
| **OpenFlow DSL** | Clipboard copy | Type-safe DSL V2 |
| **JSON** | File save | Full diagram state (nodes, edges, styles) |

---

## 🏗️ Architecture & Project Structure

Built for performance and extensibility:

- **Core**: [React Flow 11](https://reactflow.dev/) + [Vite 6](https://vitejs.dev/)
- **State**: [Zustand](https://zustand-demo.pmnd.rs/) for high-performance persistence
- **Language**: [TypeScript 5.8](https://www.typescriptlang.org/) — strict, zero type errors
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) + CSS Design Tokens

### Project Map

```bash
OpenFlowKit/
├── src/
│   ├── components/
│   │   ├── properties/          # Property panels for Nodes, Edges, Canvas
│   │   ├── SettingsModal/       # Brand, Privacy, Shortcuts, General settings
│   │   ├── custom-nodes/        # Browser, Mobile, Wireframe, Icon nodes
│   │   ├── command-bar/         # Cmd+K command palette
│   │   ├── ui/                  # Branded design system primitives
│   │   ├── landing/             # Landing page sections
│   │   ├── docs/                # Built-in documentation pages
│   │   ├── FlowEditor.tsx       # Main diagram orchestrator
│   │   ├── FlowCanvas.tsx       # React Flow canvas wrapper
│   │   ├── CustomNode.tsx       # Universal node renderer
│   │   ├── CustomEdge.tsx       # Styled edge renderer
│   │   ├── TopNav.tsx           # Top navigation bar
│   │   ├── Toolbar.tsx          # Left sidebar toolbar
│   │   ├── ExportMenu.tsx       # Export format picker
│   │   ├── CommandBar.tsx       # Spotlight-style command palette
│   │   ├── PlaybackControls.tsx # Presentation mode controls
│   │   ├── HomePage.tsx         # File management & Dashboard
│   │   └── WelcomeModal.tsx     # User onboarding
│   ├── hooks/
│   │   ├── useAIGeneration.ts   # Flowpilot AI integration
│   │   ├── useBrandTheme.ts     # Dynamic branding injection
│   │   ├── useDesignSystem.ts   # Design system token access
│   │   ├── useFlowHistory.ts    # Undo/Redo operations
│   │   ├── useFlowExport.ts     # SVG/PNG/JPG export
│   │   ├── usePlayback.ts       # Presentation mode logic
│   │   ├── useKeyboardShortcuts.ts # Hotkey bindings
│   │   ├── useAutoSave.ts       # Persistence & LocalStorage
│   │   ├── useSnapshots.ts      # Version history management
│   │   └── useClipboardOperations.ts # Copy/Paste with offset
│   ├── lib/
│   │   ├── mermaidParser.ts     # Mermaid.js → nodes/edges
│   │   ├── flowmindDSLParserV2.ts # OpenFlow DSL V2 parser
│   │   ├── brandService.ts      # Palette generation
│   │   ├── analytics.ts         # PostHog integration
│   │   └── types.ts             # Type definitions
│   ├── services/
│   │   ├── elkLayout.ts         # ELK.js auto-layout engine
│   │   ├── figmaExportService.ts # Vector SVG for Figma
│   │   ├── exportService.ts     # Image export (PNG, JPG, SVG)
│   │   ├── smartEdgeRouting.ts  # Automatic edge path optimization
│   │   ├── AlignDistribute.ts   # Node alignment & spacing
│   │   ├── openFlowDSLExporter.ts # Nodes/edges → DSL V2
│   │   ├── geminiService.ts     # Multi-provider AI client (BYOK)
│   │   └── templates.ts         # 5 starter templates
│   ├── store.ts                 # Global Zustand state
│   └── theme.ts                 # Color palettes & design tokens
├── docs/                        # Documentation source files
├── public/                      # Static assets & provider logos
└── index.css                    # Tailwind & custom styling
```

---

## 🔌 Extensibility & Self-Hosting

OpenFlowKit is **local-first** for maximum privacy. It's also architected to be easily extended with a backend.

### 1. Connecting a Database
Storage logic is isolated in `src/hooks/useSnapshots.ts`.  
To add Supabase, Firebase, or your own API: fork the repo and replace `localStorage` calls with `fetch` requests. Everything else works automatically.

### 2. Adding Authentication
- **Header:** `TopNav.tsx` has a dedicated slot for a Sign In button.
- **Dashboard:** `HomePage.tsx` can gate content based on auth state.

### 3. Analytics
Privacy-friendly analytics via PostHog.
- `VITE_POSTHOG_KEY` is loaded from `.env.local` (gitignored).
- If you fork this repo, analytics will not fire until you add your own key.

### 4. AI Integration (BYOK)
The AI layer (`useAIGeneration.ts`) and provider client (`geminiService.ts`) are isolated modules.
- **BYOK**: Users add their own API key in Settings → Flowpilot. Keys are stored in `localStorage` only.
- **Multi-Provider**: Gemini, OpenAI, Claude, Groq, NVIDIA, Cerebras, Mistral, or any OpenAI-compatible custom endpoint.
- **Swap Providers**: Select a new provider in-app — no code changes required.

![Extensibility](public/readme/6.png)

---

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/Vrun-design/OpenFlowKit.git
   cd OpenFlowKit
   ```

2. **Install & Launch**
   ```bash
   npm install
   npm run dev
   ```

3. **Optional: Add AI features (BYOK)**  
   Go to **Settings → Flowpilot**, select your provider, and paste your API key.  
   Your key is stored locally — never sent to our servers.

---

## 🤝 Contributing

We are building the open standard for diagramming. PRs for new Mermaid features, node types, or AI optimizations are welcome!

- **Found a bug?** Open an issue.
- **Want a feature?** Start a discussion or open a PR.
- **Love the tool?** ⭐ **Star this repo!** It helps us reach more developers.

---

## 📄 License

MIT © [Varun](https://github.com/Vrun-design)
