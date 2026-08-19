# Connector Projection

This module converts canonical scene connectors into renderer-neutral geometry
and presentation. It does not draw, mutate the document, or depend on Pixi or
React Flow.

## Input contract

- endpoints resolve explicit anchors first, then port anchors, then the nearest
  transformed node boundary
- direct routes ignore waypoints
- polyline routes preserve authored waypoints
- orthogonal routes preserve authored waypoints or create a deterministic elbow
- bezier routes expose both a cubic command and samples for labels and markers
- labels use a normalized path ratio plus a world-space offset
- standard, class, ER, architecture, sequence, and condition semantics resolve
  to a shared stroke and marker presentation

## Output contract

`projectConnector` returns immutable path commands, polyline samples, label
geometry, and marker/stroke presentation. Renderers may consume the commands
directly, while hit testing and label placement can use the shared samples.

Missing endpoint nodes produce `null` instead of partial geometry. Unknown
legacy metadata remains preserved by the canonical document snapshot and is not
interpreted here.

## Boundaries

- domain: route and semantic projection
- infrastructure: Pixi drawing or React Flow adaptation
- presentation: interaction state, feature flags, and accessibility

## Editing contract

`editing.ts` owns renderer-neutral edit anatomy and immutable route updates.
Endpoints, waypoints, segments, and bezier controls share one handle vocabulary.
Direct segment edits become manual polylines, authored bezier controls persist as
waypoints, and reconnection clears stale geometry before automatic rerouting.
Each completed gesture produces at most one reversible `set-connector` command.

Renderers own visual handles and pointer capture, while presentation adapters own
tool state, keyboard behavior, and history dispatch. Self-loop policy, collision
avoidance, and adaptive curve tessellation remain later domain capabilities; they
must not be hidden inside a renderer.
