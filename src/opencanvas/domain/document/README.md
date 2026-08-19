# OpenCanvas Document Domain

Versioned, renderer-independent persisted contracts for OpenCanvas.

## Rules

- `format` and integer `schemaVersion` identify the canonical envelope.
- documents contain pages; IDs are unique within their owning collection.
- pages own ordered layers, nodes, and connectors.
- transient selection, hover, drag, measurement, and renderer caches never persist.
- core geometry uses the canonical geometry domain and radians.
- unknown provider data belongs in namespaced JSON `extensions`.
- loaded values are validated before use and migration never mutates its input.
- the legacy projection stores a recovery snapshot for exact fallback; it is not
  the React Flow rendering adapter planned for CS-004.

CS-003 does not change active persistence. Adoption requires the default-off
`openCanvasDocumentV1` rollout flag and a later adapter change set.
