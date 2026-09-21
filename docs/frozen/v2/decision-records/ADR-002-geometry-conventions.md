# ADR-002: Single screen/world/local geometry service

Accepted: 2026-09-20 (V2-01d proof).

All coordinates transform through `oc/domain/geometry` plus
`oc/domain/scene/worldGeometry` (recursive parent multiplication). Conventions:

- Angles are radians; matrices compose scale, then rotation about the local
  origin, then translation.
- Gesture thresholds and hit targets are CSS screen pixels, converted once at
  the adapter boundary. Device-pixel ratio belongs to the renderer.
- `nodeWorldBounds` transforms all four corners, so rotated outlines bind and
  project against true geometry — never a generic axis-aligned rectangle
  unless that is the defined shape.
- DOM overlays, Pixi content, and exports must consume the same world
  geometry; any disagreement is a defect in the adapter, not the model.
