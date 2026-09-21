# ADR-001: Free connector endpoints are exclusive-or with bound endpoints

Accepted: 2026-09-20 (V2-01b spike).

`ConnectorEndpoint` gains `point: Point2d | null` (page coordinates) and
`nodeId` becomes `string | null`. Exactly one is set: free ends require a
point with null port/anchor; bound ends require a null point. The pair is
validated, never inferred.

- Additive within schema v1: pre-spike payloads omit `point`, which reads as
  null. No migration rewrite; writers always emit it explicitly.
- Projection resolves free ends to their point and bound ends exactly as
  before through one code path; missing data yields null geometry, never a
  partial path.
- Out of scope: dragging a bound end onto empty space to detach (V2-06
  interaction), renderer handles for free points (V2-06 adapters).
