# Interaction specification

Status: proposed baseline, 2026-09-19. These are OpenCanvas decisions; exact
competitor parity is not implied. Reference links are in [assessment](assessment.md).
Each row becomes a behavioral test; screenshots supplement those tests.

## Universal rules

Coordinates are transformed through one screen/world/local geometry service.
Gesture thresholds and hit-target sizes use CSS screen pixels, independent of
zoom and device-pixel ratio. One completed gesture creates at most one undo entry.
Pointer cancellation, lost capture, Escape, or document switch discards the
uncommitted preview. Changing selection or camera does not create document history.
Temporary Space-pan returns to the previous tool. Editing text owns keyboard input.

| ID | Behavior | Acceptance scenario |
| --- | --- | --- |
| I-01 | Click selects; Shift-click toggles; empty click clears. Marquee selects intersecting unlocked visible objects; container inclusion rules are consistent. | At 50%, 100%, and 200% zoom, select a mix of nodes and edges; exact selection IDs agree between pointer and semantic tree. Hidden objects never enter the result. |
| I-02 | V select, H hand, R rectangle, O ellipse, A connector, T text; other tools have visible actions. Shortcuts are discoverable and respect remapping. | Typing these letters in a label/input never changes tools. Escape exits current gesture before clearing selection. |
| I-03 | Create shapes by drag or click using a theme default size. Select the result and offer immediate text entry. | Undo removes creation once; redo restores ID, text, and dimensions; pointer cancellation creates nothing. |
| I-04 | Move selections, snap to grid/alignment, show guides, temporarily disable snap with Alt where available. | At all test zooms, snap engages at the same screen distance. Moving a group preserves internal offsets and reroutes only affected connectors. |
| I-05 | Resize/rotate via handles; Shift constrains; details popover exposes exact geometry. | Test rotated rectangle, diamond, icon, and long text; visual outline, hit-test, binding point, and export agree. Minimum size cannot create invalid geometry. |
| I-06 | Double-click/F2 edits text in place; standalone text supports auto-width or fixed-width wrap. | IME composition, emoji, Arabic/RTL text, newline, paste, font load, undo, and zoom work. Escape restores pre-edit text; completion is one history entry. |
| I-07 | Contextual style bar edits compatible common properties; mixed values are explicit. | Multi-select two styles, apply stroke, undo once. Text content/IDs/geometry remain intact unless a deliberate size rule applies. |
| I-08 | Duplicate, modifier-drag duplicate, copy/paste, paste-in-place, and cross-page paste remap IDs and internal bindings atomically. | Copy two connected nodes with assets; paste twice and reopen. Copies connect internally; edges to omitted nodes are excluded unless explicitly selected, in which case omitted endpoints become free at copied positions. |
| I-09 | Delete removes selected objects with consistent binding cleanup; undo restores exact relationships. | Deleting a node deletes connectors wholly attached only to deleted nodes; surviving connectors detach the deleted endpoint at its last position. Undo restores bindings, labels, ordering, and selection affordances. |
| I-10 | Group and frame are distinct: group transforms members; frame provides a named boundary and explicit membership. | Group/ungroup does not shift children. Moving a frame moves members; resizing its boundary does not scale them. No accidental reparenting merely because objects overlap a frame. |
| I-11 | Lock prevents mutation but permits inspect/unlock. Hide excludes render/hit-test and stays recoverable from layers. | Parent lock/hide applies to descendants. Keyboard and AI obey the same effective state. Undo restores previous state. |
| I-12 | Camera supports wheel/trackpad pan/zoom, fit, focus, Space-pan, and pinch. | Zoom anchors at pointer; fit accounts for labels/markers. Pinch cancels an active object drag without committing it. Reduced motion suppresses animated navigation. |
| I-13 | Connect by dragging a visible connect affordance or using A; highlight candidate and binding mode. Endpoints may be free. | Create bound-bound, bound-free, free-free arrows; cancel midway; move bound shape. Outline attachment follows actual ellipse/diamond/rotated geometry. |
| I-14 | Default binding is dynamic perimeter; explicit fixed perimeter attachment and semantic ports remain available. | Dynamic attachment follows relative direction; fixed attachment keeps its normalized local boundary position after move/resize/rotate. Reconnect changes only the chosen endpoint. |
| I-15 | Drop a connector on empty space to quick-create and connect. Keyboard action creates next node in a chosen direction. | Choose node kind, type label, continue the flow. Creation plus connection undoes together. Cancelling the chooser creates neither. |
| I-16 | Select connector to change straight/elbow/curve, markers, stroke, label, or direction inline. | Route change preserves endpoint identities and labels. Reversal swaps endpoints/markers intentionally; undo and export match. |
| I-17 | Elbow segments and curve controls are directly draggable. Manual edits survive unrelated moves; Reset route is explicit. | Drag a segment, move an obstacle, move one endpoint, reload, export. Locked waypoints remain stable; impossible avoidance is indicated rather than silently dropping intent. |
| I-18 | One or more labels edit in place and drag independently along a route; each uses normalized path position plus offset. | Editing one connector label does not alter a node or sibling label. Reroute/reversal keeps label identities, ordering and readable placement; every label remains selectable at each test zoom and survives copy/reload/export. |
| I-19 | Self-loops and parallel/reverse edges have selectable, deterministic separation. | Two opposite edges and a self-loop survive resize, route change, undo, and reload; handles and labels remain distinguishable. |
| I-20 | Insert node into an edge and replace compatible node shape from context actions. | Insert splits the selected connection as one transaction; documented label/marker assignment is previewed. Replace retains ID/text/bindings and warns before dropping unsupported semantics. |
| I-27 | Crossing connectors can display deterministic line jumps/bridges with per-document default and per-connector override. | Moving either route recalculates crossings without changing endpoints/manual waypoints; bridge ownership is stable, zoom-independent, selectable routes remain unambiguous, and SVG/PNG/PDF match the canvas. |
| I-28 | Connectors bind correctly to every supported object outline, including rotated shapes, text, stickies, icons/images, groups/frames and technical shapes. | Move, resize, rotate, group/reparent, replace and delete each target; attachment follows its real outline and lifecycle rules, never a generic rectangle unless that is the defined shape geometry. |
| I-29 | Connector editing remains predictable in dense diagrams: selection, segment handles, labels and parallel edges have prioritized hit testing and screen-space targets. | At 50%, 100% and 200% zoom, choose and edit one of several overlapping/crossing routes without moving a node or selecting the wrong edge; keyboard cycling exposes ambiguous candidates. |
| I-30 | Auto-routing preserves authored intent and route stability. Small shape moves must not cause unrelated or visually equivalent route flips. | Run recorded motion sequences through dense obstacles; affected paths stay clear or report unresolved, manual waypoints remain, unrelated connectors are byte-identical, and undo restores the exact previous intent. |
| I-21 | Tidy/align/distribute operates on selection or an explicitly chosen frame; pinned objects stay fixed. | Unselected positions and manual routes remain unchanged. Preview/cancel is available for a layout operation affecting multiple objects. |
| I-22 | Mermaid paste opens native conversion preview and fidelity report, then inserts atomically at the current viewport. | Supported elements remain individually editable; unsupported input leaves the canvas unchanged until an explicit alternative is chosen. Undo removes only that import. |
| I-23 | AI invocation exposes selection/page scope, progress, cancel, and proposed changes. | Declining or cancelling changes nothing. Accept creates one undo entry. A concurrent user edit makes the response stale; it must not overwrite the edit. |
| I-24 | Save status distinguishes pending, saved locally, and failed. Recovery/backup actions stay reachable. | Simulate quota failure and refresh after completed save; never label failed data as saved. A portable bundle restored in a fresh profile includes all required assets. |
| I-25 | Touch and keyboard have equivalents for connect, reconnect, route type, label, delete, and precision edits. | Complete a small flow without hover or modifier keys; manually traverse and edit with a screen reader. Focus returns predictably after popovers close. |
| I-26 | Pen/highlighter uses pressure when available; completed stroke is one object and undo entry. | Coalesced input, pointer cancel, page switch, reload, and SVG export preserve the stroke. Eraser semantics require a later spec before release. |
| I-31 | The application shell preserves generous canvas space and separates physical hit area from visual control size. Ordinary editing uses contextual disclosure instead of stacked permanent bars or a permanent inspector. | At 1440×900 and 1280×800, measure persistent chrome/canvas ratio and compare the accepted V2-00 budget; complete J1 with no panel required for common actions and no clipped canvas control. |
| I-32 | Fit, first-open, import and new-document camera framing show useful context around content rather than a magnified crop. Canvas zoom is independent of browser zoom and display scaling. | Open the benchmark documents at fresh defaults, import Mermaid, run fit, then repeat at 100%/200% browser zoom and supported display scales; all visible bounds/labels/markers fit with accepted screen-space padding and no camera jump. |
| I-33 | Utility panels are task-scoped, dismissible and non-destructive to spatial context. Temporary tasks prefer overlays; persistent panels collapse in one action and remember appropriate size. | Open layers, source evidence, agent changes and exact properties during J1–J4; closing each returns the same camera/content context, focus is restored, and ordinary editing never requires two panels simultaneously. |
| I-34 | The v2 component language is internally consistent and visibly independent of legacy shell composition while preserving brand recognition. Every primitive has complete pointer, keyboard, touch, loading, error, disabled, theme and zoom behavior where applicable. | Compare the accepted shell direction, production `/v2`, and current UI at milestone gates. Token/component inventory has no unexplained legacy dependency or one-off value; customer sessions describe the experience as a new coherent product rather than the old UI restyled. |

## Text/layout policy

Auto-size expands to fit supported text within the documented maximum wrap width;
fixed-width wraps and grows height by default. Manual fixed-height clipping must
be explicit and visible, never an accidental consequence of late font loading.
Plain text is the initial contract; preserve imported richer source even where
formatting is unsupported. DOM edit overlay, Pixi view, and export consume the
same measured line layout. Do not trim, reorder, or normalize user text silently.

## Connector policy

Routing should prefer a stable previous path over marginally shorter alternatives.
During a drag show a cheap responsive preview; settle affected routes on commit.
Do not move nodes to repair a connector. Unavoidable overlaps get a visible
status and manual repair affordance. Copy/paste, delete, reverse, replace,
group transforms, and undo share one binding lifecycle policy.

For edge insertion, keep the original ID on the source-to-new-node half, retain
the original source marker there, and place the target marker and original label
on the new-node-to-target half by default. Preview this choice and test reverse
and multi-label imports; no semantic reassignment may happen invisibly.

## Test matrix

Exercise the actual `/v2` route rather than a separately maintained demo editor.
Run core workflows on Chromium, Firefox, and WebKit desktop; add physical touch/
pen and a manual screen-reader pass before general release. Include light/dark,
100/200% display scaling, long labels, font fallback, nested frames, rapid Escape,
lost pointer capture, document switches, and reload after every new object kind.
Establish a smaller per-PR smoke set and run the full matrix at milestone gates.

## Connector reference-task benchmark

Before V2-06 implementation, record the exact accepted behavior for the same tasks
in current FigJam and Miro versions. Reference products define task-quality targets,
not internal architecture or pixel cloning. Capture date/version and test:

1. Create a connector from any side/point, drop on a shape, drop on empty canvas,
   quick-create a target, then continue the chain.
2. Move/resize/rotate both endpoints and groups/frames; observe attachment and route
   stability. Reconnect either endpoint to another target or free point.
3. Switch straight/elbow/curve, drag an elbow segment, curve control and waypoint,
   reset automatic routing, reverse direction, and change endpoint markers.
4. Add, edit and move multiple labels; create self-loops, reverse/parallel edges and
   crossings; select one route in a dense overlap.
5. Insert a node into a connector, duplicate/copy/paste the connected selection,
   delete/undo/reload/export, then repeat with keyboard and touch where supported.

The v2 gate is independent completion with equal or lower repair work on OpenFlowKit's
supported task set. Any intentional difference must improve the builder workflow and
be written into the interaction contract; “our implementation is different” is not
a waiver. Track task time, failed attempts, unintended geometry changes, lost intent
and export discrepancies. Screenshots alone do not establish connector quality.
