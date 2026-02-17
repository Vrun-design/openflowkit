# OpenFlowKit ⚡️

![FlowMind Banner](https://img.shields.io/badge/OpenFlowKit-Diagram_As_Code-indigo?style=for-the-badge&logo=github)
![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=for-the-badge&logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
[![Product Hunt](https://img.shields.io/badge/Product_Hunt-Launch_Soon-orange?style=for-the-badge&logo=product-hunt)](https://www.producthunt.com/posts/openflowkit)

**The Open-Source, White-Label Diagramming Engine.**  
Built for technical teams who need to bridge the gap between code and high-fidelity design. **100% Free & MIT Licensed.**

OpenFlowKit is a professional-grade **White-Label Solution** for developers. Whether you're embedding a canvas into your SaaS or building your own diagramming tool, OpenFlowKit provides the performance of **React Flow** with a billionaire-tier designer aesthetic.

![OpenFlowKit Canvas](public/readme/1.png)

## 📋 Table of Contents
- [Why OpenFlowKit?](#-why-openflowkit)
- [Key Features](#-key-features)
- [Node Types](#-node-types)
- [Export Formats](#-export-formats)
- [Architecture](#-architecture--project-structure)
- [Getting Started](#-getting-started)
- [Extensibility & Self-Hosting](#-extensibility--self-hosting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Why OpenFlowKit?

-   **MIT Licensed**: 100% free to use, fork, and integrate into commercial products.
-   **Pure White-Label**: The UI dynamically absorbs **YOUR** brand tokens. It looks like your product, not a third-party plugin.
-   **Diagram-as-Code Native**: Full compatibility with **Mermaid.js** and the **OpenFlow DSL V2**.
-   **High-Fidelity UX**: Glassmorphism, smooth animations, and CAD-inspired aesthetics out of the box.
-   **Privacy First**: Local-first architecture with optional BYOK (Bring Your Own Key) for AI features.
-   **AI-Powered**: Generate complete diagrams from natural language using **Flowpilot** (Gemini integration).

---

## 🔥 Key Features

### ⚪ White-Label Brand Engine
Don't just embed a tool—embed **your brand**. Our engine generates harmonious palettes from a single primary color:

-   **Brand Kits**: Toggle between "Wireframe", "Executive", or "Dark Mode" identities.
-   **Dynamic Typography**: Natively supports **Google Fonts** integration (Inter, Roboto, Outfit, Playfair, Fira, and system fonts).
-   **Design System Panel**: Fine-tune glassmorphism, corner radii, border weights, node padding, and edge styles via a unified settings panel.

![White-Label Brand Engine](public/readme/5.png)

### 🤖 Flowpilot — AI Diagram Generation
Generate entire diagrams from a text prompt using **Gemini AI** (BYOK — Bring Your Own API Key):

- **Natural Language → Diagram**: Describe a workflow in plain English and get a complete flowchart.
- **Privacy First**: Your API key stays on your device. No server-side storage.
- **OpenFlow DSL V2**: AI outputs the type-safe DSL, then auto-renders it on canvas.

### 🖌️ Native Figma Export
Generate clean, structured SVGs that behave like native Figma layers.
- **Vector Fidelity**: Perfect rounded corners and gradients.
- **Editable Text**: Labels export as text blocks, not paths.
- **One-Click Copy**: Paste directly into Figma with standard Cmd+V.

![Figma Export](public/readme/4.png)

### 🛠 Advanced Diagram-as-Code
First-class support for **Mermaid.js** and the **OpenFlow DSL V2**.
- **Mermaid Support**: Flowcharts, State Diagrams, and Subgraphs.
- **Live Two-Way Sync**: Tweak the visual graph and watch the code update in real-time.
- **Auto-Layout**: Industrial-grade layout algorithms powered by **ELK.js**.
- **OpenFlow DSL V2**: A type-safe DSL with explicit node IDs, styling attributes, groups, and edge customization.

![Diagram-as-Code](public/readme/2.png)

### ⌨️ Command Bar (Cmd+K)
A Spotlight-style command palette for power users:
- **Quick Actions**: Add nodes, run auto-layout, export, toggle panels — all without leaving the keyboard.
- **Fuzzy Search**: Find commands, templates, and settings instantly.
- **Keyboard First**: Full keyboard shortcut support (Undo, Redo, Copy, Paste, Delete, Select All, Alt+Drag to duplicate).

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
Save named snapshots of your diagram at any point:
- **Manual Snapshots**: Save and restore any version of your work.
- **Local Storage**: Everything stays on your device.

### 🧮 Alignment & Distribution
Precision layout tools for polishing diagrams:
- **Align**: Left, center, right, top, middle, bottom.
- **Distribute**: Even horizontal or vertical spacing across selected nodes.
- **Smart Edge Routing**: Automatic path optimization to avoid node overlaps.

### ⚛️ Built on React Flow
Leveraging the industry standard for node-based UIs, OpenFlowKit is highly performant and infinitely extensible.

![React Flow Canvas](public/readme/3.png)

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

Built for performance and extensibility using the best modern web tech:

- **Core**: [React Flow 11](https://reactflow.dev/) + [Vite 6](https://vitejs.dev/)
- **State**: [Zustand](https://zustand-demo.pmnd.rs/) for high-performance persistence.
- **Language**: [TypeScript 5.8](https://www.typescriptlang.org/) for robust type safety.
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) + CSS Design Tokens.

### Project Map

```bash
OpenFlowKit/
├── src/
│   ├── components/
│   │   ├── properties/         # Property panels for Nodes, Edges, Canvas
│   │   ├── SettingsModal/      # Brand, Privacy, Shortcuts, General settings
│   │   ├── custom-nodes/       # Browser, Mobile, Wireframe, Icon nodes
│   │   ├── command-bar/        # Cmd+K command palette
│   │   ├── ui/                 # Branded design system primitives
│   │   ├── landing/            # Landing page sections
│   │   ├── docs/               # Built-in documentation pages
│   │   ├── FlowEditor.tsx      # Main diagram orchestrator
│   │   ├── FlowCanvas.tsx      # React Flow canvas wrapper
│   │   ├── CustomNode.tsx      # Universal node renderer
│   │   ├── CustomEdge.tsx      # Styled edge renderer
│   │   ├── TopNav.tsx          # Top navigation bar
│   │   ├── Toolbar.tsx         # Left sidebar toolbar
│   │   ├── ExportMenu.tsx      # Export format picker
│   │   ├── CommandBar.tsx      # Spotlight-style command palette
│   │   ├── PlaybackControls.tsx # Presentation mode controls
│   │   ├── HomePage.tsx        # File management & Dashboard
│   │   └── WelcomeModal.tsx    # User onboarding
│   ├── hooks/
│   │   ├── useAIGeneration.ts  # Flowpilot AI integration
│   │   ├── useBrandTheme.ts    # Dynamic branding injection
│   │   ├── useDesignSystem.ts  # Design system token access
│   │   ├── useFlowHistory.ts   # Undo/Redo operations
│   │   ├── useFlowExport.ts    # SVG/PNG/JPG export
│   │   ├── usePlayback.ts      # Presentation mode logic
│   │   ├── useKeyboardShortcuts.ts # Hotkey bindings
│   │   ├── useAutoSave.ts      # Persistence & LocalStorage
│   │   ├── useSnapshots.ts     # Version history management
│   │   └── useClipboardOperations.ts # Copy/Paste with offset
│   ├── lib/                    # Parsers & Brand Logic
│   │   ├── mermaidParser.ts    # Mermaid.js → nodes/edges
│   │   ├── flowmindDSLParserV2.ts # OpenFlow DSL V2 parser
│   │   ├── brandService.ts     # Palette generation
│   │   ├── analytics.ts        # PostHog integration
│   │   └── types.ts            # Type definitions
│   ├── services/               # Core engines
│   │   ├── elkLayout.ts        # ELK.js auto-layout engine
│   │   ├── figmaExportService.ts # Vector SVG for Figma
│   │   ├── exportService.ts    # Image export (PNG, JPG, SVG)
│   │   ├── smartEdgeRouting.ts # Automatic edge path optimization
│   │   ├── AlignDistribute.ts  # Node alignment & spacing
│   │   ├── openFlowDSLExporter.ts # Nodes/edges → DSL V2
│   │   ├── geminiService.ts    # Gemini API client
│   │   └── templates.ts        # 5 starter templates
│   ├── store.ts                # Global Zustand state
│   └── theme.ts                # Color palettes & design tokens
├── docs/                       # Documentation source files
├── public/                     # Static assets & brand icons
└── index.css                   # Tailwind & custom styling
```

---

## 🔌 Extensibility & Self-Hosting

OpenFlowKit is designed as a **Local-First** application for maximum privacy and simplicity. However, it is architected to be easily extended with a backend.

### 1. Connecting a Database
The entire storage logic is isolated in `src/hooks/useSnapshots.ts`. 
To add a database (Supabase, Firebase, or your own API):
1.  Fork the repo.
2.  Modify `useSnapshots.ts` to replace `localStorage` calls with your API `fetch` requests.
3.  The rest of the app (UI, Canvas, State) will work automatically.

### 2. Adding Authentication
The UI is prepared for auth integration.
-   **Header:** `TopNav.tsx` has a dedicated slot for a "Sign In" button.
-   **Dashboard:** `HomePage.tsx` can strict-gate content based on auth state.

### 3. Analytics
We use PostHog for privacy-friendly analytics. 
-   **Safe Forking:** The analytics key is loaded from `.env.local` (which is gitignored). 
-   **No Pollution:** If you fork this repo, analytics will **not** work until you add your own `VITE_POSTHOG_KEY`. Your data is safe; our data is safe.

### 4. AI Integration
The AI generation hook (`useAIGeneration.ts`) and service (`geminiService.ts`) are isolated modules.
-   **BYOK Model:** Users add their own Gemini API key via the Privacy Settings panel.
-   **Swap Models:** Replace `geminiService.ts` with any LLM API (OpenAI, Anthropic, local models).

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

3. **Optional: Add AI features**
   ```bash
   # Create .env.local and add your Gemini API key
   echo "VITE_GEMINI_API_KEY=your_key_here" > .env.local
   ```

---

## 🤝 Contributing

We are building the open standard for diagramming. PRs for new Mermaid features, node types, or AI optimizations are highly encouraged!

- **Found a bug?** Open an issue.
- **Want a feature?** Start a discussion or open a PR.
- **Love the tool?** ⭐ **Star this repo!** It helps us reach more developers.

---

## 📄 License

MIT © [Varun]
