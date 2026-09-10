# OpenCanvas execution status

Implementation record for [the product roadmap](opencanvas-product-roadmap.md).
Planning scope lives there; this file records what is actually wired, verified,
and next. Updated: 2026-09-10.

## Current position

Milestone **M1 — One complete production editor**. Done: M1.1 canvas API,
M1.2 menus/label editing, M1.3 drag-to-connect, M1.4 external input, M1.5
freeform drawing, M1.6 group/lock/hide, M1.7 export + multi-page proof,
M1.8 paste-in-place/style paste, M1.9 touch + screen-reader access on the
surface. Next: M1.10 (see "Next steps").

Production entry: `src/components/FlowEditor.tsx` mounts
`OpenCanvasSurface` at the canvas seam only when the build sets
`VITE_OPEN_CANVAS_EDITOR_SURFACE_V1=1` (`rolloutFlags.openCanvasEditorSurfaceV1`),
with the React Flow `FlowCanvas` as in-place fallback. Default builds ship
React Flow. Pixi is not default; parity is incomplete (below).

## Baseline (start of program, revision ddc5a63 + uncommitted WIP)

- Pre-existing uncommitted work (kept, built on): node context menu on the
  Pixi surface (`OpenCanvasSurface.tsx`, `ContextMenu.tsx` optional Copy,
  `FlowEditor.tsx` actions prop, README roadmap pointer).
- `tsc -b` clean; `OpenCanvasSurface.test.tsx` 34/34 passing. No baseline
  failures found in the suites run below.
- Store is still React Flow-shaped (`nodes`/`edges` with `selected` flags);
  Pixi edits go legacy → canonical command → legacy via the
  `active-document/production*Bridge` modules. Confirmed still true.

## M1 requirement status

| Requirement | Status | Paths |
| --- | --- | --- |
| Shared interaction controllers | partial — decision recorded | All gesture *logic* is shared (`pixiPointerOperations`, `pixiConnectorOperations`, `pixiFreeformOperations`, `touchCameraGesture`, selection, camera). The production surface, `OpenCanvasDocumentPage`, and `PixiSpikePage` each keep their own handler glue. Decision: the production surface is the single production implementation; the two evaluation routes remain evidence harnesses (visual/recovery/hardware specs depend on them) and are candidates for retirement, not for new gesture work. |
| Renderer-neutral canvas API | **done (camera/coords/fit)**; clipboard/export/insertion go through store + `screenToFlowPosition` | `src/canvas/activeCanvas.ts`, `src/opencanvas/presentation/openCanvasSurfaceApi.ts`. Consumers: NavigationControls, FlowCanvas, LayersView, SearchView, usePlayback, useFlowExport, useEdgeOperations, useFlowEditorScreenState. |
| Canonical store ownership | missing | Store still legacy; adapter direction only. |
| Complete node/edge/canvas/multi menus | **done on both canvases** (same `useFlowCanvasMenusAndActions` + `ContextMenu`) | `OpenCanvasSurface.tsx` right-click → node/multi/edge/pane menus; paste-here uses active-canvas `screenToFlowPosition`. Group/section items depend on M1 group UI. |
| Insert/connect/…/delete | partial | Pixi: select, marquee, move/resize/rotate, connector reroute/reconnect, rename (double-click, F2, typing, Edit label, post-insert), insert via toolbar, delete/duplicate/z-order/reverse via menus (browser-verified). Drag-to-connect from side handles (drop on node → edge; drop on empty → connect menu) verified. Double-click on empty space adds a node. Pen/highlighter/line/arrow drawing from the toolbar (Pixi only; React Flow renders strokes read-only via `StrokeNode`). Group (= wrap in section) / Ungroup, section Lock/Unlock, Hide/Show, Fit contents, Bring inside, Release from section all reachable from the menus on both canvases; hidden sections do not draw or hit-test on Pixi, locked ones select but never move. Reorder: z-order items in the node menu. |
| Paste-in-place / style paste / external paste / file drop | mostly done | Internal copy/paste + style paste are store-based (either canvas). External paste (text/Mermaid/JSON) and image/file drop go through `useCanvasExternalInput`, shared by both canvases (browser-verified on Pixi). Paste in place (`mod+shift+v`, canvas menu) keeps the copied coordinates and internal edges; Copy/Paste style in the node menu on both canvases. |
| Undo/redo + save/reopen | verified for the covered operations | Every Pixi commit records history; persistence is the legacy store path; browser: reload after cross-page paste and after drawing keeps content. Export: PNG/JPEG/SVG/PDF and copy-image go through `hooks/flow-export/activeCanvasCapture.ts` — canonical SVG (rasterised for bitmaps) on Pixi, DOM capture on React Flow; JSON export was already document-based. |
| Pixi default + fallback | not started | Flag default off. |

## Completed slices

### M1.1 — Chrome acts on the visible canvas (2026-09-10)

Behavior: zoom in/out/fit buttons, keyboard zoom/fit, playback fit, search/
layers "focus node", and toolbar insertion position all target the OpenCanvas
surface when it is mounted, and React Flow otherwise. Zoom readout follows the
Pixi camera. Nav controls render on the Pixi surface (previously they only
existed inside React Flow). Selection made elsewhere (Select All, inspector,
paste) is mirrored onto the Pixi overlay.

Fixes found on the way:
- Legacy nodes with no stated size projected as 0×0 and were invisible on
  Pixi. `legacyProjection` now accepts `resolveNodeSize`; both React Flow
  adapters pass `resolveLegacyNodeSize` (layout-engine estimate) so the node
  draws while the legacy record stays unsized (React Flow keeps auto-measure).
- Repeated zoom clicks chained from the mid-animation frame; now chain from
  the animation target (`openCanvasSurfaceApi`).
- NavigationControls buttons had no accessible names; added `aria-label`s and
  a `canvas-zoom-readout` test id.
- Chrome drawn over the surface no longer starts marquee/pan (pointer target
  guard).

Validation (revision: working tree on ddc5a63, Node v25.8.1, macOS):
- `npx tsc -b` — exit 0.
- `npx eslint <touched files> --max-warnings 0` — exit 0.
- `npx vitest --run src/opencanvas src/components src/hooks src/services/storage src/store.test.ts src/canvas` — 270 files, 1254 tests passed.
- `npm run build:ci` — build + bundle budget pass (entry JS 1125.8/1400 KB).
- `npm run test:opencanvas:editor-surface` (new; Chromium + swiftshader, flags
  in `benchmarks/visual/editor-surface.playwright.config.ts`) — 2/2 passed:
  zoom/fit drive the Pixi camera; insertion at 144% zoom lands at the visible
  camera centre and is re-selectable by click.

Not applicable / not verified: theme + RTL for nav controls unchanged from
React Flow path; reduced motion honoured via `prefers-reduced-motion` in the
API but not browser-verified; touch not exercised.

### M1.2 — Menus and label editing on the surface (2026-09-10)

Behavior: right-click on the Pixi surface opens the same node / multi-select /
edge / canvas menus as React Flow, driven by the same `useFlowOperations` +
`useFlowCanvasMenusAndActions` composition (no second implementation). Paste
from the canvas menu lands at the pointer in world space at any zoom. Label
edit requests (F2, typing on a selected node, "Edit label", and the request
queued by every insertion) open the surface's text editor. Escape dismisses
any context menu on either canvas. Clicking an already-selected node makes it
primary so the inspector follows clicks after undo.

Fixed on the way (both canvases): edge menu "Reverse direction" called
`duplicateNode(edgeId)` (inert); now runs the store's atomic
`reverse-connectors` command with history.

Validation (working tree on 5eba94d):
- `npx tsc -b` — exit 0; `eslint` on touched files — exit 0.
- `npx vitest --run src/opencanvas src/components src/hooks src/store` — 260 files, 1235 tests passed.
- `npm run test:opencanvas:editor-surface` — 3/3 passed (zoom/fit; insert at
  zoom + reselect; label edit → canvas menu → F2 → node menu delete → undo).

### M1.3 — Drag-to-connect on the surface (2026-09-10)

Behavior: a single selected node shows four side connect handles (touch-
sized, no hover needed). Dragging one draws a rubber-band; dropping on a node
creates the edge through the same `onConnect` the React Flow canvas uses
(handle ids normalised per node type); dropping on empty space opens the
shared `ConnectMenu` (add-and-connect at the drop point via the active
canvas). Escape cancels. A click without movement does nothing.

Paths: `domain/connectors/connectHandles.ts` (geometry), `PixiSelectionOverlay`
(drawing), `PixiRendererHost.pickConnectHandle/setConnectionPreview`,
`OpenCanvasSurface.tsx` (pointer flow + menu).

Fixed on the way (both canvases): inserting a node set `selectedNodeId` but
left previous nodes flagged `selected`, so a new node joined the old
selection; insertion now selects only the new node. The surface also restates
selection flags on projected writes (rename/transform) and treats
`selectedNodeId` as selected even without the flag.

Validation (working tree on 7247592): `tsc -b` 0; eslint 0; vitest
`src/opencanvas src/components src/hooks src/store` 261 files / 1241 passed;
`npm run test:opencanvas:editor-surface` 4/4 (adds: two nodes, pan, drag
connect handle onto the other node, edge menu on the new connector).

### M1.4 — External input on the surface (2026-09-10)

Behavior: pasting text/Mermaid/JSON and dropping image files onto the Pixi
surface behaves exactly as on React Flow — one composition hook
(`components/flow-canvas/useCanvasExternalInput.ts`) now feeds both
canvases; `FlowCanvas` was refactored onto it. The surface is focusable
(`role=application`, visible focus ring) so clipboard events reach it; an
open label editor keeps focus while panning. Double-click on empty space
adds a node at the pointer through the active canvas.

Validation (working tree on f78dcca): `tsc -b` 0; eslint 0; vitest 261
files / 1243 passed; `npm run test:opencanvas:editor-surface` 5/5 (adds:
Mermaid paste imports 3 nodes, PNG drop creates a selected image node).

### M1.5 — Freeform drawing on the surface (2026-09-10)

Behavior: the toolbar mode group gains Pen / Highlighter / Line / Arrow
buttons (aria-pressed, labelled, localized in 7 locales) whenever the
OpenCanvas surface is the visible canvas; the tool lives in
`viewSettings.drawingTool` (transient, not persisted). Drawing uses the
existing `pixiFreeformOperations` kernel with coalesced/predicted pointer
samples and commits one `insert` node command per stroke (undo/redo = one
entry). Escape cancels an in-progress stroke, then disarms the tool. Strokes
persist as legacy `pen|highlighter|line|arrow` nodes and now render on the
React Flow fallback through `components/StrokeNode.tsx` (SVG path; editing
strokes on React Flow is not supported — geometry is preserved, not lost).
Select/Pan buttons gained accessible names and pressed state.

Validation (working tree on c018958): `tsc -b` 0; eslint 0; full
`npx vitest --run src` 432 files / 2124 passed; `npm run build:ci` pass;
`npm run test:opencanvas:editor-surface` 6/6 (adds: draw pen, Escape
disarms, undo/redo, reload with WebGL disabled shows the stroke as a React
Flow node).

### M1.6 — Group, lock, hide, reorder on the surface (2026-09-10)

Behavior: multi-selection menu "Group" wraps the selection in a section
sized around it (`hooks/node-operations/groupOperations.ts`; grouping and
"wrap in section" are one operation); section menu "Ungroup" releases the
children and removes the section. Section Lock/Hide/Fit/Bring-inside and
node "Release from section" items — which existed in `ContextMenu` but were
never passed by either canvas — are now wired on both. One domain helper
(`domain/scene/nodeState.ts`) resolves effective visible/locked from layer
plus section ancestry; the scene index, all three Pixi renderers, the host
picks, and `isNodeEditableOnLayer` use it, so hidden sections vanish and
locked ones cannot be moved on Pixi. Containers are now clickable on Pixi.
Plain click on a node inside a multi-selection collapses to that node
(React Flow behaviour). Drop-to-connect ports face the source anchor.

Also: canonical fallback size for unsized legacy nodes changed to
`resolveNodeSize` (120×60 for a plain rectangle) so Pixi geometry matches
React Flow and the legacy grouping/alignment helpers.

Validation (working tree on 3bb79c2): `tsc -b` 0; eslint 0; full
`npx vitest --run src` 434 files / 2129 passed; `npm run build:ci` pass;
`npm run test:opencanvas:editor-surface` 7/7 (adds: shift-click multi-select
→ Group → Lock blocks drag → Unlock → Ungroup → children selected).

### M1.7 — Export parity and multi-page proof (2026-09-10)

Behavior: image exports (PNG/JPG/SVG/PDF, download and copy) used to capture
the React Flow DOM and failed with "viewport could not be found" on the Pixi
surface. One capture function now picks the path: canonical SVG
(`exportCanonicalSvg`, transparent option added; bitmaps rasterised via an
offscreen canvas at 2× ) when the OpenCanvas surface is active, DOM capture
otherwise. Errors surface as toasts with the real reason.

Browser proof: node copied on page 1, pasted on page 2 (inspector shows the
copy), reload keeps both pages, SVG export from the export menu downloads a
canonical SVG containing the pasted label.

Validation (working tree on 1fa8899): `tsc -b` 0; eslint 0; vitest 435
files / 2131; build:ci pass; `npm run test:opencanvas:editor-surface` 8/8.

Not applicable / unverified: cinematic video export still captures React
Flow DOM (video is a separate backlog item); clipboard copy of images is not
browser-verified (Playwright clipboard permissions).

### M1.8 — Paste in place and style paste (2026-09-10)

Behavior: `pasteSelectionInPlace` (remappable `pasteInPlace`, default
`mod+shift+v`) pastes at the copied coordinates with new IDs and only the
edges internal to the copied set; "Paste in place" appears in the canvas
menu, "Copy Style"/"Paste Style" in the node menu — same actions on both
canvases. Localized in 7 locales.

Validation (working tree on 8cb5cc6): `tsc -b` 0; eslint 0; vitest 436
files / 2133; `npm run test:opencanvas:editor-surface` 9/9 (adds: copy
style → paste in place → drag copy aside → original still underneath →
paste style via menu).

### M1.9 — Touch and screen-reader access on the surface (2026-09-10)

Behavior: on touch, a finger on a node selects/drags it exactly like a
mouse; a finger on empty space pans; a second finger pinches (cancelling
any drag in progress). No hover- or modifier-only action is required for
the covered operations (connect handles and menus are tap targets). The
existing sr-only `OpenCanvasSemanticSceneTree` (nodes/connectors as labelled
buttons, live region) is mounted on the surface unconditionally and drives
the same selection bridge, so assistive tech can enumerate and select
objects. Reduced motion is honoured by the camera API.

Decision: evaluation routes keep their own handler glue (see table).

Validation (working tree on 6a1e8a4): `tsc -b` 0; eslint 0; vitest
opencanvas+components 213 files / 945; editor-surface browser spec 8/8
(unchanged — touch is unit-tested with synthetic pointer events, not on a
device; recorded as unverified on hardware).

## Unverified / external gates

- Touch/pen on physical devices; the surface's touch flow is only covered by
  synthetic pointer events.
- Manual screen-reader pass over the surface's semantic tree.

- Real-GPU hardware performance capture (needs headed run on reference hardware).
- Manual assistive-technology audit.
- React Flow fallback removal: needs an accepted Pixi-default release period.

## Decisions

- 2026-09-10 — Active-canvas registry (`useActiveCanvas`) wraps `useReactFlow`
  rather than replacing it everywhere; cost: React Flow provider stays mounted
  around the editor; benefit: one-line consumer change, both canvases share
  one contract.
- 2026-09-10 — Unsized legacy nodes get `resolveNodeSize` (the per-shape
  minimum React Flow renders at, and what legacy geometry helpers assume),
  never DOM `measured`, so the reverse projection cannot write sizes into
  legacy data. Cost: labels longer than the minimum are clipped on Pixi until
  M3 text measurement.

## Next steps

1. **M1.9 evaluation-surface consolidation**: make `OpenCanvasDocumentPage`
   reuse the surface's pointer flow (or retire the duplicated handlers) so
   there is one implementation of each gesture.
3. Then canonical store ownership (M1 architecture item), group/lock/hide UI
   on Pixi, save/reopen/export browser proof, and the flag-default decision.
