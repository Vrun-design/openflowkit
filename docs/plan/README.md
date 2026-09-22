# OpenFlowKit — the plan

Owner decision, 2026-09-21: build the best diagramming canvas for builders. Ship in
one month what Koboyo shipped in three. Old editor (V1, React Flow) is deleted, old
gates/rollback/flag process is gone. Only two things matter: **product quality** and
**code quality that scales**.

This folder is the entire plan. Read this file, then the phase file you are
building. `STATE.md` at the repo root says what is done and what is next.

| File | What |
|---|---|
| [README.md](README.md) | This: goal, research, target, architecture, process, rules |
| [phase-0-demolition.md](phase-0-demolition.md) | Delete V1, boot to the new canvas (2 days) |
| [phase-1-hands.md](phase-1-hands.md) | Canvas feel + connectors (week 1) |
| [phase-2-brain.md](phase-2-brain.md) | Diagram-as-code hub: DSL → compile → canvas (week 2, parallel with 1) |
| [phase-3-families.md](phase-3-families.md) | Diagram families + Mermaid transpiler (week 3) |
| [phase-4-agent-ship.md](phase-4-agent-ship.md) | MCP live, BYOK AI, export, pages, polish (week 4) |
| [phase-5-architecture.md](phase-5-architecture.md) | C4 model layer, flows, drill-down, discover/drift, git workspace (month 2) |
| [phase-6-library.md](phase-6-library.md) | Creation library: 42 shapes, connector kinds, ink, image/emoji, frames, wireframe, charts (month 2) |
| [phase-7-motion.md](phase-7-motion.md) | Motion export: timeline → animated SVG / GIF / MP4, `animate` DSL block, agent parity (month 3) |
| [phase-8-keyframes.md](phase-8-keyframes.md) | Keyframe tracks, timeline panel, camera, Present mode, `animate_diagram` MCP (after 7 has users) |

## 1. Goal

A free, local-first, agent-native infinite canvas for technical diagrams that
**feels** like tldraw/FigJam, **thinks** like Koboyo (text → diagram, one pipeline),
and is driven by agents (MCP/BYOK) better than any of them.

"Better than Koboyo" means, in order: (1) direct manipulation and connectors feel
instant and never fight you; (2) any diagram can be written as text and comes back
as text; (3) an agent can do everything a human can, on the live canvas.

## 2. Research (verified 2026-09-21, see chat history / bundle inspection)

Koboyo (koboyo.com): not open source (GitHub repo is README-only, no license).
Stack from their JS bundles: React + React Router 7, custom DOM/SVG-style canvas
(no tldraw/excalidraw/pixi/WebGL), rough-style ink, ELK layout in a web worker,
hand-tuned Safari pinch handling. Diagram-code compiler ≈ 28 KB parse + 83 KB layout
minified. 14 diagram families, Mermaid/eraser import via transpile-to-their-DSL, MCP
(`create_diagram`, `update_diagram`, `get_diagram`, icon search, `get_syntax`).

Their one architectural bet, which we adopt: **the text language is the hub.**
Code panel, AI, Mermaid import and MCP all produce DSL; one compiler turns DSL into
canvas objects; a deterministic serializer turns canvas objects back into DSL.
Round-trip contract: `parse(serialize(d)) == normalize(d)` and
`serialize(parse(text)) == text`. Canvas drags do not rewrite code; Generate makes
code authoritative again and replaces the frame as one undo step.

Renderers of the field: Excalidraw = Canvas2D; tldraw = DOM/SVG; Koboyo = DOM/SVG;
FigJam = WebGL; Miro = Canvas2D+WebGL. We are Pixi/WebGL — the FigJam tier. Feel is
not a renderer property; it is input handling, connector behaviour and zero-latency
actions. We keep Pixi.

## 3. Target experience (the product spec — all of it)

Everything below is required. Details and acceptance live in the phase files.

**Canvas feel**
- Zoom to cursor; wheel/pinch normalised across Chrome/Safari/Firefox and trackpad
  vs mouse; no dropped trackpad events; 60 fps at 2k objects. Measured, not felt.
- Select, box-select, move, resize, rotate, snap + alignment guides, duplicate,
  group/frame, z-order, lock. Undo = one step per user intent.
- Hover a shape → four side `+` handles. Drag from a handle → connector. Release on
  empty canvas → new shape of the same kind, connected, text editing open.
- Double-click empty → text. Double-click shape → edit label. Shortcuts as tldraw.

**Connectors**
- Bind to a node side/port or a free point. Orthogonal routing around obstacles,
  recomputed live while dragging either end or any bound node. Manual waypoints
  survive. Labels, arrow markers, dashed/solid, parallel and reverse edges, loops.
- Never attach to the wrong side; never leave a stale route on screen.

**Diagram as code (hub)**
- Code panel (`⌥D`), `⌘↵` generate. Text lands as a frame; regenerate replaces the
  frame as one undo. Right-click frame → "Edit as code" reopens its source.
- Forgiving line-oriented grammar with positional attributes
  (`Cache [cylinder, red]`), names double as ids, edges auto-declare nodes,
  per-line warnings, bad lines dropped not fatal. Grammar is versioned and written.
- Families: flowchart, architecture (icons), gitgraph, sequence, state, ERD, class,
  mindmap in the month; then bpmn, org, gantt, wireframe, charts, sankey, journey.
- Mermaid paste → detected → converted to our DSL with a loss report.

**Agents**
- MCP: `create_diagram`, `update_diagram`, `get_diagram`, `get_syntax`, icon search,
  against the live canvas (paired session) and against files.
- BYOK generate/edit that emits DSL through the same compiler. Proposal shown, then
  accepted as one undo step.

**Ship**
- Export PNG / SVG / PDF / JSON; multi-page documents; light/dark themes; optional
  hand-drawn stroke; local-first storage with crash recovery; one-shot import of V1
  JSON files. No account. No telemetry by default.

## 4. Architecture

Keep `src/opencanvas/` — the kernel. Layers and the dependency rule are enforced by
`src/opencanvas/presentation/design-system/architecture.test.ts` and the domain
READMEs; keep them.

```
src/opencanvas/domain/         pure TS. document types, geometry, commands, connectors,
                               transforms, camera, text. No React/Pixi/DOM/Zustand.
src/opencanvas/application/    sessions, history, selection, ai proposals. No Pixi/DOM.
src/opencanvas/infrastructure/ pixi renderer, export, import. Adapters only.
src/opencanvas/presentation/   design-system/ (tokens, controls) and v2/ (the editor).
src/dsl/                       NEW (phase 2): grammar, parser, layout, compile, serialize,
                               families/. Pure TS, no React/Pixi. Depends on domain only.
src/services/                  storage, mermaid, elk-layout, shapeLibrary/icons, ai.
src/agent/ + mcp-server/       operation manifest, MCP tools.
```

Canonical document = `domain/document/types.ts` (`SceneDocument` → pages → nodes,
connectors, layers; `ConnectorEndpoint` bound or free; `ConnectorRouteIntent`
kind + ownership). DSL is a projection of it, never the storage format.

Deleted in phase 0: `src/components/**` (except what the new shell needs and gets
moved), `src/hooks/**`, `src/store/**`, React Flow, yjs collaboration, i18n,
framer-motion, rollout flags, `/flow/:id`, `/_labs/*`, legacy benchmark configs.
See phase 0 for the exact list and the keep-list.

## 5. Process — how we build fast without gates

- **Slice** = one agent, ≤1 day, commits straight on `v2` (no branches), one spec of ≤15 bullets in the phase
  file (behaviour + how to check). Pick the next unclaimed slice in `STATE.md`,
  write your name/date next to it, build, commit when green, move it to done in `STATE.md`.
- **Merge when green:** `npm run typecheck && npm run lint && npm run test -- --run`.
  UX slices add one headed Playwright check (`npm run e2e:headed -- <file>`) because
  headless misses trackpad/pointer drops.
- **Roles:** Opus/Fable writes specs, reviews every diff, owns architecture.
  Sonnet/Codex-class builds slices. A reviewer agent reads every diff for
  correctness before merge. The owner tests on `/` daily and files feel bugs in
  `STATE.md`.
- **Breakage:** fix forward. The app must boot after every merge; that is the only
  rule. No flags, no rollback plans, no compatibility shims, no fidelity reports.
- **Docs:** this folder + `STATE.md` (≤40 lines). Do not create other plans,
  status files, or ADRs. Put rationale in the PR and in code comments.

## 6. Code rules (the "scales" part)

1. Domain is pure and tested. Every domain/dsl function has a unit test next to it.
2. Presentation is thin: hooks call application/domain functions; no geometry math
   in React components; no business logic in Pixi adapters.
3. Shortest thing that works. Reuse before write (grep first). Stdlib before deps.
   New dependency needs a one-line "why" in the PR. No abstractions with one user.
4. Delete on sight: dead code, unused exports, legacy comments, `V1`/`legacy`/
   `rollout` names. A PR that deletes more than it adds is a good PR.
5. Names say what, comments say why. Match the style of the surrounding file.
6. Mark deliberate shortcuts with `// ponytail: <ceiling> — <upgrade path>`.
7. One undo step per user intent. Every command has an inverse.
8. Never block the main thread: layout (ELK) and heavy parsing run in a worker.
9. Accessibility basics stay: keyboard for every action, focus visible, AT tree.

## 7. Verify / run

```
npm run dev                      # http://localhost:5173/  → the canvas
npm run typecheck                # (added in phase 0; tsc -b --pretty false)
npm run lint
npm run test -- --run            # vitest, whole repo
npm run e2e:headed -- e2e/<x>    # one headed Playwright check for UX slices
node scripts/check-v2-polish.mjs # headed pointer/latency probe (see phase 1)
```

## 8. Key files to know

- `src/opencanvas/domain/document/types.ts` — canonical model
- `src/opencanvas/domain/commands/` — commands + inverse (`execute.ts`)
- `src/opencanvas/domain/connectors/` — binding, editing, `obstacleRouting.ts`
- `src/opencanvas/domain/transforms/` — move/resize/rotate/snap
- `src/opencanvas/presentation/v2/` — the editor: `V2EditorPage.tsx`, `useV2Pointer.ts`
  (pointer state machine), `pointerOperations.ts`, `v2ConnectorOperations.ts`,
  `useV2Keyboard.ts`, `useV2Camera.ts`, `V2CanvasHost.tsx`
- `src/opencanvas/infrastructure/pixi/` — renderer
- `src/services/storage/v2/v2Repository.ts` — persistence
- `src/services/mermaid/` — detection/parsing/fidelity corpus (reuse in phase 3)
- `src/services/elkLayout*` / `elkjs` — auto-layout
- `src/services/shapeLibrary/` + `public/` icon packs — 1,600+ icons
- `src/agent/manifest.ts`, `mcp-server/src/tools/` — agent surface
