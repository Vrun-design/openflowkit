# State

Plan: [docs/plan/README.md](docs/plan/README.md). Phases 0–4, one month, no gates.

## Now
- Phase 1.2 + 1.3 done 2026-09-21 (Muse Spark, `p1-camera-pointer`,
  stacked on `p1-feel-probe`): camera + pointer pipeline.
- 1.2: `normalizeWheelDelta` (lines×16, pages×viewport); ⌘0 fit,
  ⌘1 100 % (⇧1 removed, labels updated); Safari gesture pinch; no
  inertia exists (nothing to remove); revision unchanged by camera ops.
- 1.3: coalesce to latest point; transform math+preview once per rAF;
  release point commits on pointerup; Escape cancels the queued frame;
  bar follows via direct DOM — 0 React renders mid-drag, verified live.
- Probe @512 (2 runs): p50 119–307 ms, p95 365–388 (≤16 FAIL);
  dropped 151–152/3 s (0 FAIL); drift 0 px PASS; line-wheel 48 px now.
- Bottleneck is SwiftShader compositing (~100 ms/frame), not app JS
  (trace: no task >20 ms; canvas hidden → 25 Hz, 6 ms delay). Owner
  re-runs on real GPU. Readings: probe keeps the harder 512 bar for
  the 200-node check; capture fallback kept (Chrome trackpad bug).

## Next
- Phase 1.4 (unclaimed). Phase 2.1 grammar.md — Claude (Opus 5),
  `p2-grammar`; owner reviews before parser code.

## Later
- Phase 5 (month 2): `docs/plan/phase-5-architecture.md` — C4 model layer +
  flows + discover/drift. Structurizr Cloud EOL 30 Sep 2026 = launch window.

## Done
- 2026-09-21: Phase 0 + v2 shell (boot `/`, green gate, frozen specs).
- 2026-09-21: 1.1 feel probe (`scripts/feel-probe.mjs`, headed Chromium).

## Feel bugs (→ 1.4+; check-v2-polish stale: Settings is in canvas menu)
- 512-node drag still ~370 ms p95 here — compositor-bound, re-probe on GPU.
- Gesture pinch only testable via synthetic events (no Safari here).
