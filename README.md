<div align="center">

<img src="public/favicon.svg" width="80" alt="OpenFlowKit logo" />

# OpenFlowKit

**The open-source diagramming studio with AI generation, diagram-as-code, and Figma export.**  
Local-first. No account. No cloud. No cost. MIT licensed.

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
    <img src="https://api.producthunt.com/widgets/embed-image/v1/top-post-topic-badge.svg?post_id=1081019&theme=light&period=weekly&topic_id=44" alt="OpenFlowKit - Open-source diagramming studio with AI, diagram-as-code &amp; Figma export | Product Hunt" width="200" height="43" />
  </a>
</p>

<p>
  <a href="https://app.openflowkit.com"><strong>→ Open the App</strong></a>
  &nbsp;·&nbsp;
  <a href="https://openflowkit.com">Website</a>
  &nbsp;·&nbsp;
  <a href="https://docs.openflowkit.com">Docs</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/Vrun-design/openflowkit/issues/new?template=bug_report.md">Report a Bug</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/Vrun-design/openflowkit/issues/new?template=feature_request.md">Request a Feature</a>
</p>

</div>

---

## What is OpenFlowKit?

A **browser-based diagramming studio** for engineers and designers — structured canvas, bidirectional diagram-as-code, multi-provider AI generation, and multi-format export, all running in your browser with no account required.

- 🤖 **AI generation with your own key** — 8 providers (Gemini, OpenAI, Claude, Groq, Ollama + more), keys stay in your browser
- 📐 **8 structured diagram types** — flowcharts, AWS/Azure/CNCF architecture, class, ER, mind maps, state, wireframes
- `{}` **Diagram-as-code, bidirectionally** — edit visually or in the OpenFlow DSL, always in sync
- 📤 **Export everything** — SVG, PNG, Figma, Mermaid, PlantUML, animated GIF/MP4, cinematic reveal videos
- 🔒 **Fully local-first** — no account, no telemetry, offline-capable, MIT licensed

**Built for** engineers, architects, and technical PMs who want a fast, structured diagramming tool that doesn't require a cloud account or a credit card.

---


## Why OpenFlowKit?

| Tool | The gap | How OpenFlowKit fills it |
|---|---|---|
| **Excalidraw** | Freeform only, no structured diagram types, no DSL | 8 structured families, bidirectional diagram-as-code, Figma export |
| **Draw.io / diagrams.net** | Dated UX, no AI, no code representation | Modern React 19 canvas, AI generation, OpenFlow DSL |
| **Mermaid.js** | Code-only, no visual editor | Full visual editor on top of Mermaid — edit visually or in code, bidirectionally |
| **tldraw** | Whiteboard-first, no structured diagram types | Cloud architecture (AWS/Azure/CNCF icons), class, ER, state, and more |
| **Lucidchart / Miro** | Paid, cloud-only, account required | 100% free, MIT licensed, local-first, offline-capable, no account |

---

## Features

### 🤖 Flowpilot — AI Generation

Describe a system in plain English. Flowpilot generates a fully laid-out, editable diagram. Bring your own key — keys are stored in your browser and never leave your device.

**Supported providers:**

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
- Generate a new diagram from a text prompt
- Iteratively edit the existing canvas with targeted instructions
- Scope edits to the current selection only
- Attach an image alongside your prompt for visual context
- Stream responses in real time with a cancel button
- Multi-turn conversation with persistent chat history
- Diff preview (added / updated / removed node count) before applying — confirm or discard
- **Inline key setup** — add your API key directly in the AI panel, no Settings detour

### 📥 AI Import Pipelines

Generate diagrams directly from structured source artifacts:

| Source | Output |
|---|---|
| **SQL DDL** (`CREATE TABLE` statements) | Entity-relationship diagram |
| **Terraform / Kubernetes YAML / Docker Compose** | Cloud architecture diagram |
| **OpenAPI / Swagger spec** | API sequence diagram |
| **Source code** (TS, JS, Python, Go, Java, Ruby, C#, C++, Rust) | Architecture draft |

File upload supported with automatic language detection from extension, or paste raw text.

### 📐 Diagram Types

| Diagram | Node types | Mermaid export |
|---|---|---|
| **Flowchart** | Start/end, process, decision, custom, annotation, section, swimlane | `flowchart TD` |
| **Architecture** | Cloud service tiles (AWS, Azure, CNCF icons), zones, trust domains, boundaries | `architecture-beta` |
| **Class Diagram** | UML classes with attributes, methods, stereotypes, relations | `classDiagram` |
| **ER Diagram** | Entities with typed fields (PK, FK, NN, UNIQUE) and cardinality edges | `erDiagram` |
| **Mind Map** | Hierarchical topics with curved branch styles and depth-aware layout | `mindmap` |
| **User Journey** | Scored tasks grouped into named sections with actor annotations | `journey` |
| **State Diagram** | States with composite containers and start-node markers | `stateDiagram-v2` |
| **Wireframe** | Browser shells, mobile device frames, UI component blocks | — |

### 📤 Export

**Image:** SVG · PNG (transparent, hi-res) · JPG · PDF

**Animation / Video:** Playback WebM/MP4 · Playback GIF · **Cinematic Reveal Video** · **Cinematic Reveal GIF** (nodes fade in wave-by-wave with smooth opacity transitions — white background, ready for social/docs)

**Code / Data:** JSON (native, fully reopenable) · OpenFlow DSL · Mermaid · PlantUML · **README Embed** (copy a Markdown badge snippet)

**Design Handoff:** Figma — paste directly into Figma as editable SVG with text layers

**Sharing:** Read-only viewer link (diagram encoded in URL, zero server required)

### `{}` OpenFlow DSL — Diagram as Code

Every diagram has a live text representation in the Studio Code Panel. Edits sync bidirectionally — change the canvas, the code updates; change the code, the canvas updates.

```yaml
# Example: AWS architecture as code
Auth Service [architecture] provider=aws resource=security
API Gateway  [architecture] provider=aws resource=api
Redis Cache  [architecture] provider=aws resource=database
Postgres DB  [architecture] provider=aws resource=database

Auth Service -> API Gateway
API Gateway  -> Redis Cache
API Gateway  -> Postgres DB
```

The AI reads and writes this format. Useful for version-controlled diagrams, reproducible systems documentation, and AI editing loops.

### 🎬 Playback & Presentation Mode

Build animated walkthroughs of diagrams without leaving the app.

- **Auto-order presets:** Smart (topology-first), Top-to-Bottom, Left-to-Right, Reverse
- **Scene management:** multiple named scenes, each with its own step order
- **Timeline editor:** per-step durations, drag reorder, toggle steps in/out of scenes
- **Preview mode:** renders the diagram progressively in the canvas
- **Export:** WebM/MP4 video or animated GIF

### 📦 Templates

20 built-in starter templates across 7 categories — searchable, one-click loadable:

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

### 🔀 Smart Auto-Layout

One-click ELK.js layout with four presets:

| Preset | Algorithm | Best for |
|---|---|---|
| Tree | `mrtree`, top-down | Org charts, dependency trees |
| Hierarchical | `layered`, top-down | Most flows |
| Compact | `layered`, left-right, tight spacing | Dense diagrams |
| Spacious | `layered`, left-right, loose spacing | Presentations |

### 👥 Collaboration *(beta)*

Real-time peer-to-peer collaboration via WebRTC + Yjs. Share a room link — participants see live cursors, presence indicators, and synchronized canvas state.

### 🚀 First-Run Experience

New users see a **Welcome overlay** with three paths: start from a template, import a diagram, or jump to a blank canvas. No blank-screen confusion.

### ⌨️ Canvas & Keyboard

- **Multi-tab workspace** — multiple diagrams open simultaneously
- **Undo / redo** — per-tab history
- **Snapshots** — named point-in-time save states
- **Inline label editing** — double-click or `F2`
- **Bulk properties** — edit multiple selected nodes at once
- **Style clipboard** — `Cmd+Alt+C` / `Cmd+Alt+V` copy/paste visual styles between nodes
- **Node quick-create** — `Alt+Arrow` to spawn and connect a new node in any direction
- **Node search** — `Cmd+F` to find nodes by label
- **Design systems** — full color/typography theming with white-label support

**Key shortcuts:**

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
| `Cmd+Alt+C` / `Cmd+Alt+V` | Copy / Paste style |

### 🌐 Internationalization

Available in 7 languages: **English · German · Spanish · French · Japanese · Turkish · Chinese**

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI framework | React 19 + TypeScript 5 |
| Canvas engine | React Flow / XYFlow 12 |
| Layout | ELK.js |
| State | Zustand 5 |
| Styling | Tailwind CSS 4 |
| Animation | Framer Motion |
| Build | Vite 6 |
| Unit / integration tests | Vitest 4 + Testing Library |
| E2E tests | Playwright |
| Docs site | Astro + Starlight |
| Hosting | Cloudflare Pages |

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9

### Run locally

```bash
git clone https://github.com/Vrun-design/openflowkit.git
cd openflowkit
npm install
npm run dev
# → http://localhost:5173
```

### Add an AI provider

Open the AI panel — if no key is configured, an inline setup card lets you pick a provider and paste your key without leaving the canvas. Alternatively, go to **Settings → AI** for full configuration. Keys are stored in your browser via `localStorage` and never leave your device. Session-only mode (no persistence) is also available.

---

## Commands

### App

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

The editor follows a four-layer composition model:

```
FlowEditor.tsx                        ← render shell only
  └─ useFlowEditorScreenModel.ts      ← compose store state + domain hooks + refs
       └─ buildFlowEditorScreenControllerParams.ts  ← pure mapping (no side effects)
            └─ useFlowEditorController.ts  ← adapts to shell/studio/panel/chrome props
```

Domain services own logic. Hooks compose state and side effects. Components render and delegate.

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

Contributions of all kinds are welcome — bug reports, features, docs, translations. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

**Key constraints for contributors:**

1. **Do not rename persisted storage keys** without an explicit migration path — renaming silently erases existing user browser data.
2. **Gate new features** behind a rollout flag in `src/config/rolloutFlags.ts`; remove the flag once fully promoted.
3. **Keep lint, test, and build checks green.** CI is a strict gate (zero ESLint warnings).
4. **Prefer small, reversible change-sets.**
5. **No new runtime dependencies** without opening an issue and getting agreement first.
6. **Component size:** aim for ≤ 250 lines per component file.

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

### If OpenFlowKit saves you time, a ⭐ on GitHub goes a long way.

[![Star on GitHub](https://img.shields.io/github/stars/Vrun-design/openflowkit?style=social)](https://github.com/Vrun-design/openflowkit/stargazers)

**[→ Open the App](https://app.openflowkit.com)** &nbsp;·&nbsp; **[Read the Docs](https://docs.openflowkit.com)** &nbsp;·&nbsp; **[Contribute](CONTRIBUTING.md)** &nbsp;·&nbsp; **[Report a Bug](https://github.com/Vrun-design/openflowkit/issues)**

<sub>Built with React 19 · TypeScript · Vite · ELK.js · Yjs · Cloudflare Pages</sub>

<sub>MIT Licensed · Local-first · No telemetry · No account required</sub>

</div>
