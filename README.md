# FlowMind AI 🧠

![FlowMind AI Banner](https://img.shields.io/badge/FlowMind-AI-indigo?style=for-the-badge&logo=openai)
![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5.0-purple?style=for-the-badge&logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-cyan?style=for-the-badge&logo=tailwindcss)

**FlowMind AI** is an intelligent, text-to-flowchart assistant that helps you visualize ideas instantly. By combining the power of **Google Gemini AI** with the flexibility of **React Flow**, it allows users to generate, modify, and export complex diagrams using natural language commands.

Whether you're brainstorming system architectures, mapping out user journeys, or documenting business processes, FlowMind AI turns your thoughts into structured visuals in seconds.

---

## ✨ Key Features

### 🤖 AI-Powered Generation
- **Text-to-Flow**: Describe your process (e.g., "Create a login flow with OAuth and 2FA") and watch it appear.
- **Context-Aware Updates**: Select nodes and ask AI to "Add error handling" or "Simplify this section".
- **Smart Suggestions**: AI understands your current graph context to making relevant additions.

### ⚡ Productivity Tools
- **Command Bar**: A centralized command palette (Cmd+K) to access AI, Templates, Code, and Actions.
- **Node Templates**: Pre-built patterns for common workflows (Auth, CRUD, Approval Chains).
- **Multi-Tab Support**: Work on multiple flows simultaneously within a single session.
- **Auto-Layout**: Instantly organize messy diagrams with Dagre-powered automatic positioning.
- **Pro Shortcuts**: 
  - **Multi-Select**: Hold `Cmd` (Mac) or `Ctrl` (Windows) and drag to select multiple items.
  - **Quick Pan**: Hold `Space` (coming soon) to pan around the canvas.

### 💾 Data & Persistence
- **Auto-Save**: Never lose your work. Changes are automatically saved to local storage.
- **Version Snapshots**: Create named save points (e.g., "v1 - Initial Draft") and restore them anytime.
- **JSON Import/Export**: Robust save/load functionality for sharing or backing up flows.

### 🎨 Visual & Export
- **Glassmorphism UI**: A premium, modern interface with blur effects and refined typography.
- **Custom Node Types**: Semantic nodes for Start, Process, Decision, End, and Annotations.
- **Edge Styling**: Semantic edge labels (Yes/No, Success/Error) with automatic styling.
- **Export Options**: 
  - 📸 **PNG Image**: High-resolution export for presentations.
  - 📝 **MermaidJS**: Copy code for Markdown documentation.
  - 🌿 **PlantUML**: Copy code for technical specifications.
  - 🔮 **FlowMind DSL**: Native DSL for easy sharing and AI processing.

---

## 🏗️ Architecture

FlowMind AI is built with a modular component architecture:

- **FlowEditor (`App.tsx`)**: The core orchestrator managing React Flow state, history, and global events.
- **CommandBar**: The central "brain" of the UI, handling user intent (AI, Templates, Navigation) in a unified modal.
- **TopNav**: Manages global context (Tabs, Export, Settings) with a consistent glassmorphic design.
- **Toolbar**: Quick-access tools for canvas manipulation (Undo/Redo, Zoom, Layout) with unified tooltips.
- **Services**:
  - `visual_generator`: Handles AI prompt processing and graph generation.
  - `flowmindDSLExporter`: Manages the native Domain Specific Language for flow persistence.


---

## 🛠️ Tech Stack

- **Frontend Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Diagramming Core**: [React Flow](https://reactflow.dev/)
- **AI Model**: [Google Gemini Pro](https://deepmind.google/technologies/gemini/) (via `@google/genai`)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Layout Engine**: [Dagre](https://github.com/dagrejs/dagre)
- **Image Generation**: [html-to-image](https://github.com/bubkoo/html-to-image)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- A [Google AI Studio](https://makersuite.google.com/app/apikey) API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/flowmind-ai.git
   cd flowmind-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   VITE_GOOGLE_AI_API_KEY=your_gemini_api_key_here
   ```

4. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📖 Usage Guide

### Generating a Flow
1. Click the **Sparkles (AI)** icon in the toolbar.
2. Enter a prompt: _"Design a payment processing flow with Stripe and PayPal fallback."_
3. Click **Generate**.

### Modifying with AI
1. Select specific nodes you want to change.
2. Open the AI panel.
3. Enter a command: _"Add a retry mechanism for failed payments."_
4. The AI will modify only the selected context.

### Using Templates
1. Click the **Layout** icon in the toolbar.
2. Browse categories (Auth, Data, Logic).
3. Click a template to insert it into your active flow.

### Version Control
1. Click the **Clock** icon in the toolbar.
2. Type a name for your snapshot and click **Save**.
3. To revert, simply click the restore icon next to any saved version.

---

## 🛣️ Roadmap

- [ ] **Cloud Sync**: User accounts and cloud storage for flows.
- [ ] **Real-time Collaboration**: Multiplayer editing with CRDTs.
- [ ] **Custom Node Builder**: UI for creating custom node shapes/styles.
- [ ] **Workflow Execution**: Export to executable formats (e.g., n8n, LangChain).

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Made with ❤️ by [Your Name]
