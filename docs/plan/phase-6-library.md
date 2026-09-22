# Phase 6 — the creation library (shapes, connectors, ink, media, frames, wireframe, charts)

Owner decision, 2026-09-22: close the direct-manipulation gap with Koboyo. Their rail:
select · hand · rectangle · ellipse · **shapes (42)** · **connectors (4)** · text · **pen** ·
**image** · **emoji** · **charts (9)** · **insert (frames / tools / wireframe ≈ 50)** · lock.
Ours today: select · hand · rectangle · ellipse · connector · text · icons. Everything
below is required. Every slice is one agent, ≤1 day, commits on `v2`, green before
commit, one headed Playwright check per UX slice, `STATE.md` updated when done.

Read first, in this order: `AGENTS.md`, `docs/plan/README.md` §4–§6, `STATE.md`,
`docs/plan/grammar.md` §5, `src/opencanvas/presentation/design-system/AGENTS.md`.
Then read the code a slice touches **end to end** (callers and consumers) before editing.

## 0. Non-negotiables (apply to every slice)

**Fit the kernel, never fork it.**
- A node is a `SceneNode` (`domain/document/types.ts`): `kind` + `content` + `appearance`.
  New visuals are new `content.shape` / `content.widget` / `content.chart` values on
  existing or new kinds, resolved by a pure `resolve*Presentation` in `domain/nodes/`
  (see `domain/nodes/README.md`), drawn by one Pixi renderer in `infrastructure/pixi/`,
  exported by `infrastructure/export/canonicalSvg.ts`. All three, every time.
- Outline geometry lives once: `domain/nodes/basicNodeOutline.ts`. Pixi, SVG export,
  hit-testing and connector binding all read that outline. A shape with a Pixi drawing
  and no outline is a bug (connectors attach to a rectangle around it).
- Every user intent is one command with an inverse (`domain/commands/`). One undo step.
  No presentation code mutates a document; hooks call application/domain functions.
- Domain and `src/dsl` stay pure TypeScript. No React/Pixi/DOM/Zustand imports. The
  architecture test (`presentation/design-system/architecture.test.ts`) must stay green.
- Heavy work off the main thread. ELK and parsing already run in a worker; chart
  layout must be O(n) and synchronous or go to the same worker.
- Text hub: anything that can be expressed as text (shape words, wireframe, chart data)
  gets a DSL projection with the round-trip laws of `grammar.md` §6.6
  (`parse(serialize(d)) == normalize(d)`, `serialize(parse(text)) == text`). Canvas drags
  never rewrite code.
- Agent parity: whatever a human can create from the rail, an agent can create through
  `src/agent/manifest.ts` + `mcp-server/src/tools/` (`add_shape`, `create_diagram`,
  `get_syntax`, `list_diagram_node_types`). Update the manifest and `get_syntax` in the
  same slice that adds the capability.

**Code quality — the bar is "the best engineer you know would merge it unchanged".**
- Shortest thing that works. Grep before writing; reuse `design-system` primitives
  (`Toolbar`, `IconButton`, `Popover`, `Tooltip`, `Field`, `Menu`, `Panel`), existing
  node kinds (`pen`, `highlighter`, `line`, `arrow`, `image`, `sticky`, `callout`,
  `frame`, `browser`, `mobile`), existing tables (`nodePalette.ts`, `SHAPE_WORDS`).
- **No new dependency.** Charts are Pixi `Graphics`; ink smoothing is a 20-line
  Catmull-Rom; emoji is Unicode text. If you believe a dep is unavoidable, stop and
  write the one-line why in `STATE.md` under Deferred; do not add it.
- No abstraction with one user, no config for a value that never changes, no
  "for later" scaffolding, no flags, no shims. Delete dead code you pass.
- Mark every deliberate ceiling: `// ponytail: <ceiling> — <upgrade path>`.
- Before commit, run a simplifier pass over your own diff: reduce nesting, name things
  by what they are, extract only what has two callers, remove every comment that
  restates code. Comments say why, names say what. Match the surrounding file.
- Tests: every domain/dsl function gets a unit test beside it (`x.test.ts`). Pixi
  visuals get a `*NodeVisual.test.ts` projection test (see `basicNodeVisual.test.ts`).
  SVG export gets a golden (`canonicalSvg.golden.test.ts`). UX gets one headed
  Playwright spec in `e2e/` (`npm run e2e:headed -- e2e/<file>`; headless has no WebGL).
- Merge when green: `npm run typecheck && npm run lint && npm run test -- --run`.

**Design, UX, accessibility — FigJam/tldraw tier, nothing less.**
- Icons: `@tabler/icons-react` only, through `<Icon icon={…} />`. Pick the icon that
  reads at 16 px; if two candidates exist, the outline variant wins. Never draw an icon
  by hand when Tabler has one; never use an emoji as a UI icon.
- Every rail item: `Tooltip` with label + shortcut; `aria-label`; `aria-pressed` for
  the active tool; flyouts are `Popover role="dialog"` (or `Menu`) with `aria-haspopup`,
  `aria-expanded`, roving-tabindex grid, arrow-key navigation, Esc closes and returns
  focus to the opener, Enter/Space picks. A grid item is `aria-label`ed by its name.
- Keyboard for every action, including on-canvas ones (create at viewport centre with
  Enter, resize with Shift+arrows, cycle connector type). Add each new shortcut to
  `v2Shortcuts.ts` (the test fails if you don't).
- The semantic scene tree (`OpenCanvasSemanticSceneTree.tsx`) names every new node
  kind readably ("Bar chart, 5 rows, 1 series", "Wireframe button 'Sign in'").
- Reduced motion respected via `design-system/motion.ts`; focus ring visible on
  everything; contrast ≥ 4.5:1 for text in both themes using semantic roles, never
  palette literals; RTL-safe layout for panels.
- Hover a shape → `+` handles still work on every new shape (connectors bind to its
  outline). Double-click still edits its label. Style bar (`V2ContextBar`) still
  applies fill/stroke/palette to it.
- Feel: no dropped pointer events, no visible frame drops when drawing ink or dragging
  a chart. Check with `node scripts/check-v2-polish.mjs` before and after.

## 1. Slices

Claim in `STATE.md`; keep the order (later slices reuse earlier ones).

### 6.1 Rail v2 — flyouts, shortcuts, lock

Behaviour
- `V2CreationToolbar` grows to: select V, hand H, rectangle R, ellipse O, **shapes S**
  (flyout), connector A (flyout), text T, **pen P**, **image ⇧I** (icons stays I),
  **emoji E**, **charts C**, **insert ⇧S** (frames / tools / wireframe flyout), lock
  (existing ⌘L). Plain letters are free today (`v2Shortcuts.ts`); check before adding.
  Two thin separators as in Koboyo. Vertical, top-start.
- A flyout button shows the small corner triangle (`.ofk-v2-tools [data-flyout]`),
  opens on click or ArrowRight, closes on pick/Esc/outside click. The button's icon
  becomes the last picked item's icon (Koboyo behaviour) and a plain click re-selects
  that item; long-press or ArrowRight reopens the flyout.
- Lock toggles lock on the selection through the existing undoable lock command; disabled
  with tooltip "Select something to lock" when nothing is selected.
- `?` panel lists every new shortcut.

Check: `e2e/rail.spec.ts` — open each flyout by mouse and by keyboard, pick, Esc returns
focus, `aria-expanded` toggles, lock/unlock undoes.

### 6.2 Shape library — 42 shapes

Behaviour
- `BasicNodeShape` grows from 15 to the Koboyo set: diamond, triangle, ellipse,
  parallelogram, trapezoid, cylinder, venn (two circles), document, speech-bubble,
  hexagon, star, check-circle, cross-circle, heart, cloud, arrow-up/down/left/right,
  plus, comment, lightning, bookmark, filled-bar, prism, pentagon-tag, chevron, octagon,
  cube, target, note, half-round, pill, callout-stack, layer-stack, folder, panel,
  brace, numbered-circle, list-card, pin, bracket. Reuse the 15 that exist; do not
  rename them.
- Each shape: outline points in `basicNodeOutline.ts` (deterministic, resize-safe,
  min 12 points for curves), label bounds in `nodeLabelBounds.ts` (text stays inside
  the shape, e.g. diamond gets the inner rect), Pixi drawing through the shared outline
  (`basicNodeVisual.ts`), SVG export via the same outline (already generic), a DSL
  shape word in `src/dsl/vocabulary.ts` with min/max/wrap sizing, an alias where Mermaid
  has one (`@{shape: …}` names in `grammar.md` §0.4), and an entry in the shapes flyout
  with the matching Tabler icon.
- Flyout: 4-column grid, tooltip per cell, arrow-key navigation, type-to-filter is not
  needed. Picking arms the tool; click-drag draws, plain click drops at default size
  (`shapeNode.ts` — extend `ShapeKind`, one factory for toolbar and agent).
- Numbered-circle auto-increments its label per page (1, 2, 3…).

Check: unit tests for every outline (bounds match `size`, point count, symmetry);
golden SVG for 6 representative shapes; `e2e/shapes.spec.ts` draws three shapes,
connects them, changes fill from the style bar, undoes.

### 6.3 Connector variants

Behaviour
- Connector flyout: **arrow** (orthogonal, arrow head — today's default), **line**
  (no heads, `direct`), **curve** (`bezier`), **path** (`polyline`, click-click-click
  waypoints, double-click/Enter ends, Esc cancels last point). All four bind to sides
  or free points exactly like the existing tool (`v2ConnectorOperations.ts`).
- Head/tail markers (none / arrow / circle / cross / diamond) and dash live in
  `V2ConnectorStyle` if not already; the DSL `head:`/`tail:` words map 1:1.
- Style bar exposes route kind for any selected connector; changing it is one undo.

Check: `e2e/connector-variants.spec.ts` draws each kind bound to a shape, drags the
shape, asserts the route updates live and never leaves a stale segment.

### 6.4 Ink — pen, highlighter, eraser, lasso

Behaviour
- Pen P draws `pen` nodes; Shift+P highlighter; both kinds already exist
  (`freeformNodePresentation.ts`, `PixiFreeformNodeRenderer.ts`). Points captured at
  pointer rate with `getCoalescedEvents`, simplified with Ramer–Douglas–Peucker
  (ε = 0.75 px screen) and smoothed with Catmull-Rom on render. One node per stroke,
  one undo per stroke. Stroke colour/width from the style bar ink presets.
- Eraser (in Insert › Tools, shortcut `X`) removes whole strokes it crosses; drag
  erases many strokes → one undo.
- Lasso (Insert › Tools, `Q`) selects nodes whose outline intersects the lasso polygon.
- Live preview while drawing goes through `PixiFreeformPreview.ts`; the document is
  written once on pointer-up.

Check: `e2e/ink.spec.ts` in headed Chromium with `scripts/check-v2-polish.mjs`
instrumentation: 2 s stroke, ≥ 95 % of pointer events captured, p95 frame < 16 ms.

### 6.5 Image and emoji

Behaviour
- Image tool: click → file picker (png/jpg/svg/webp/gif ≤ 10 MB); paste from
  clipboard; drag-drop onto the canvas; URL paste creates an image node. Bytes go to
  the IndexedDB `assets` store (`services/storage/indexedDbSchema.ts`), node content
  keeps `assetId`; the renderer resolves it through `PixiMediaLayer`. Placed at drop
  point, scaled to fit 480 px on the long side, aspect locked on resize by default
  (Shift frees it).
- Export: PNG/SVG embed the image; JSON export inlines base64 (`// ponytail:` ceiling
  on document size, upgrade path = sidecar files in folder workspace).
- Emoji `E`: popover with a search field and a grid of Unicode emoji grouped like the
  OS picker (smileys, people, nature, food, activity, travel, objects, symbols, flags —
  the list is a static const, no dep). Pick inserts a `text` node with the glyph at
  48 px; the style bar's size control scales it. Recently used (last 24) at the top,
  in `useV2Preferences`.

Check: `e2e/image-emoji.spec.ts` — drop a fixture PNG, resize keeps aspect, reload
keeps the image; emoji search "rocket", Enter inserts 🚀, undo removes.

### 6.6 Insert › Frames and Tools

Behaviour
- Frames: default frame, **phone**, **tablet**, **browser**, **window**, **row split**,
  **column split**, **dashed frame**. Phone/tablet/browser reuse `mobile` and `browser`
  wireframe kinds with variants (`wireframeNodePresentation.ts`); the rest are
  `frame` container presets (`content.preset`). Frames clip children on export, act as
  drop targets (parentId), and show their name as a label above (like Figma).
- Tools: lasso, laser pointer (presentation-only red dot trail that fades, no document
  write, `// ponytail:` no multiplayer), eraser, marker (= highlighter), sticky note
  (`sticky` kind exists; pick colour from the palette; auto-grows with text).

Check: `e2e/frames.spec.ts` — insert phone frame, drop a rectangle inside, move frame
moves child, export PNG of frame only.

### 6.7 Wireframe widget library + `wireframe` DSL family

Behaviour
- One node kind `widget`, `content.widget` ∈ the Koboyo set: button, text-input,
  search, checkbox, radio, toggle, select, slider, card, tabs, image-placeholder,
  avatar, heading, paragraph, sort, link, textarea, numbered-list, tag, progress,
  breadcrumb, pagination, star-rating, card-stack, list, alert, modal, hamburger, chat,
  table, calendar, sidebar, scrollbar, split, panel, bar-chart-placeholder, add-button.
  Pure resolver `widgetNodePresentation.ts`; one Pixi renderer extending
  `wireframeNodeDrawing.ts`; SVG export; semantic tree names.
- Each widget has a sensible default size, a label that double-click edits, and a
  state where it makes sense (`checked`, `on`, `value` 0–100, `active tab`), toggled
  from the style bar with a `Field` control. No per-widget React components.
- `wireframe` family lands in `src/dsl/families/wireframe.ts` and leaves
  `RESERVED_FAMILIES`. Grammar (add §8.x to `grammar.md`):
  ```
  wireframe phone
    Sign in [heading]
    Email [input]
    Password [input, secret]
    Remember me [checkbox, checked]
    Continue [button, primary]
  ```
  Indentation nests into frames/cards; widgets stack top-to-bottom with 12 px gaps;
  `row` groups children horizontally. Round-trip laws hold; `Edit as code` works.
- `get_syntax` and `list_diagram_node_types` know the family; `add_shape` accepts widgets.

Check: unit tests per resolver + parser + serializer round trip; `e2e/wireframe.spec.ts`
generates the example above, toggles the checkbox from the style bar, regenerates as one
undo.

### 6.8 Charts — bar, line, area, scatter, pie, donut, radar, table, heatmap

Behaviour
- One node kind `chart`, `content = { chart, categories: string[], series: { name,
  values: number[] }[], options }`. Pure `chartNodePresentation.ts` turns content into
  a renderer-neutral scene: axes with nice ticks (d3-style `niceTicks` written by hand,
  ≤ 30 lines, tested), scaled marks, legend rows, percent labels for pie/donut, a
  cell grid for heatmap and table. Pixi renderer draws only what the presentation says;
  SVG export draws the same. Colours come from `nodePalette.ts` series order
  (blue, red, emerald, amber, violet, …) so light/dark and palettes just work.
- Placed at 720 × 440 default; resize reflows; label font follows the document.
- **Chart data panel** (`V2ChartDataPanel.tsx`, opens on select or double-click,
  `Panel` primitive, right side): header row = series names (editable), first column =
  category labels, cells = numbers, `+ Row`, `+ Series`, `×` per row/series (disabled
  at 1). Tab/arrow keys move between cells, Enter commits and moves down, paste of
  TSV/CSV fills the grid, one undo per commit. Invalid number → red field, value kept
  as-is until fixed. Screen reader: it is a real `<table>` with headers.
- Chart flyout `C`: table, bar, line, area, scatter, pie, donut, radar, heatmap, plus
  quadrant (6.9). Tabler icons: `IconTable`, `IconChartBar`, `IconChartLine`,
  `IconChartArea`, `IconChartDots`, `IconChartPie`, `IconChartDonut`, `IconChartRadar`,
  `IconGridDots`.
- Changing chart type from the style bar keeps the data; one undo.

Check: unit tests for ticks, scales, pie angles summing to 2π, empty/one-row/negative
data; golden SVG for bar + pie; `e2e/charts.spec.ts` inserts bar chart, edits a cell,
adds a series, switches to donut, undoes three times back to the original.

### 6.9 Quadrant + `chart` DSL family + agent surface

Behaviour
- `chart: 'quadrant'`: `content = { xLabels: [low, high], yLabels: [low, high],
  quadrants: [tl, tr, bl, br], points: { label, x, y }[] }` with x, y in 0–1. Pastel
  quadrant fills from the palette; points are draggable on canvas (drag writes x/y,
  one undo). Panel "Quadrant points" = label / x / y grid, `+ Point`.
- `chart` family leaves `RESERVED_FAMILIES`:
  ```
  chart bar
    title: Monthly revenue
    Revenue: Jan 12, Feb 19, Mar 9, Apr 22, May 17
    Costs:   Jan 8,  Feb 9,  Mar 7,  Apr 11, May 12

  chart quadrant
    x: Low Effort, High Effort
    y: Low Impact, High Impact
    quadrants: Quick wins, Big bets, Deprioritise, Time sinks
    Feature A [0.32, 0.78]
  ```
  Round-trip laws; canvas edits in the data panel serialize back via `Edit as code`
  (charts are data, so unlike drags the panel *does* write source — state this in
  `grammar.md` §6.7).
- Agent: `create_diagram` / `update_diagram` accept the chart family; `get_syntax`
  documents it; `add_shape` accepts `chart` with data. BYOK prompt (`dslPrompt.ts`)
  gets one chart example.

Check: parser/serializer/round-trip tests incl. fuzz corpus entry; MCP test that
creates a bar chart on the live canvas; `e2e/quadrant.spec.ts` drags a point and
checks the panel value updates.

### 6.10 Polish and audit

- Run the hostile-reviewer pass over phases 6.1–6.9 as one diff: keyboard-only
  walkthrough of every flyout and panel; VoiceOver pass on the rail, data panel and
  scene tree; both themes and all four palettes on a page holding one of every new
  node; export PNG/SVG/PDF of that page and diff against the canvas.
- `ponytail-audit` style sweep: delete what has one caller, collapse duplicated
  drawing code, ensure no renderer switch grew past one case per kind.
- Update `docs/plan/grammar.md` (§5.1 shape words, §8 wireframe + chart), the docs-site
  DSL reference, `llms.txt`, and `STATE.md` (≤ 40 lines).

## 2. Definition of done for the phase

- A user can reproduce every reference screenshot (bar chart + data panel, quadrant +
  points panel, pie chart, chart flyout, insert panel, rail, connector flyout, shape
  flyout) on `/` without touching code.
- An agent can produce the same page through MCP in one `create_diagram` call.
- `npm run typecheck && npm run lint && npm run test -- --run` green; all headed
  specs green; `check-v2-polish.mjs` numbers not worse than at the phase start.
- Zero new dependencies. `STATE.md` says what shipped, what was deferred, and why.
