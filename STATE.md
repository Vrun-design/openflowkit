# STATE — OpenFlowKit / OpenCanvas

## Goal
For diagram authors, a free local-first diagramming + whiteboarding tool whose
production editor runs on one canonical document with the OpenCanvas (Pixi)
renderer, React Flow kept as fallback. Roadmap: docs/opencanvas-product-roadmap.md.

## Now
M1 workflows complete (browser-proven, `npm run test:opencanvas:editor-surface`
8/8); M2 started: M2.1 insert-node-into-edge done. Done: M1.1 canvas API (`src/canvas/activeCanvas.ts`), M1.2
context menus + label editing, M1.3 drag-to-connect handles, M1.4 shared external paste/drop, M1.5 pen/highlighter/line/arrow drawing
on the Pixi surface (StrokeNode fallback on React Flow). Browser spec: `npm run test:opencanvas:editor-surface`.
Full record: docs/opencanvas-execution-status.md (read it first).

## Next actions
1. M2.2 repeated quick-create + suggestions; M2.3 replace-kind compatibility report.
2. M1 (d) canonical ownership flip (large; own change set).
3. Canonical store ownership; Pixi-default decision.
4. Group/lock/hide UI on Pixi; save/reopen/export browser proof.

## Decisions
- 2026-09-10 — Pixi surface flag stays default-off until text auto-size (M3) and mermaid_svg render; fallback retained.
- 2026-09-10 — Production surface is the one production gesture implementation; `/pixi-spike` and the document page stay as evidence harnesses, no new gesture work there.
- 2026-09-10 — `useActiveCanvas()` wraps `useReactFlow()`; registered Pixi API overrides it. One seam, no consumer rewrite.
- 2026-09-10 — Unsized legacy nodes: deterministic estimate in projection, never persisted back.

## Open questions
- None blocking. Pixi-default rollout needs release evidence (external gate).

## Done
- 2026-09-10 — M1.1 canvas API + nav controls on Pixi + unsized-node fix.
- 2026-09-10 — M1.2 menus + label editing on Pixi; reverse-edge menu fix.
- 2026-09-10 — M1.3 drag-to-connect handles; insertion selects only the new node.
- 2026-09-10 — M1.4 shared external input hook; surface focusable; dblclick adds node.
- 2026-09-10 — M1.5 drawing tools in toolbar (Pixi only) + StrokeNode fallback.
- 2026-09-10 — M1.6 group/ungroup + section lock/hide wired on both canvases; nodeState helper.
- 2026-09-10 — M1.7 export parity (canonical capture on Pixi) + multi-page/reload/export browser proof.
- 2026-09-10 — M1.8 paste in place + style copy/paste in menus, mod+shift+v.
- 2026-09-10 — M1.11 mermaid_svg nodes render on Pixi as SVG images.
- 2026-09-10 — M1.12 alignment guides + snap while moving on the surface.
- 2026-09-10 — M1.13 store.applyCanonicalCommand — one canonical write path with history.
- 2026-09-10 — M1.14 per-page memoised projection shared by surface/store/export.
- 2026-09-10 — M2.1 insert node into edge (edge menu, both canvases).
- 2026-09-10 — M1.9 touch pan/pinch + semantic tree on the surface; eval routes keep own glue (decision).
