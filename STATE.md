# State

Plan: [docs/plan/README.md](docs/plan/README.md). Phases 0–4, one month, no gates.

## Now
- Phase 1.1 feel probe done 2026-09-21 (Muse Spark, `p1-feel-probe`):
  `V2_BASE_URL=… node scripts/feel-probe.mjs` (headed Chromium).
  Evidence: `docs/evidence/feel/2026-09-21T05-2*.json` (2 runs).
- Numbers @ 512 nodes (⌘A/⌘D doubling ≈ 500): p50 ~285–290 ms,
  p95 ~373–417 ms (target ≤ 16); dropped 159–163 frames / 3 s drag
  @ 3.6 fps, 125 Hz attempted → 3.6 Hz delivered (target 0);
  zoom drift 0 px / 20 pinch steps (target ≤ 1) PASS.
- Repeatability: p50 ±2 %, dropped ±3 %, drift identical;
  p95 ±11 % (n≈11 moves/drag — small-sample noise under saturation).
- Machine: SwiftShader software GL; owner must re-run on real GPU.

## Next
- Phase 1.2/1.3 (unclaimed): feel bugs below. Phase 2 → 2.1
  (grammar.md, owner reviews before parser code).

## Later
- Phase 5 (month 2): `docs/plan/phase-5-architecture.md` — C4 model layer +
  flows + discover/drift. Structurizr Cloud EOL 30 Sep 2026 = launch window.

## Done
- 2026-09-21: Phase 0 + v2 shell (boot `/`, green gate, frozen specs).

## Feel bugs (owner's daily test → 1.2/1.3)
- Drag of 512 selected nodes costs ~290 ms/move on main thread; no
  coalescing (`getCoalescedEvents`), preview per queued move — death spiral.
- Line-mode wheel not normalised: 3 lines → 3 px pan (expect ~48 px).
- Pixel pinch/wheel zoom anchored exactly (0 px drift) — keep.
