# Phase 1 — Hands: canvas feel + connectors (week 1)

Goal: direct manipulation that feels like tldraw/FigJam and connectors that feel
better than Koboyo. Everything measured with a headed browser, not felt.

Where the code lives: `src/opencanvas/presentation/v2/` (pointer state machine
`useV2Pointer.ts`, `pointerOperations.ts`, `v2ConnectorOperations.ts`, camera
`useV2Camera.ts`, host `V2CanvasHost.tsx`), domain `connectors/`, `transforms/`,
renderer `infrastructure/pixi/`. Already present: select/marquee/move/resize/rotate,
object snapping + alignment guides, side connect handles (`connectHandles.ts`),
connector endpoint/waypoint editing, orthogonal obstacle routing
(`routeOrthogonalAroundObstacles`), wheel-pan / ⌘-wheel-zoom, `window.__V2__` test API.

Reference behaviours (open them side by side while building): tldraw.com,
koboyo.com/mermaid-editor (public canvas), figma.com/figjam. Match, then beat.

## Slices

### 1.1 Feel probe (do first — everything else is measured with it)
- Extend `scripts/check-v2-polish.mjs` into `scripts/feel-probe.mjs`: headed Chromium
  (memory: headless misses trackpad drops), drives real `pointermove` bursts at
  120 Hz, wheel streams (deltaMode 0/1, ctrlKey pinch), and records via
  `PerformanceObserver` + rAF timestamps: pointer→paint latency p50/p95, dropped
  frames per 1 s drag, zoom-anchor drift in px after 20 pinch steps.
- Prints a table; writes JSON to `docs/evidence/feel/<date>.json`. Target numbers
  live in `STATE.md`: p95 latency ≤ 16 ms at 500 nodes, 0 dropped frames in a 3 s
  drag, zoom-anchor drift ≤ 1 px.
- Check: run it twice on the same build → numbers within 10 %.

### 1.2 Camera
- Zoom to cursor exactly (no drift); wheel zoom uses exponential steps; pinch on
  Safari via `gesturechange` scale; trackpad pan inertia off (tldraw has none; keep
  it simple); `deltaMode` lines/pages normalised to pixels.
- Space+drag pans, `H` hand tool, `⌘0` fit, `⌘1` 100 %, `⌘=`/`⌘-` zoom steps
  around viewport centre, double-tap-space no-op.
- Camera changes never hit the document/undo stack.
- Check: feel probe zoom-drift ≤ 1 px; headed Playwright: pinch 20× at (300,300),
  the node under the pointer stays under the pointer.

### 1.3 Pointer pipeline
- One `pointerdown` → `setPointerCapture`; all moves come from `pointermove` on the
  captured element; coalesce with `getCoalescedEvents()`; apply on rAF (one document
  preview per frame). Escape cancels any operation and restores `before`.
- No React state per move: preview goes through a ref into the renderer; React
  re-renders only on operation end.
- Check: feel probe 0 dropped frames in a 3 s move of 200 selected nodes.

### 1.4 Hover handles + quick-create (the Koboyo/tldraw move)
- Hover a node (or select it) → four side `+` handles outside the bounds, scaled in
  screen space. Hover handle → highlight. Drag from handle → live connector preview
  from that side. Release over a node → bind to nearest side of that node. Release
  on empty canvas → create a node of the same kind + size, aligned on the drag axis
  at a fixed gap (tldraw: 1× node size), bind the connector, select it, open label
  editing. Click (no drag) on a handle → same as release-on-empty in that direction.
- Domain: `connectors/quickCreate.ts` (pure: given node + side + drop point → new
  node + connector). Unit tests for all four sides and both drop cases.
- Check: headed Playwright: `r`, click, hover, drag from right handle 200 px, release
  → 2 nodes, 1 connector bound right→left, label editor focused.

### 1.5 Live orthogonal routing
- Connector route recomputes on every preview frame while (a) dragging a bound
  node, (b) dragging a connector endpoint, (c) resizing. Uses
  `routeOrthogonalAroundObstacles` over the visible page; obstacles = all nodes
  except the endpoints' own; padding 12 px; corner radius 8 px in the renderer.
- Cost: route in ≤ 0.5 ms for 200 obstacles (spatial grid; add one if it isn't there).
  Manual waypoints (`ownership: 'manual'`/`'hybrid'`) are preserved; automatic
  routes are recomputed. `resetConnectorRoute` returns to automatic.
- Binding picks the side facing the other endpoint, hysteresis 10 px so it doesn't
  flicker while dragging across a corner.
- Check: unit tests for side hysteresis + obstacle avoidance; headed: drag node A
  around node B in a circle; route never crosses B, side switches ≤ 4 times.

### 1.6 Connector editing polish
- Click a connector → selected: endpoint handles + midpoint handle. Drag midpoint →
  adds a waypoint (ownership → hybrid). Double-click connector → label editor at the
  click point. Delete removes it. `⇧` + drag endpoint → free endpoint (not bound).
- Markers: none/arrow/dot at each end; dashed/solid; stroke width; color — via a
  small floating style bar (`V2SelectionStyle.tsx` already exists; extend).
- Parallel edges between the same nodes offset by 12 px; reverse edges likewise;
  self-loops route as a rounded rectangle out of the node's top-right.
- Check: unit tests for offsets/self-loop geometry; headed: create 3 parallel
  edges → no overlap.

### 1.7 Selection/transform polish
- Shift-click add/remove, drag on selected group moves group, marquee inside-only vs
  crossing (tldraw: crossing), arrow keys nudge 1 px / ⇧ 10 px, `⌘D` duplicate with
  +20/+20 offset, `⌘G` group into frame / `⌘⇧G` ungroup, `]`/`[` z-order,
  `⌘L` lock, `⌘A` all, `Esc` clear.
- Resize keeps aspect with ⇧, from centre with ⌥; rotation snaps to 15° with ⇧.
- Snapping: object edges/centres + 8 px grid when ⌘ not held; guides drawn in
  screen space (already in `alignmentGuides.ts`).
- Check: `useV2Keyboard.test.ts` covers each shortcut; headed: duplicate 50 nodes
  and move them → no dropped frames.

### 1.8 Text
- `T` tool or double-click empty → text node, auto-width, ⌘↵ / Esc ends. Double-click
  any node → label editing in place (overlay exists: `OpenCanvasTextEditorOverlay`).
  Font size scales with zoom without blur (overlay in screen space).
- Check: existing overlay tests + one headed check for zoomed editing.

## Done when
Feel probe targets met on the owner's machine; all headed checks pass; the owner
says "this feels better than Koboyo" on: zoom, drag, quick-create, live routing.
