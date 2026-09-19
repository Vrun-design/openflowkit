# STATE — OpenFlowKit / OpenCanvas

## Goal
For diagram authors, a free local-first diagramming + whiteboarding tool whose
production editor runs on one canonical document with the OpenCanvas (Pixi)
renderer, React Flow kept as fallback. Roadmap: docs/opencanvas-product-roadmap.md.

## Now
2026-09-19: plan approved — docs/agent-native-plan.md (Track A Pixi parity→default, Track B agent-native).
Done today: A1 text auto-size, A3 playback+cinematic on Pixi, A4 browser proofs (found+fixed resize-drop and rotate-handle bugs), A5 Pixi default ON; B1 action registry, B2 WebMCP, B3 MCP diagram_* tools. Deferred: A2 per-row family editors (inspector path works). Next: user tests Pixi on this branch; then merge; B4 agent eval; A6 store flip.
M1 workflows complete (browser-proven, `npm run test:opencanvas:editor-surface`
8/8); M2 started: M2.1 insert-node-into-edge done. Done: M1.1 canvas API (`src/canvas/activeCanvas.ts`), M1.2
context menus + label editing, M1.3 drag-to-connect handles, M1.4 shared external paste/drop, M1.5 pen/highlighter/line/arrow drawing
on the Pixi surface (StrokeNode fallback on React Flow). Browser spec: `npm run test:opencanvas:editor-surface`.
Full record: docs/opencanvas-execution-status.md (read it first).

## Next actions
1. Track A/B per docs/agent-native-plan.md: A1 → B1 → A2 → …
2. Merge branch to main (flag off) once A1 lands.
3. M2.2 repeated quick-create + suggestions; M2.3 replace-kind compatibility report.
2. M1 (d) canonical ownership flip (large; own change set).
3. Canonical store ownership; Pixi-default decision.
4. Group/lock/hide UI on Pixi; save/reopen/export browser proof.

## Decisions
- 2026-09-19 — Pixi surface default ON (A5); React Flow fallback kept; lazy bundle budget raised 8500→9500 KB for the Pixi chunk until fallback removal.
- 2026-09-19 — Transform commits bake transform.scale into size/points (legacy has no scale).
- 2026-09-19 — A2 per-row family editors deferred: inspector already edits family fields on Pixi.
- 2026-09-19 — Do not adopt BuilderIO/agent-native framework; borrow the one-action-many-surfaces pattern over canonical commands.
- 2026-09-19 — Ship Pixi default before store ownership flip; flip is invisible to users.
- 2026-09-10 — Pixi surface flag stays default-off until text auto-size (M3) and mermaid_svg render; fallback retained.
- 2026-09-10 — Production surface is the one production gesture implementation; `/pixi-spike` and the document page stay as evidence harnesses, no new gesture work there.
- 2026-09-10 — `useActiveCanvas()` wraps `useReactFlow()`; registered Pixi API overrides it. One seam, no consumer rewrite.
- 2026-09-10 — Unsized legacy nodes: deterministic estimate in projection, never persisted back.

## Open questions
- What is MUSE (for the MUSE connector, B5)? Undefined in repo.
- None blocking. Pixi-default rollout needs release evidence (external gate).

## Done
- 2026-09-19 — A1 legacy unsized nodes grow to label on Pixi; editor-surface spec 9/9.
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
