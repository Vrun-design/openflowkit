<div align="center">

<img src="public/favicon.svg" width="90" alt="OpenFlowKit logo" />

<h1>OpenFlowKit</h1>

<p><strong>The open-source diagramming studio for developers and builders.</strong><br/>
Prompt · Import · Edit · Export as animated video · Collaborate — entirely in your browser, no account required.</p>

<p>
  <a href="https://github.com/Vrun-design/openflowkit/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-orange.svg" alt="MIT License" /></a>
  <a href="https://github.com/Vrun-design/openflowkit/stargazers"><img src="https://img.shields.io/github/stars/Vrun-design/openflowkit?style=flat&color=yellow" alt="GitHub Stars" /></a>
  <img src="https://img.shields.io/badge/React-19-61dafb.svg" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6.svg" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Vite-6-646cff.svg" alt="Vite 6" />
  <img src="https://img.shields.io/badge/Tests-Vitest-6e9f18.svg" alt="Vitest" />
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" />
</p>

<p>
  <a href="https://www.producthunt.com/products/openflowkit?utm_source=badge-top-post-topic-badge&utm_medium=badge&utm_campaign=badge-openflowkit" target="_blank">
    <img src="https://api.producthunt.com/widgets/embed-image/v1/top-post-topic-badge.svg?post_id=1081019&theme=light&period=weekly&topic_id=44" alt="OpenFlowKit on Product Hunt" width="200" height="43" />
  </a>
</p>

<h3>
  <a href="https://app.openflowkit.com">→ Launch the App</a>
  &nbsp;·&nbsp;
  <a href="https://openflowkit.com">Website</a>
  &nbsp;·&nbsp;
  <a href="https://docs.openflowkit.com">Documentation</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/Vrun-design/openflowkit/issues/new?template=bug_report.md">Report a Bug</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/Vrun-design/openflowkit/issues/new?template=feature_request.md">Request a Feature</a>
</h3>

</div>

---

## What is OpenFlowKit?

OpenFlowKit is a **local-first, developer-grade diagramming workspace** that lives entirely in your browser. It is built for the engineers, architects, and builders who create system diagrams for a living — and who are tired of paying for cloud tools, surrendering their data, or fighting with drag-and-drop tools that produce static images instead of living, version-controllable artifacts.

**The core loop is simple:**

```
Prompt / Import → Edit visually or in code → Export anywhere
```

Start from a plain-English prompt, a Mermaid file, SQL schema, OpenAPI spec, Terraform config, or one of 20 built-in templates. Refine on a polished canvas. Export to Mermaid, PlantUML, Figma, PNG, PDF, or a cinematic reveal video. Your diagrams stay in your browser by default, and your API keys never leave your device.

---

## Why OpenFlowKit?

Every existing tool misses something critical for developers. OpenFlowKit fills those gaps.

| Tool | The gap | How OpenFlowKit fills it |
|---|---|---|
| **Excalidraw** | Freeform only, no structured diagram types, no DSL | 8 structured diagram families, bidirectional diagram-as-code, Figma export |
| **Draw.io / diagrams.net** | Dated UX, no AI, no code representation | Modern React 19 canvas, 9 AI providers, OpenFlow DSL |
| **Mermaid.js** | Code-only, no visual editor | Full visual editor on top of Mermaid — edit visually or in code, bidirectionally |
| **tldraw** | Whiteboard-first, no structured diagram types | Cloud architecture (AWS/Azure/CNCF icons), class, ER, state, and more |
| **Lucidchart / Miro** | Paid, cloud-only, account required | MIT licensed, local-first, and usable without an account |

**OpenFlowKit combines** a visual canvas editor, a diagram-as-code environment, an AI-powered generator, a developer import pipeline, and a Figma / docs export workflow in one open-source, local-first app.

---

## ✨ Spotlight: Cinematic Export

<p align="center">
<strong>Turn a finished diagram into a polished animated walkthrough without leaving the editor.</strong>
</p>

Most diagramming tools stop at static images. OpenFlowKit can export a **cinematic build video or GIF** so a diagram can be presented as a lightweight animated walkthrough. This is especially useful for:

- 📣 **Conference talks & demos** — walk the audience through your system live
- 📖 **Docs & wikis** — embed an animated GIF that loads without a video player
- 🐦 **Social posts & Product Hunt launches** — eye-catching previews that stop the scroll
- 🎓 **Engineering onboarding** — show new hires how a system connects, step by step

**How it works:**
1. Build and refine the diagram on the canvas
2. Open **Export**
3. Choose a cinematic video or cinematic GIF output
4. Generate a shareable artifact directly in the browser

No account. No upload. No third-party video service. Rendered entirely in your browser.

---

## Features

### 🤖 Flowpilot — AI Generation & Editing

Describe a system in natural language. Flowpilot generates a fully laid-out, editable diagram in seconds. Bring your own key from any supported provider — keys are stored in your browser and never transmitted to OpenFlowKit servers.

**9 supported AI providers:**

| Provider | Default model |
|---|---|
| Google Gemini | `gemini-2.5-flash-lite` |
| OpenAI | `gpt-5-mini` |
| Anthropic Claude | `claude-sonnet-4-6` |
| Groq | `llama-4-scout-17b-16e-instruct` |
| Mistral | `mistral-medium-latest` |
| NVIDIA | `llama-4-scout-17b-16e-instruct` |
| Cerebras | `gpt-oss-120b` |
| OpenRouter | `google/gemini-2.5-flash` |
| **Custom endpoint** | Any OpenAI-compatible API (Ollama, LM Studio, Together AI…) |

**Flowpilot capabilities:**

- ✦ Generate a new diagram from a text prompt
- ✦ Iteratively edit the existing canvas with targeted instructions
- ✦ Scope edits to the current selection only
- ✦ Attach an image alongside your prompt for visual context
- ✦ Stream responses in real time with a cancel button
- ✦ Multi-turn conversation with browser-local chat history
- ✦ **Diff preview** — see added / updated / removed node count before applying; confirm or discard
- ✦ **Shared AI settings modal** — open provider and key setup from Flowpilot when AI is not configured

---

### 📥 Developer Import Pipelines

Feed any structured artifact into OpenFlowKit and get a ready-to-edit diagram:

| Source | Generated diagram |
|---|---|
| **SQL DDL** (`CREATE TABLE` statements) | Entity-relationship diagram with typed fields and cardinalities |
| **Terraform / Kubernetes YAML / Docker Compose** | Cloud architecture diagram with provider icons |
| **OpenAPI / Swagger spec** | API sequence diagram with operations and responses |
| **Source code** (TS, JS, Python, Go, Java, Ruby, C#, C++, Rust) | Architecture draft from module structure |
| **Mermaid** | Native import, fully editable |

File upload with automatic language detection, or paste raw text.

---

### 📐 8 Structured Diagram Types

| Diagram | What it includes | Mermaid export |
|---|---|---|
| **Flowchart** | Start/end, process, decision, annotation, swimlane, section | `flowchart TD` |
| **Architecture** | AWS, Azure, CNCF icons; zones, trust domains, service boundaries | `architecture-beta` |
| **Class Diagram** | UML classes, attributes, methods, stereotypes, all relation types | `classDiagram` |
| **ER Diagram** | Entities with typed fields (PK, FK, NN, UNIQUE), cardinality edges | `erDiagram` |
| **Mind Map** | Hierarchical topics, curved branches, depth-aware auto-layout | `mindmap` |
| **User Journey** | Scored tasks, named sections, actor annotations | `journey` |
| **State Diagram** | States, composite containers, start-node markers | `stateDiagram-v2` |
| **Wireframe** | Browser shells, mobile frames, UI component blocks | — |

---

### 📤 Export Everywhere

**🖼 Images:** SVG · PNG (transparent, hi-res) · JPG · PDF

**🎬 Animation & Video** *(unique to OpenFlowKit)*

| Format | Description |
|---|---|
| Playback MP4 / WebM | Simple video replay of your diagram |
| Playback GIF | Looping animation for embedding anywhere |
| **Cinematic Video** ⭐ | Presentation-friendly animated diagram export for talks, demos, and walkthroughs |
| **Cinematic GIF** ⭐ | Lightweight looping animated export for embeds and social sharing |

**`{}` Code & Data:** JSON · OpenFlow DSL · Mermaid · PlantUML

**🎨 Design Handoff:** Paste directly into **Figma** as editable SVG with intact text layers

**🔗 Sharing:** Read-only viewer link — diagram encoded in the URL, zero server required

---

### `{}` OpenFlow DSL — Diagram as Code

Every diagram has a live text representation. Edits sync **bidirectionally** — change the canvas, the code updates; change the code, the canvas updates. The AI reads and writes this format, making it ideal for version-controlled documentation and automated diagram generation.

```yaml
# Example: AWS architecture as code
Auth Service   [architecture] provider=aws resource=security
API Gateway    [architecture] provider=aws resource=api
Redis Cache    [architecture] provider=aws resource=database
Postgres DB    [architecture] provider=aws resource=database

Auth Service -> API Gateway
API Gateway  -> Redis Cache
API Gateway  -> Postgres DB
```

The DSL supports explicit node IDs, typed attributes, edge styles, labeled connections, and group containers — all in a concise, human-readable format. See [DSL_MANUAL.md](DSL_MANUAL.md) for the full reference.

---

### 🎬 Playback & Presentation

OpenFlowKit includes presentation-oriented animated export for sharing a diagram as motion instead of a single static frame.

- **Cinematic export:** generate a browser-rendered video or GIF from the current diagram
- **Presentation-ready output:** useful for demos, onboarding, social posts, and docs walkthroughs
- **Shareable artifacts:** export motion without a separate video editor

---

### 📦 20 Built-in Templates

One-click starters across 7 categories, fully searchable.

<details>
<summary>View all templates</summary>

**Flowchart**
- Subscription Upgrade Workflow
- Incident Escalation Runbook
- CI/CD Release Train
- Payment Recovery Loop
- AI Support Escalation

**AWS**
- AWS Event-Driven API (API Gateway, Lambda, EventBridge, SQS, DynamoDB, Step Functions, SES)
- AWS Data Lake Analytics (S3, Glue, DataZone, Athena, Redshift)
- AWS Container Delivery Platform
- AWS Security Operations Loop

**Azure**
- Azure AI Application Platform
- Azure Landing Zone Operations
- Azure Data Estate
- Azure Identity Access Hub

**CNCF**
- CNCF GitOps Platform
- CNCF Service Mesh Security
- CNCF Observability Stack

**Mindmap · Journey · Wireframe**
- Product Discovery Mindmap
- Engineering Strategy Mindmap
- Customer Onboarding Journey
- Cross-Platform SaaS Starter Wireframe

</details>

---

### 🔀 Smart Auto-Layout

One-click ELK.js layout with four presets:

| Preset | Algorithm | Best for |
|---|---|---|
| Tree | `mrtree`, top-down | Org charts, dependency trees |
| Hierarchical | `layered`, top-down | Most flows and sequences |
| Compact | `layered`, left-right, tight | Dense diagrams |
| Spacious | `layered`, left-right, loose | Presentations and handoffs |

---

### 👥 Real-Time Collaboration *(beta)*

Peer-to-peer collaboration via **WebRTC + Yjs**. Share a room link — participants see live cursors, presence indicators, and a fully synchronized canvas state. No server-side diagram storage, ever.

---

### ⌨️ Canvas, Keyboard & Multi-Tab Workspace

- **Multi-tab workspace** — multiple diagrams open simultaneously
- **Undo / redo** — per-tab history with full undo stack
- **Snapshots** — named point-in-time save states
- **Inline label editing** — double-click or `F2`
- **Bulk properties** — edit multiple selected nodes at once
- **Style clipboard** — `Cmd+Alt+C` / `Cmd+Alt+V` to copy/paste styles between nodes
- **Node quick-create** — `Alt+Arrow` to spawn and connect a new node in any direction
- **Node search** — `Cmd+F` to find nodes by label
- **Architecture lint** — automatic validation rules for cloud diagrams
- **Design systems** — full color/typography theming with white-label support

**Essential shortcuts:**

| Shortcut | Action |
|---|---|
| `Cmd+K` | Command Bar / Flowpilot |
| `Cmd+F` | Search nodes |
| `?` | Keyboard shortcuts help |
| `Shift+1` | Fit view |
| `Cmd+Z` / `Cmd+Shift+Z` | Undo / Redo |
| `Cmd+D` | Duplicate |
| `Alt+Arrow` | Quick-create connected node |
| `F2` | Edit label inline |
| `Escape` | Clear selection |
| `Cmd+Alt+C` / `Cmd+Alt+V` | Copy / Paste style |

---

### 🌐 Internationalization

Available in 7 languages: **English · German · Spanish · French · Japanese · Turkish · Chinese**

---

### 🔒 Privacy & Security

- **No account, ever.** No sign-up, no login, no user tracking.
- **Keys stay in your browser.** API keys are never transmitted to OpenFlowKit. Persistent storage and session-only storage are both supported.
- **Local-first persistence.** Diagrams are saved in browser-local storage by default and restored on refresh and browser restart unless you delete them.
- **No telemetry.** We don't collect usage data.
- **MIT licensed.** No lock-in, no strings attached.

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI framework | React 19 + TypeScript 5 |
| Canvas engine | React Flow / XYFlow 12 |
| Graph layout | ELK.js |
| State management | Zustand 5 |
| Styling | Tailwind CSS 4 |
| Animation | Framer Motion |
| Collaboration | Yjs + y-webrtc + y-indexeddb |
| Build | Vite 6 |
| Unit / integration tests | Vitest 4 + Testing Library |
| E2E tests | Playwright |
| Docs site | Astro + Starlight |
| Hosting | Cloudflare Pages |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

### Run locally in 30 seconds

```bash
git clone https://github.com/Vrun-design/openflowkit.git
cd openflowkit
npm install
npm run dev
# → http://localhost:5173
```

### Add an AI provider

Open the AI panel in the sidebar. If no key is configured, the **Add key** action opens the shared AI settings modal, where you can choose a provider, enter your API key, and decide whether it should persist on the current device or only for the current session.

---

## Commands

### Development

```bash
npm run dev           # Start dev server (localhost:5173)
npm run build         # Production build
npm run preview       # Preview production build locally
npm run bundle:check  # Analyze bundle size against budget
npm run lint          # ESLint (zero warnings allowed)
npm test -- --run     # Run all unit + integration tests once
```

### Focused test suites

```bash
npm run test:s0               # Core smoke tests
npm run test:s10-state        # Store and state diagram tests
npm run test:s10-canvas       # Canvas interaction tests
npm run test:s4-handle-safety # Handle safety tests
```

### E2E

```bash
npm run e2e           # Full Playwright suite
npm run e2e:ci        # Chromium only (CI mode)
```

### Workspaces

```bash
npm run dev   --workspace=docs-site   # Docs site dev server
npm run build --workspace=docs-site   # Build docs

npm run dev   --workspace=web         # Marketing site dev server
npm run build --workspace=web         # Build marketing site
```

---

## Project Structure

```
openflowkit/
├── src/
│   ├── app/                  Route state helpers
│   ├── components/           UI surfaces, editor shells, nodes, panels, command bar
│   ├── config/               Rollout flags and AI provider config
│   ├── context/              React context providers
│   ├── diagram-types/        Diagram family plugins and property panel registration
│   ├── hooks/                Feature + editor hooks (AI, keyboard, operations, export)
│   ├── i18n/                 Localization strings (7 languages)
│   ├── lib/                  Shared types, parsers, compat helpers, utilities
│   ├── services/             Domain services (AI, export, collaboration, storage…)
│   └── store/                Zustand store, slices, persistence, defaults
│
├── docs-site/                Public documentation (Astro + Starlight)
├── web/                      Marketing site (Astro)
├── e2e/                      Playwright end-to-end tests
├── assets/                   Icon packs and shape metadata
└── scripts/                  Build, benchmark, sitemap, asset tooling
```

### Editor architecture

The editor follows a strict four-layer composition model that separates concerns cleanly:

```
FlowEditor.tsx                                    ← render shell only
  └─ useFlowEditorScreenModel.ts                  ← compose store state + domain hooks + refs
       └─ buildFlowEditorScreenControllerParams.ts ← pure mapping (no side effects)
            └─ useFlowEditorController.ts          ← adapts to shell/studio/panel/chrome props
```

Domain services own logic. Hooks compose state and side effects. Components render and delegate. See [ARCHITECTURE.md](ARCHITECTURE.md) for the full breakdown.

---

## Deployment

| Surface | URL | Build command | Output dir |
|---|---|---|---|
| App | `app.openflowkit.com` | `npm run build` | `dist/` |
| Docs | `docs.openflowkit.com` | `npm run build --workspace=docs-site` | `docs-site/dist/` |
| Landing | `openflowkit.com` | `npm run build --workspace=web` | `web/dist/` |

All three surfaces deploy to Cloudflare Pages. See [`docs/cloudflare-pages-setup.md`](docs/cloudflare-pages-setup.md).

---

## Contributing

Contributions of all kinds are welcome — bug reports, features, docs, translations, and design feedback. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

**Key constraints to know before contributing:**

| Constraint | Why it matters |
|---|---|
| **Do not rename persisted storage keys** without a migration path | Renaming silently erases existing user browser data |
| **Gate new features** behind a rollout flag in `src/config/rolloutFlags.ts` | Allows safe promotion and easy rollback |
| **Keep lint, test, and build green** | CI is a strict gate — zero ESLint warnings |
| **Prefer small, reversible change-sets** | Easier to review, safer to merge |
| **No new runtime dependencies** without opening an issue first | Keeps the bundle lean and deliberate |
| **Component size ≤ 250 lines** | Maintains readability and testability |

### Quick contributor setup

```bash
# Fork + clone, then:
npm install          # installs deps + activates Husky pre-commit hooks
npm run dev          # start dev server
npm test             # run tests in watch mode
npm run lint         # check for lint issues
```

Pre-commit hooks run `lint-staged` → ESLint on all changed `.ts`/`.tsx` files. Fix all errors before pushing.

---

## License

[MIT](LICENSE) — free to use, modify, and redistribute. No strings attached.

---

<div align="center">

### Built something with OpenFlowKit? A ⭐ on GitHub helps more developers find it.

[![Star on GitHub](https://img.shields.io/github/stars/Vrun-design/openflowkit?style=social)](https://github.com/Vrun-design/openflowkit/stargazers)

**[→ Launch the App](https://app.openflowkit.com)** &nbsp;·&nbsp; **[Read the Docs](https://docs.openflowkit.com)** &nbsp;·&nbsp; **[Contribute](CONTRIBUTING.md)** &nbsp;·&nbsp; **[Report a Bug](https://github.com/Vrun-design/openflowkit/issues)**

<sub>React 19 · TypeScript 5 · Vite 6 · ELK.js · Yjs · Cloudflare Pages</sub>

<sub>MIT Licensed · Local-first · No telemetry · No account required · No lock-in</sub>

</div>
