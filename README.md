# FlowMind ⚡️

![FlowMind Banner](https://img.shields.io/badge/FlowMind-Diagram_As_Code-indigo?style=for-the-badge&logo=github)
![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**The Developer-First Diagramming Canvas.**  
Turn **Mermaid**, **Text**, and **Ideas** into beautiful, interactive flowcharts instantly.

FlowMind bridges the gap between **Diagram-as-Code** and visual whiteboarding. It's built for developers who love the speed of typing code but need the flexibility of a drag-and-drop canvas.

![FlowMind Banner](public/Flow_mind_1.png)

![FlowMind Banner](public/Flow_mind_2.png)

---

## 🌟 Why FlowMind?

Most diagramming tools are either "Code Only" (Mermaid/PlantUML) or "Drag & Drop Only" (draw.io). FlowMind is **both**.

- **📝 Mermaid & DSL Native**: Paste your Mermaid code, and it instantly renders as editable nodes.
- **🎨 Designed for Figma**: Copy your entire flow and paste it into Figma as **fully editable layers**. Text remains text.
- **✨ Beautiful Defaults**: No more ugly charts. FlowMind uses a premium glassmorphic UI with auto-layout.
- **⚡️ Rapid Prototyping**: Text-to-Flow capabilities let you scaffold complex systems in seconds.
- **🧠 AI Copilot**: Stuck? Ask the built-in AI to "Add error handling" or "Explain this flow".

---

## 🔥 Key Features

### 🖌️ Native Figma Export (New!)
Stop screenshotting your diagrams. FlowMind generates clean, structured SVGs that behave like native Figma layers.
- **Editable Text**: Labels and sublabels export as `<text>` blocks, not paths. Fix typos in Figma without redrawing.
- **Vector Fidelity**: Perfect rounded corners, gradients, and stroke precision.
- **One-Click Copy**: Just hit "Copy for Figma" and paste (Cmd+V).

### 🛠 Diagram as Code
First-class support for **Mermaid.js** and our own **FlowMind DSL**.
- **Import**: Paste `graph TD; A-->B;` and see it come to life.
- **Export**: Get clean Mermaid, PlantUML, or JSON output for your docs.
- **Live Sync**: Tweaking the visual graph updates the underlying code structure.

### 💎 Premium UX & Smart Editor
- **Intelligent Text Nodes**: Multi-line labels with auto-expanding text areas and Markdown support.
- **Auto-Sizing**: Nodes automatically grow vertically to fit your content.
- **Movable Edge Labels**: Drag labels anywhere along the connector wire; they stick like beads on a string.
- **Toast Notifications**: Non-intrusive, animated feedback for all your actions.
- **Glassmorphism UI**: Modern, translucent controls that stay out of your way.

### 🤖 Intelligent Assistance
While FlowMind is a solid manual tool, it has an AI engine under the hood when you need speed:
- **Text-to-Diagram**: "System architecture for a microservices app" -> *Boom, full diagram.*
- **Contextual Edits**: Select a node and type "Expand this into a login subprocess".

---

## 🏗️ Architecture & Tech Stack

Built for performance and extensibility using the best modern web tech:

- **Core**: [React Flow](https://reactflow.dev/) + [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/) for type-safe reliability.
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with a custom design system.
- **State**: React Hooks + Local Storage persistence.
- **Format**: Custom manageable DSL for graph persistence + Mermaid parsers.

---

## 🚀 Getting Started

1. **Clone the repo**
   ```bash
   git clone https://github.com/Vrun-design/FlowMind.git
   cd FlowMind
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run locally**
   ```bash
   npm run dev
   ```

---

## 🤝 Contributing

We want FlowMind to be the standard open-source diagramming tool for developers.
PRs are highly encouraged!

- **Found a bug?** Open an issue.
- **Want a feature?** Start a discussion.
- **Love the tool?** ⭐ **Star this repo!** It helps us ship faster.

---

## 📄 License

MIT © [Varun]
