# State

Plan: [docs/plan/README.md](docs/plan/README.md). Phases 0–4, one month, no gates.

## Now
- Phase 1.4 done 2026-09-21 (Muse Spark, `p1-quick-create`,
  stacked on `p1-camera-pointer`): hover handles + quick-create.
- Hover any node → 4 side `+` handles (screen-space); hovered handle
  inverts; drag from a handle previews from that side anchor.
- Drop empty → same-kind/size node at 1× gap on the drag axis, bound
  source-side→facing-side, selected, label editing open. Drop on node
  → nearest-side bind. Click on handle → same as empty drop. All one
  undo step. Drop back on source cancels (loops are 1.6).
- Domain: `connectors/quickCreate.ts` (+tests); commands batch
  port-ensuring (`buildQuickCreate/HandleConnectCommand` +tests).
- e2e/quick-create green: right-handle 200 px → 2 nodes, 1 edge
  right→left, editor focused. Probe: p95 357 ms, dropped 168, drift 0
  (compositor-bound, unchanged). No keyboard path in slice — open.

## Next
- Phase 1.5 (unclaimed). Phase 2.1 grammar.md — Claude (Opus 5),
  `p2-grammar`; owner reviews before parser code.

## Later
- Phase 5 (month 2): `docs/plan/phase-5-architecture.md` — C4 model layer +
  flows + discover/drift. Structurizr Cloud EOL 30 Sep 2026 = launch window.

## Done
- 2026-09-21: Phase 0 + v2 shell (boot `/`, green gate, frozen specs).
- 2026-09-21: 1.1 feel probe; 1.2 camera; 1.3 pointer pipeline.

## Feel bugs (→ 1.5+; check-v2-polish stale: Settings is in canvas menu)
- 512-node drag still ~360 ms p95 here — compositor-bound, re-probe on GPU.
- Gesture pinch only testable via synthetic events (no Safari here).
