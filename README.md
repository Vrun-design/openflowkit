# OpenFlowKit ⚡️

![FlowMind Banner](https://img.shields.io/badge/OpenFlowKit-Diagram_As_Code-indigo?style=for-the-badge&logo=github)
![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=for-the-badge&logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
[![Product Hunt](https://img.shields.io/badge/Product_Hunt-Launch_Soon-orange?style=for-the-badge&logo=product-hunt)](https://www.producthunt.com/posts/openflowkit)

**The Open-Source, White-Label Diagramming Engine.**  
Built for technical teams who need to bridge the gap between code and high-fidelity design. **100% Free & MIT Licensed.**

OpenFlowKit is a professional-grade **White-Label Solution** for developers. Whether you're embedding a canvas into your SaaS or building your own diagramming tool, OpenFlowKit provides the performance of **React Flow** with a billionaire-tier designer aesthetic.

![OpenFlowKit Canvas](public/readme/canvas%201.png)

## 📋 Table of Contents
- [Why OpenFlowKit?](#-why-openflowkit)
- [Key Features](#-key-features)
- [Architecture](#-architecture--project-structure)
- [Getting Started](#-getting-started)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Why OpenFlowKit?

-   **MIT Licensed**: 100% free to use, fork, and integrate into commercial products.
-   **Pure White-Label**: The UI dynamically absorbs **YOUR** brand tokens. It looks like your product, not a third-party plugin.
-   **Diagram-as-Code Native**: Full compatibility with **Mermaid.js** and our type-safe DSL.
-   **High-Fidelity UX**: Glassmorphism, smooth animations, and CAD-inspired aesthetics out of the box.
-   **Privacy First**: Local-first architecture with optional BYOK (Bring Your Own Key) for AI features.

---

## 🔥 Key Features

### ⚪ White-Label Brand Engine
Don't just embed a tool—embed **your brand**. Our engine generates harmonious palettes from a single primary color:

-   **Brand Kits**: Toggle between "Wireframe", "Executive", or "Dark Mode" identities.
-   **Dynamic Typography**: Natively supports **Google Fonts** integration.
-   **UI Physics**: Fine-tune glassmorphism, corner radiuses, and border weights via CSS variables.

### 🖌️ Native Figma Export
Generate clean, structured SVGs that behave like native Figma layers.
- **Vector Fidelity**: Perfect rounded corners and gradients.
- **Editable Text**: Labels export as text blocks, not paths.
- **One-Click Copy**: Paste directly into Figma with standard Cmd+V.

### 🛠 Advanced Diagram-as-Code
First-class support for **Mermaid.js** and the **OpenFlow DSL**.
- **Mermaid Support**: Flowcharts, State Diagrams, and Subgraphs.
- **Live Two-Way Sync**: Tweak the visual graph and watch the code update in real-time.
- **Auto-Layout**: Industrial-grade layout algorithms powered by ELK.js.

### ⚛️ Built on React Flow
Leveraging the industry standard for node-based UIs, OpenFlowKit is highly performant and infinitely extensible.

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
│   │   ├── props/            # Property panels for Nodes/Edges
│   │   ├── ui/               # Branded design system primitives
│   │   ├── FlowCanvas.tsx    # Main diagram orchestrator
│   │   ├── HomePage.tsx      # File management & Dashboard
│   │   └── WelcomeModal.tsx  # User onboarding
│   ├── hooks/
│   │   ├── useBrandTheme.ts  # Dynamic branding injection
│   │   ├── useFlowHistory.ts # Undo/Redo operations
│   │   └── useAutoSave.ts    # Persistence & LocalStorage
│   ├── lib/                  # Parsers & Brand Logic
│   │   ├── mermaidParser.ts  # Diagram parsing
│   │   └── brandService.ts   # Palette generation
│   ├── services/             # Auto-layout & Figma Export engines
│   │   ├── elkLayout.ts      # Auto-layout engine
│   │   └── figmaExportService.ts # Vector SVG generation
│   └── store.ts              # Global State
├── public/                   # Static assets & brand icons
└── index.css                 # Styling configuration
```

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

---

## 🤝 Contributing

We are building the open-standard for diagramming. PRs for new Mermaid features or AI optimizations are highly encouraged!

- **Found a bug?** Open an issue.
- **Want a feature?** Start a discussion or open a PR.
- **Love the tool?** ⭐ **Star this repo!** It helps us reach more developers.

---

## 📄 License

MIT © [Varun]
