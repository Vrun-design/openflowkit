# OpenCanvas execution status

Implementation record for [the product roadmap](opencanvas-product-roadmap.md).
Planning scope lives there; this file records what is actually wired, verified,
and next. Updated: 2026-09-10.

## Current position

Milestone **M1 — One complete production editor**. Done: M1.1 canvas API,
M1.2 menus/label editing on the surface. Next: M1.3 (see "Next steps").

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
| Shared interaction controllers | partial | Surface reuses `pixiPointerOperations`, `pixiConnectorOperations`, selection model; `OpenCanvasDocumentPage` still has its own handler hooks (`usePixi*`). Freeform draw not on surface. |
| Renderer-neutral canvas API | **done (camera/coords/fit)**; clipboard/export/insertion go through store + `screenToFlowPosition` | `src/canvas/activeCanvas.ts`, `src/opencanvas/presentation/openCanvasSurfaceApi.ts`. Consumers: NavigationControls, FlowCanvas, LayersView, SearchView, usePlayback, useFlowExport, useEdgeOperations, useFlowEditorScreenState. |
| Canonical store ownership | missing | Store still legacy; adapter direction only. |
| Complete node/edge/canvas/multi menus | **done on both canvases** (same `useFlowCanvasMenusAndActions` + `ContextMenu`) | `OpenCanvasSurface.tsx` right-click → node/multi/edge/pane menus; paste-here uses active-canvas `screenToFlowPosition`. Group/section items depend on M1 group UI. |
| Insert/connect/…/delete | partial | Pixi: select, marquee, move/resize/rotate, connector reroute/reconnect, rename (double-click, F2, typing, Edit label, post-insert), insert via toolbar, delete/duplicate/z-order/reverse via menus (browser-verified). Missing on Pixi: draw new connector from a node, freeform draw, group/ungroup UI, lock/hide UI, drag-drop files/images. |
| Paste-in-place / style paste / external paste / file drop | partial | Keyboard copy/paste is store-based and works on either canvas. File/image drop handlers live in `FlowCanvas` only. |
| Undo/redo + save/reopen | partial | Every Pixi commit records `recordHistoryV2`; persistence is the legacy store path. |
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

## Unverified / external gates

- Real-GPU hardware performance capture (needs headed run on reference hardware).
- Manual assistive-technology audit.
- React Flow fallback removal: needs an accepted Pixi-default release period.

## Decisions

- 2026-09-10 — Active-canvas registry (`useActiveCanvas`) wraps `useReactFlow`
  rather than replacing it everywhere; cost: React Flow provider stays mounted
  around the editor; benefit: one-line consumer change, both canvases share
  one contract.
- 2026-09-10 — Unsized legacy nodes get a deterministic estimate, never DOM
  `measured`, so the reverse projection cannot write sizes into legacy data.
  Cost: Pixi may draw a slightly different size than React Flow measured.

## Next steps

1. **M1.3 drag-to-connect from a node** on the Pixi surface (reuse
   `pixiConnectorOperations` create path from `OpenCanvasDocumentPage`);
   include the "connect menu" (drop on empty space → add-and-connect).
2. **M1.4 file/image drop + external paste** on the surface (move
   `useFlowCanvasDragDrop` to the seam so both canvases share it).
3. **M1.5 freeform draw tools** on the surface (reuse `pixiFreeformOperations`).
4. Then canonical store ownership (M1 architecture item), group/lock/hide UI
   on Pixi, save/reopen/export browser proof, and the flag-default decision.
