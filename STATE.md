# State

Plan: [docs/plan/README.md](docs/plan/README.md). Phases 0–4, one month, no gates.

## Now
- Phase 1.6 done 2026-09-21 (Muse Spark, `p1-connect-polish`,
  stacked on `p1-live-routing`): connector editing polish.
- Midpoint drag adds a waypoint (ownership → hybrid); ⇧+endpoint-drag
  goes free; Delete removes; undo restores. All one step, all tested.
- Floating style bar on connector selection: start/end markers
  none/arrow/dot, solid/dashed, width, color (apply-on-commit).
- Parallel/reverse edges fan 12 px (endpoints pinned, canonical fan
  direction); self-loops exit top-right. Unit tests for both.
- Double-click edge → label editor at click; Enter with edge selected
  does the same. e2e/connector-polish: fan gap ≥10, label, delete,
  style — green. Probe unchanged (p95 ~410, compositor-bound).

## Next
- Phase 1.7 (unclaimed). Phase 2.1 grammar.md — Claude (Opus 5),
  `p2-grammar`; owner reviews before parser code.

## Later
- Phase 5 (month 2): `docs/plan/phase-5-architecture.md` — C4 model layer +
  flows + discover/drift. Structurizr Cloud EOL 30 Sep 2026 = launch window.

## Done
- 2026-09-21: Phase 0 + v2 shell (boot `/`, green gate, frozen specs).
- 2026-09-21: 1.1 probe; 1.2 camera; 1.3 pipeline; 1.4 handles; 1.5 routing.

## Feel bugs (→ 1.7+; check-v2-polish stale: Settings is in canvas menu)
- 512-node drag still ~410 ms p95 here — compositor-bound, re-probe on GPU.
- Gesture pinch only testable via synthetic events (no Safari here).
