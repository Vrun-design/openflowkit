# ADR-003: Preserve unknown fields; open newer schemas read-only

Accepted: 2026-09-20 (V2-01a).

- Unknown fields at any level validate silently and round-trip byte-identically
  through migrate, serialize, and re-migrate. They are preserved opaquely, not
  interpreted. Namespaced `extensions` remain the convention for new data.
- `migrateSceneDocument` returns `reason: 'newer-schema'` with the preserved
  bytes for documents above `SCENE_DOCUMENT_VERSION`. Hosts open those
  read-only with an explicit version status. They never edit, validate, or
  re-save them as the current version.
- Corrupt payloads return `reason: 'invalid'` with path issues. The two
  failures are distinct because their recoveries are opposite: repair versus
  hands-off.
