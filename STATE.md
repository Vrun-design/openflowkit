# State

Plan: [docs/plan/README.md](docs/plan/README.md). Phases 0–4, one month, no gates.

## Now
- Phase 1.5 done 2026-09-21 (Muse Spark, `p1-live-routing`,
  stacked on `p1-quick-create`): live orthogonal routing.
- Router rewritten (12 px pad, per-lane spatial cull, conflict-driven
  detours): 1.65 → 0.14 ms/route @200 obstacles (budget 0.5).
- New connectors default orthogonal/automatic; manual waypoints
  preserved; reset returns to automatic. Corners render at 8 px.
- Endpoint drags bind discrete side ports with 10 px hysteresis;
  ports commit with the gesture (one undo step). Dangling side
  portIds resolve positionally in previews.
- e2e/live-routing green: 12 live samples circling an obstacle, no
  crossing, 0 side switches (≤4), ports intact. Probe: p95 ~340 ms,
  dropped ~155, drift 0 (compositor-bound, unchanged).

## Next
- Phase 1.6 (unclaimed). Phase 2.1 grammar.md — Claude (Opus 5),
  `p2-grammar`; owner reviews before parser code.

## Later
- Phase 5 (month 2): `docs/plan/phase-5-architecture.md` — C4 model layer +
  flows + discover/drift. Structurizr Cloud EOL 30 Sep 2026 = launch window.

## Done
- 2026-09-21: Phase 0 + v2 shell (boot `/`, green gate, frozen specs).
- 2026-09-21: 1.1 probe; 1.2 camera; 1.3 pipeline; 1.4 quick-create.

## Feel bugs (→ 1.6+; check-v2-polish stale: Settings is in canvas menu)
- 512-node drag still ~340 ms p95 here — compositor-bound, re-probe on GPU.
- Gesture pinch only testable via synthetic events (no Safari here).
