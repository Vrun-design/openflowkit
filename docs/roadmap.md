# 🗺️ OpenFlowKit Product Roadmap

We are building the standard for open-source, white-label diagramming. This roadmap outlines our vision for the future of **OpenFlowKit**.

> **Note**: This is a living document. Priorities may change based on community feedback.

---

## 🚀 Q3 2026: The AI Expansion (v1.2)
*Focus: Making the diagram generation smarter, faster, and more versatile.*

### 🧠 Multi-Model AI Support
Move beyond a single provider. We will support a "Bring Your Own Key" model for all major LLMs:
- **Anthropic Claude 3.5 Sonnet**: Optimized for complex system architecture diagrams.
- **OpenAI GPT-4o**: Fast, reasoning-heavy generation for business logic flows.
- **Local LLMs (Ollama)**: run Llama 3 or Mistral locally for 100% offline, air-gapped diagram generation.

### ⚡ Real-time "Copilot" Mode
- **Autocomplete for Flows**: As you drag a node, the AI suggests the next 3 most logical steps based on your current graph context.
- **Smart Refactoring**: Select a mess of nodes and ask AI to "Optimize Layout" or "Group into Subgraph".


---

## 🤝 Q4 2026: Collaboration & Teams (v2.0)
*Focus: Turning a solo developer tool into a team powerhouse.*

### 👥 Real-Time Multiplayer
- **Live Cursors**: See where your teammates are looking.
- **Conflict-Free Editing**: Powered by **Yjs** and CRDTs for seamless collaborative sessions.
- **Presence**: "Who's on this flow?" indicators.

### 💬 Contextual Comments
- Pin comments directly to nodes or edges.
- @mention team members to assigned tasks within the diagram.
- Resolve threads as you complete the implementation.

### 💾 Cloud Persistence Adapter
- Optional reference implementation for saving flows to PostgreSQL/Supabase.
- "Project" view to organize hundreds of diagrams.

---

## 🛠️ 2027: The Platform Era (v3.0)
*Focus: Deep integration into the developer ecosystem.*

### 🔌 IDE Extensions
- **VS Code Extension**: Edit `.flow` or `.mermaid` files directly inside VS Code with our premium GUI.
- **IntelliJ / JetBrains Plugin**: Native support for Java/Kotlin ecosystem diagrams.

### 🎨 Advanced Design System
- **Figma Sync**: Two-way synchronization. Push changes from Figma to OpenFlowKit and vice-versa.
- **Custom React Nodes**: A plugin API to let developers render *any* React component inside a node (Charts, Data Grids, Videos).

### 📊 Data-Driven Diagrams
- **Live Metrics**: Bind node colors/sizes to real-time API data (e.g., Server Health visualization).
- **SQL-to-ERD**: Connect to your DB and auto-generate the Entity Relationship Diagram.

---

## 💡 Community Wishlist
Features we are exploring based on user requests:
- [ ] **Presentation Mode**: Slide-by-slide walkthrough of complex flows.
- [ ] **Accessibility (A11y)**: Screen reader support and keyboard navigation improvements.
- [ ] **Internationalization (i18n)**: Translating the UI into 10+ languages.

---

*Current Version: v1.0.0-beta*  
*Last Updated: February 2026*
