<div align="center">

<br/>

<img src="public/favicon.svg" width="72" alt="OpenFlowKit" />

<br/>
<br/>

<h1>OpenFlowKit</h1>

<h3>The open-source diagramming workspace engineers actually want to use.</h3>

<p>Create flows from templates, code, structured imports, or AI. Refine them visually, keep them local-first, and export without giving up diagram-as-code or developer workflows.</p>

<br/>

<p>
  <a href="https://github.com/Vrun-design/openflowkit/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-f97316.svg?style=flat-square" alt="MIT License" /></a>
  <a href="https://github.com/Vrun-design/openflowkit/stargazers"><img src="https://img.shields.io/github/stars/Vrun-design/openflowkit?style=flat-square&color=facc15&label=Stars" alt="GitHub Stars" /></a>
  <a href="https://github.com/Vrun-design/openflowkit/actions"><img src="https://img.shields.io/github/actions/workflow/status/Vrun-design/openflowkit/quality.yml?style=flat-square&label=CI" alt="CI" /></a>
  <img src="https://img.shields.io/badge/React-19-61dafb.svg?style=flat-square" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6.svg?style=flat-square" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Vite-6-646cff.svg?style=flat-square" alt="Vite 6" />
  <img src="https://img.shields.io/badge/PRs-Welcome-2dd4bf.svg?style=flat-square" alt="PRs Welcome" />
</p>

<br/>

<p>
  <a href="https://app.openflowkit.com"><b>→ Launch the App</b></a>
  &nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="https://docs.openflowkit.com">Documentation</a>
  &nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="https://openflowkit.com">Website</a>
  &nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="https://github.com/Vrun-design/openflowkit/issues">Issues</a>
  &nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="CONTRIBUTING.md">Contribute</a>
</p>

<br/>

<!-- IMPORTANT: Add a hero GIF before launch. Record a 15–20 second clip showing:
     1. Paste a GitHub URL → architecture diagram appears
     2. Edit a node → DSL updates live
     3. Export as animated MP4
     Recommended: 1400×900px, hosted in /assets/hero-demo.gif -->
<!-- ![OpenFlowKit in action](assets/hero-demo.gif) -->

<br/>

<table>
<tr>
<td align="center"><b>🏠 Workspace Home</b><br/><sub>Create · open · import<br/>No forced blank file</sub></td>
<td align="center"><b>🧑‍💻 Code → Diagram</b><br/><sub>GitHub · SQL · Terraform<br/>K8s · Docker Compose</sub></td>
<td align="center"><b>🤖 AI Generation</b><br/><sub>9 providers · BYOK<br/>Streaming diff preview</sub></td>
<td align="center"><b>`{}` Diagram as Code</b><br/><sub>Bidirectional live sync<br/>Git-friendly DSL</sub></td>
<td align="center"><b>🧩 Asset Libraries</b><br/><sub>Developer · AWS · Azure<br/>GCP · CNCF · Icons</sub></td>
<td align="center"><b>🎬 Cinematic Export</b><br/><sub>Animated video & GIF<br/>No upload required</sub></td>
</tr>
</table>

<br/>

<a href="https://www.producthunt.com/products/openflowkit" target="_blank">
  <img src="https://api.producthunt.com/widgets/embed-image/v1/top-post-topic-badge.svg?post_id=1081019&theme=light&period=weekly&topic_id=44" alt="OpenFlowKit on Product Hunt" width="200" height="43" />
</a>

</div>

<br/>

---

## Why OpenFlowKit?

Every diagramming tool makes a compromise. OpenFlowKit doesn't.

| Tool                    | What's missing                                                                |
| ----------------------- | ----------------------------------------------------------------------------- |
| **Excalidraw / tldraw** | Freeform whiteboards — no structured diagram types, no DSL, no code imports   |
| **Mermaid.js**          | Code-only — no visual canvas, no AI, no interactive editor                    |
| **Draw.io**             | Decade-old UX — Limited AI integration, no developer import pipelines              |
| **Lucidchart / Miro**   | Cloud lock-in — expensive, account required, your data lives on their servers |
| **PlantUML**            | Server-dependent rendering — no visual editor, no local-first model           |

OpenFlowKit is the **only MIT-licensed tool** that combines a real workspace home, a professional visual canvas, bidirectional diagram-as-code, AI generation from 9 providers, deterministic and AI-assisted imports, asset libraries for technical diagrams, and cinematic animated export — with zero server-side storage.

---

## Feature highlights

|                                 | OpenFlowKit | Excalidraw | Draw.io | Mermaid | Lucidchart |
| ------------------------------- | :---------: | :--------: | :-----: | :-----: | :--------: |
| Visual canvas editor            |     ✅      |     ✅     |   ✅    |   ❌    |     ✅     |
| Bidirectional diagram-as-code   |     ✅      |     ❌     |   ❌    |   ✅    |     ❌     |
| AI generation (9 providers)     |     ✅      |     ❌     |   ❌    |   ❌    |  Limited   |
| GitHub repo → diagram           |     ✅      |     ❌     |   ❌    |   ❌    |     ❌     |
| SQL → ERD (native parser)       |     ✅      |     ❌     |   ❌    |   ❌    |     ❌     |
| Terraform / K8s / Docker import |     ✅      |     ❌     |   ❌    |   ❌    |     ❌     |
| AWS / Azure / GCP / CNCF icons  |     ✅      |     ❌     |   ✅    | Partial |     ✅     |
| Real-time collaboration (P2P)   |     ✅      |     ✅     |   ❌    |   ❌    | ✅ (cloud) |
| Cinematic animated export       |     ✅      |     ❌     |   ❌    |   ❌    |     ❌     |
| Figma export (editable SVG)     |     ✅      |     ❌     |   ❌    |   ❌    |     ❌     |
| No account required             |     ✅      |     ✅     |   ✅    |   ✅    |     ❌     |
| Open source (MIT)               |     ✅      |     ✅     |   ✅    |   ✅    |     ❌     |

---

## Code → Diagram

Drop in your existing artifacts. Many formats are handled by **deterministic native parsers** that run entirely in your browser. AI-powered imports help when the source needs interpretation or when you want a richer first-pass architecture draft.

**Native parsers (no API key needed):**

```sql
CREATE TABLE orders (
  id       BIGINT PRIMARY KEY,
  user_id  BIGINT NOT NULL REFERENCES users(id),
  status   ENUM('pending','paid','shipped') NOT NULL
);
```

→ Typed ERD with inferred foreign-key edges and cardinalities. Rendered in milliseconds, no server involved.

```yaml
# docker-compose.yml
services:
  api:
    depends_on: [postgres, redis]
  postgres:
    image: postgres:16
  redis:
    image: redis:alpine
```

→ Service architecture with `depends_on` edges and port labels.

**AI-powered imports (API key required):**

```
github.com/vercel/next.js  →  architecture diagram
```

→ Fetches the repo, analyzes code structure and dependencies, then generates an editable architecture diagram via AI. Quality depends on the model chosen.

| Source                    | Engine                     | API key? |
| ------------------------- | -------------------------- | :------: |
| GitHub repo URL           | AI · 9 languages supported |   Yes    |
| SQL DDL                   | **Native parser**          |  **No**  |
| Terraform `.tfstate`      | **Native parser**          |  **No**  |
| Terraform HCL             | AI-assisted                |   Yes    |
| Kubernetes YAML / Helm    | **Native parser**          |  **No**  |
| Docker Compose            | **Native parser**          |  **No**  |
| OpenAPI / Swagger spec    | AI-assisted                |   Yes    |
| Source code (single file) | AI-assisted · 9 languages  |   Yes    |
| Mermaid                   | **Native parser**          |  **No**  |

---

## Home first, editor second

OpenFlowKit now treats the product as two clear surfaces:

- **Home** for creating, opening, duplicating, importing, and organizing flows
- **Editor** for actual canvas work once a real document exists

That means the app does not create a fake default flow just to get you onto the canvas. If you delete everything, your workspace can stay empty until you intentionally create the next flow.

---

## Flowpilot — AI generation with any model

Flowpilot sits directly in the editor. Describe a system, paste source code, upload a screenshot, or ask it to refine what's already on the canvas. Your API key is stored in your browser and sent directly to the provider — OpenFlowKit's servers never see it.

**9 providers. Bring your own key. Switch any time.**

| Provider            | Default model                    | Why use it                                      |
| ------------------- | -------------------------------- | ----------------------------------------------- |
| Google Gemini       | `gemini-2.5-flash-lite`          | Free tier available, fast, browser-safe         |
| OpenAI              | `gpt-5-mini`                     | Best reasoning for complex architectures        |
| Anthropic Claude    | `claude-sonnet-4-6`              | Excellent code and system understanding         |
| Groq                | `llama-4-scout-17b-16e-instruct` | Fastest inference available                     |
| Mistral             | `mistral-medium-latest`          | Strong European privacy-first alternative       |
| NVIDIA NIM          | `llama-4-scout-17b-16e-instruct` | Enterprise GPU inference                        |
| Cerebras            | `gpt-oss-120b`                   | Fastest on WSE-3 silicon                        |
| OpenRouter          | `google/gemini-2.5-flash`        | Access 100+ models through one key              |
| **Custom endpoint** | Any model                        | Ollama, LM Studio, or any OpenAI-compatible API |

No proxy. No middleman. Direct browser-to-provider requests.

---

## OpenFlow DSL — diagram as code

Every diagram has a live code panel. Edit the canvas → code updates. Edit the code → canvas updates. Two-way, always in sync.

```
flowchart TB
  client[React App]   --> gateway[API Gateway]
  gateway             --> auth[Auth Service]
  gateway             --> orders[Orders Service]
  orders              --> db[(PostgreSQL)]
  orders              --> cache[(Redis)]
  auth                --> db
```

- Mermaid-compatible syntax
- Export to Mermaid, PlantUML, or JSON
- Paste any Mermaid diagram and it renders immediately
- Version snapshots — restore any previous state

---

## Structured diagram families

Not a freeform whiteboard. Structured diagram types with opinionated defaults, correct relationship semantics, and purpose-built node styles.

- **🔷 Flowcharts** — processes, decision trees, system flows
- **☁️ Architecture** — AWS / Azure / GCP / CNCF cloud provider icons built in
- **🗄️ Entity-Relationship** — typed fields, FK edges, one-to-many / many-to-many notation
- **📐 Class diagrams** — UML with inheritance, composition, and interface relationships
- **↔️ Sequence diagrams** — async messages, actors, and lifelines
- **🧠 Mind maps** — collapsible radial trees with auto-layout
- **🛤️ User journeys** — steps, phases, and sentiment scoring
- **⚙️ State machines** — transitions, guards, entry and exit actions

---

## Editor workflow built for technical diagrams

OpenFlowKit works best when you move between the right surfaces instead of forcing everything through one panel:

- **Toolbar add menu** for quick insert actions
- **Command Center** for templates, import, assets, search, layout, pages, layers, and design systems
- **Studio** for Flowpilot, Mermaid, OpenFlow DSL, infra parsing, and linting
- **Properties panel** for exact visual and metadata edits

Large diagrams also get better organization with multi-page documents, layers, sections, and local-first document recovery.

---

## Export everywhere

Build your diagram once. Take it anywhere.

- **PNG / SVG** — transparent background, pixel-perfect at any resolution
- **PDF** — print-ready, vector-crisp
- **Mermaid** — paste directly into GitHub READMEs, Notion, Confluence, Linear
- **PlantUML** — for enterprise toolchains and legacy integrations
- **Figma** — full editable SVG import with preserved layers
- **JSON** — complete round-trip import/export, no data loss
- **🎬 Cinematic MP4** — an animated walkthrough of your diagram, node by node, edge by edge. Designed for demos, presentations, and architecture reviews. No other open-source diagramming tool does this.

---

## Real-time collaboration — local-first by default

Local-first stays the default. Your saved flows live in the browser, your AI keys stay on your device, and export is explicit. When you do want to work together, OpenFlowKit supports P2P collaboration over WebRTC with live presence and shared editing, without making a hosted backend mandatory for solo work.

---

## Canvas built for keyboard-first developers

| Shortcut         | Action                                               |
| ---------------- | ---------------------------------------------------- |
| `⌘ K` / `Ctrl K` | Command bar — search, import, layout, assets, and actions |
| `⌘ \` / `Ctrl \` | Toggle the live code panel                           |
| `⌘ Z` / `Ctrl Z` | Full undo with complete history                      |
| `⌘ D` / `Ctrl D` | Duplicate selection                                  |
| `⌘ G` / `Ctrl G` | Group selected nodes                                 |
| `⌘ /` / `Ctrl /` | Keyboard shortcuts reference                         |

Plus: smart alignment guides, snap-to-grid, multi-select, pages, layers, sections, architecture lint, light/dark/system theme, and full i18n in 7 languages.

---

## What we are improving next

Current roadmap focus:

- better layers and page workflows for larger technical diagrams
- stronger code and structured-import diagram quality
- smarter auto-layout defaults with less cleanup after import
- performance boosts for bigger canvases and heavier sessions
- continued docs and onboarding cleanup so the product surfaces stay easier to understand

---

## Get started in 30 seconds

```bash
git clone https://github.com/Vrun-design/openflowkit.git
cd openflowkit
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Done.

> **Zero environment variables required.** AI provider keys are configured in the in-app settings panel at runtime — nothing goes in `.env`.

---

## Self-host

OpenFlowKit is a pure static SPA. There is no backend. Deploy the `dist/` folder anywhere that serves HTML.

**Cloudflare Pages / Netlify / Vercel:**

```bash
npm run build
# upload dist/ to your provider
```

**Docker:**

```bash
docker build -t openflowkit .
docker run -p 8080:80 openflowkit
```

No database. No secrets. No infrastructure. One folder.

---

## Tech stack

| Layer         | Technology                          |
| ------------- | ----------------------------------- |
| Framework     | React 19 + TypeScript 5             |
| Build         | Vite 6                              |
| Canvas        | React Flow (XYFlow)                 |
| Auto-layout   | ELK.js                              |
| State         | Zustand                             |
| Storage       | IndexedDB — local-first, no backend |
| Styling       | Tailwind CSS                        |
| Collaboration | WebRTC (P2P, no relay server)       |
| i18n          | react-i18next — 7 languages         |
| Testing       | Vitest + Playwright                 |

---

## Contributing

All contributions are welcome — bug fixes, new diagram types, parser improvements, translations, and documentation.

Start here:

```bash
npm run dev        # development server at localhost:5173
npm run test       # unit tests via Vitest
npm run test:e2e   # end-to-end tests via Playwright
npm run lint       # ESLint + TypeScript type-check
```

**Good first issues** are tagged [`good first issue`](https://github.com/Vrun-design/openflowkit/labels/good%20first%20issue). Before opening a PR, please read [CONTRIBUTING.md](CONTRIBUTING.md).

---

<div align="center">

<br/>

**OpenFlowKit** is [MIT licensed](LICENSE), locally hosted, and built in the open.<br/>
No cloud required. No account required. No lock-in.

<br/>

|                                                                                            |                                                                                                      |                                        |                                                                      |
| :----------------------------------------------------------------------------------------: | :--------------------------------------------------------------------------------------------------: | :------------------------------------: | :------------------------------------------------------------------: |
|                      [**→ Launch App**](https://app.openflowkit.com)                       |                               [**Docs**](https://docs.openflowkit.com)                               | [**Website**](https://openflowkit.com) | [**Changelog**](https://github.com/Vrun-design/openflowkit/releases) |
| [Bug Report](https://github.com/Vrun-design/openflowkit/issues/new?template=bug_report.md) | [Feature Request](https://github.com/Vrun-design/openflowkit/issues/new?template=feature_request.md) | [Contributing Guide](CONTRIBUTING.md)  |                    [Security Policy](SECURITY.md)                    |

<br/>

---

<br/>

**[If OpenFlowKit saves you time, the most impactful thing you can do is give it a star.](https://github.com/Vrun-design/openflowkit/stargazers)**<br/>
**[It helps other developers find the project.](https://github.com/Vrun-design/openflowkit/stargazers)**

<br/>

[![Star OpenFlowKit on GitHub](https://img.shields.io/github/stars/Vrun-design/openflowkit?style=for-the-badge&logo=github&color=facc15&label=Star%20on%20GitHub)](https://github.com/Vrun-design/openflowkit/stargazers)

<br/>

[![Star History Chart](https://api.star-history.com/svg?repos=Vrun-design/openflowkit&type=Date)](https://star-history.com/#Vrun-design/openflowkit&Date)

<br/>

<sub>
React 19 &nbsp;·&nbsp; TypeScript 5 &nbsp;·&nbsp; Vite 6 &nbsp;·&nbsp; XYFlow &nbsp;·&nbsp; ELK.js &nbsp;·&nbsp; Zustand &nbsp;·&nbsp; Yjs &nbsp;·&nbsp; Framer Motion &nbsp;·&nbsp; Tailwind CSS &nbsp;·&nbsp; Cloudflare Pages
</sub>

<br/>

<sub>
MIT Licensed &nbsp;·&nbsp; Local-first &nbsp;·&nbsp; No telemetry &nbsp;·&nbsp; No account &nbsp;·&nbsp; No server-side storage &nbsp;·&nbsp; No lock-in
</sub>

<br/>

</div>
