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
- unknown fields are preserved opaquely through migrate/serialize; newer
  schemas open read-only via `reason: 'newer-schema'` and are never edited
  (see `docs/plan/README.md` §4 Architecture).
- the legacy projection stores a recovery snapshot so V1 JSON files import losslessly.
