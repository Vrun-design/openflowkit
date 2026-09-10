# STATE — OpenFlowKit / OpenCanvas

## Goal
For diagram authors, a free local-first diagramming + whiteboarding tool whose
production editor runs on one canonical document with the OpenCanvas (Pixi)
renderer, React Flow kept as fallback. Roadmap: docs/opencanvas-product-roadmap.md.

## Now
M1 in progress. Done: M1.1 canvas API (`src/canvas/activeCanvas.ts`), M1.2
context menus + label editing, M1.3 drag-to-connect handles, M1.4 shared external paste/drop on the Pixi
surface. Browser spec: `npm run test:opencanvas:editor-surface`.
Full record: docs/opencanvas-execution-status.md (read it first).

## Next actions
1. M1.5 — freeform draw tools on the surface (`pixiFreeformOperations`).
2. Group/lock/hide UI on Pixi; save/reopen/export browser proof.

## Decisions
- 2026-09-10 — `useActiveCanvas()` wraps `useReactFlow()`; registered Pixi API overrides it. One seam, no consumer rewrite.
- 2026-09-10 — Unsized legacy nodes: deterministic estimate in projection, never persisted back.

## Open questions
- None blocking. Pixi-default rollout needs release evidence (external gate).

## Done
- 2026-09-10 — M1.1 canvas API + nav controls on Pixi + unsized-node fix.
- 2026-09-10 — M1.2 menus + label editing on Pixi; reverse-edge menu fix.
- 2026-09-10 — M1.3 drag-to-connect handles; insertion selects only the new node.
- 2026-09-10 — M1.4 shared external input hook; surface focusable; dblclick adds node.
