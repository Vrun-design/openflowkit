# Phase 5 — Architecture model (month 2)

Goal: the best C4 / living-architecture tool. Beat IcePanel on its own features,
free and local; beat LikeC4/Structurizr on feel and visual editing; match Archyl on
AI (code discovery, drift) without their cloud. Capture Structurizr Cloud refugees
(service EOL 30 Sep 2026) and the r/selfhosted "open source IcePanel" demand.

## Research (verified 2026-09-21, sources at bottom)

**IcePanel** ($40–80/editor/mo, cloud only, no diagrams-as-code). Model-based: an
object is created once and reused in every diagram; edits propagate. Levels: context
→ app → component; "zoom into" an object lands on a child diagram (custom landing
per source diagram). Lower-level connections auto-appear as "implied" connections
one level up. Flows: 8 step types (intro, message, process, alternate, parallel,
go-to-flow, info, conclusion), play/next/back, export as text/PlantUML/Mermaid.
Tags (perspective filters), drafts (future-state), ADRs, domains, API + webhooks,
MCP server (read + write objects/connections/ADRs), export JSON/CSV/PNG/PDF/HTML/
LLMs.txt. Free tier walls: 100 objects, 1 flow per diagram, 2 tag groups, 3 ADRs,
1 draft. Admitted gaps: no code import, no drift detection, no self-host.

**LikeC4** (MIT, 5.7k★). DSL → model → many views. Nested levels unlimited, dynamic
views (flows), deployment views, styles, VS Code + live preview, MCP, React embed.
Pain: Graphviz WASM crashes/hangs, manual layout is a `.snap` sidecar that fights
model changes, no real visual editing, layout knobs missing (#1053, #343, #2288).

**Structurizr**: DSL is the de-facto standard; cloud EOL 30 Sep 2026; self-host
server £300–900/mo. Users are migrating now. Import their DSL = free acquisition.

**Archyl** (new, proprietary): AI discovery from repo, drift score, 181 MCP tools,
YAML DSL, ADRs, change requests, GitHub Action. Free tier 100 objects; self-host
paid only. This is the AI bar to match. Their gap: no visual feel, no local-first.

**The one pain everybody names (HN, Reddit)**: diagrams go stale. Nobody trusts a
six-month-old diagram. Text-in-git + agent that reads the repo is the accepted
answer; nobody has shipped it with a canvas that feels good.

## What we add (all on the phase 2 hub; no new kernel concepts outside `model`)

### 5.1 Model layer — one object, many views
- `src/dsl/model/`: `ArchModel = { elements, relations, views }`. Element =
  `{ id, kind: system|container|component|person|external|store|queue, name,
  tech?, desc?, parent?, tags[], links[] }`. Relation = `{ from, to, label?, tech?,
  tags[] }`. View = a diagram page whose nodes carry `metadata.model.elementId`.
- Editing a node label/tech on any page updates the element; every page re-renders.
  Deleting from a page = unplace; deleting from model = remove everywhere (confirm).
- Implied relations: `A.child -> B.child` shows as `A -> B` on the parent view.
- Check: property test — place/unplace/rename on N views keeps model consistent;
  implied-relation derivation unit tests.

### 5.2 `architecture` family v2 (C4 grammar)
- Grammar reserved in 2.1: `system X { container Y { component Z } }`, `person P`,
  `X -> Y : label [tech]`, `view context of X`, `view container of X`, `tags`.
- Structurizr DSL importer (`workspace { model {} views {} }`) → our DSL, loss
  report. LikeC4 importer second if cheap (same shapes).
- Check: 10 real-world Structurizr workspaces from GitHub round-trip w/o errors.

### 5.3 Drill-down navigation
- Double-click / `⏎` on an element with children → camera zooms into element bounds,
  then swaps to the child view (one animated step, Pixi). `⌫`/`Esc` = up. Breadcrumb
  in the top bar. Custom landing view per source page (IcePanel parity).
- Check: headed Playwright: context → container → component → back, no dropped frames.

### 5.4 Flows — unlimited, free
- DSL block: `flow "Checkout" { step A -> B : "POST /cart"; alt { ... } par { ... };
  goto "Payment"; note "..." }`. Same 8 step kinds as IcePanel.
- Playback: stepper UI + keyboard (`←/→`, space). Camera glides to the active
  relation; inactive dims. Export flow → sequence diagram (family from phase 3) and
  Mermaid/PlantUML text.
- Sequence diagram import → flow (IcePanel can't).
- Check: unit tests for step parse/serialize; headed check for playback at 60 fps.

### 5.5 Tags, perspectives, drafts, ADRs — minimal
- Tags on elements/relations; a tag filter dims/hides; saved filter = "perspective".
- Draft = a git-style branch of the model file (copy + diff view + merge as one
  undo). No cloud. ADR = markdown file linked from an element (`links[]`), rendered
  in the side panel. No ADR editor beyond a textarea.
- Check: diff of two model files renders added/removed/changed elements.

### 5.6 AI-native: discover + drift (BYOK, local)
- `discover(repoPath)` MCP tool: agent walks the repo (services, Dockerfiles,
  k8s/compose, package manifests, HTTP clients) and proposes a model as DSL. Reuse
  phase 4 proposal flow: ghost frame → accept = one undo.
- `drift(model, repoPath)`: agent re-runs discovery, diffs vs model, returns
  `{ missing, undrawn, changed }` with evidence lines. Rendered as a badge per
  element ("no evidence in repo") + a report. Optional `npx openflowkit drift` for
  CI (exit 1 on drift), no server.
- `explain(elementId)`: agent answers from model + linked code/ADRs.
- Check: eval on 3 OSS repos (e.g. OpenTelemetry demo); precision of discovered
  containers ≥ 80 % by owner review.

### 5.7 Git-native workspace
- A workspace = a folder: `architecture.ofk` (DSL), `views/*.snap` (manual layout
  overrides, like LikeC4 but ours never fights the model: unplaced nodes get ELK
  positions, placed ones keep theirs), `adr/*.md`. Open folder via File System
  Access API; save on every commit-worthy change; `.gitignore`-friendly.
- Export static HTML site (`npx openflowkit build`) with drill-down + flows for
  wiki/GitHub Pages. This replaces Structurizr Cloud for refugees.
- Check: open → edit → reload → identical; built site renders 3 levels + 1 flow.

## Ordering and cuts
5.1 → 5.2 → 5.3 → 5.4 (this is the IcePanel-killer; ship and post to r/selfhosted,
r/softwarearchitecture, HN "Show HN: open source local-first IcePanel alternative
with Structurizr import"). Then 5.7 → 5.6 → 5.5. Cut 5.5 first if time is short.
Do not build: real-time multiplayer, accounts, hosted anything, DORA metrics,
change-request workflows.

## Done when
Owner imports a real Structurizr workspace, drills three levels, plays a flow, runs
`discover` on this repo and gets a usable model, sees drift after deleting a service
folder — all offline, all round-tripping through DSL.

## Sources
- icepanel.io/pricing, docs.icepanel.io (diagramming, flows, tags, mcp-server)
- archyl.com/blog/structurizr-cloud-shutdown-what-to-do, /blog/best-c4-model-tools-2026,
  /compare/archyl-vs-icepanel
- github.com/likec4/likec4 (+ discussions #343, #1142, #2288, issues #660, #1053)
- news.ycombinator.com/item?id=37222855, 37974021, 37224731
- reddit r/selfhosted 1bcedto, r/softwarearchitecture 1bjrvs6, 1ks1sg8 (via search)
