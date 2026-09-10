# STATE — OpenFlowKit / OpenCanvas

## Goal
For diagram authors, a free local-first diagramming + whiteboarding tool whose
production editor runs on one canonical document with the OpenCanvas (Pixi)
renderer, React Flow kept as fallback. Roadmap: docs/opencanvas-product-roadmap.md.

## Now
M1 in progress. Slice M1.1 done: renderer-neutral canvas API
(`src/canvas/activeCanvas.ts`); toolbar/keyboard/search camera + insertion act
on the visible canvas; browser spec `npm run test:opencanvas:editor-surface`.
Full record: docs/opencanvas-execution-status.md (read it first).

## Next actions
1. M1.2 — canvas/edge/multi context menus on the Pixi surface (see status doc).
2. M1.3 — drag-to-connect from a node on the Pixi surface.
3. M1.4 — file/image drop + external paste shared at the canvas seam.

## Decisions
- 2026-09-10 — `useActiveCanvas()` wraps `useReactFlow()`; registered Pixi API overrides it. One seam, no consumer rewrite.
- 2026-09-10 — Unsized legacy nodes: deterministic estimate in projection, never persisted back.

## Open questions
- None blocking. Pixi-default rollout needs release evidence (external gate).

## Done
- 2026-09-10 — M1.1 canvas API + nav controls on Pixi + unsized-node fix.
