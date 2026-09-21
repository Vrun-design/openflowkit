# State

Plan: [docs/plan/README.md](docs/plan/README.md). Phases 0–4, one month, no gates.

## Now
- Phase 0 done (2026-09-21). `/` boots the canvas; typecheck/lint/test green;
  knip reports nothing unused in `src/` beyond the intentional keep-list
  (`agent/index.ts` is the MCP bundle entry, `iconAssetCatalog.ts` waits for
  phase 4). Phase 1 and Phase 2 are unclaimed — take 1.1 / 2.1.

## Next
- Phase 1 (hands) and Phase 2 (brain) start in parallel the moment phase 0 is
  green. Phase 1 → `docs/plan/phase-1-hands.md`, 1.1 first.
- Phase 2.1 grammar spec written 2026-09-21 (Claude Opus 5, branch `p2-grammar`,
  `docs/plan/grammar.md`): WAITING FOR OWNER REVIEW. 2.2 (parser) must not start
  until reviewed. Open decisions for owner: canonical expands chains/fans to one
  edge per line; keywords lowercase-only; dropped lines = `warning` not `error`;
  unknown attrs kept verbatim (not dropped like Koboyo).

## Later
- Phase 5 (month 2): `docs/plan/phase-5-architecture.md` — C4 model layer +
  flows + discover/drift. Researched 2026-09-21; grammar reservations added to 2.1.
  Structurizr Cloud EOL 30 Sep 2026 = launch window for import + Show HN.

## Done
- 2026-09-21 (Claude): Phase 0.2–0.5. Deleted ~170k lines of V1 (React Flow,
  store, hooks, components, collab, i18n, benchmarks, legacy storage/export).
  Kept `src/theme/` (Pixi colour resolvers) and moved the mermaid family
  parsers to `src/services/mermaid/families/`; mermaid/ELK helpers inlined in
  `src/lib/{sectionBounds,nodeSize,edgeCurve}.ts`. Agent `exportAgentDocumentPage`
  now returns canonical page nodes/connectors (phase 4 emits DSL). knip needs
  zod 4 so it cannot run inside this repo (zod pinned to 3): run it from a
  scratch dir with `--directory`.
- 2026-09-21 (Codex): v2 shell refreshed: upper-left tools, workspace rail,
  AI/slides/code previews, left layers, bottom view/history, shortcuts, welcome.
  Follow-up: full-height edge panels, simplified controls, curved guidance
  arrows, larger copy; accessibility text hidden and assistant scroll fixed.
  Bottom controls grouped; canvas/view hint restored; logo replaced by canvas
  menu (rename/settings/export), title spacing tightened. Browser check green.
  Existing actions retained; new features are UI drafts. Typecheck/lint green,
  2,324 unit tests and headed shell check pass; light/dark/mobile inspected.
- 2026-09-21: v2 spec set frozen to `docs/frozen/`; plan written; root pointer
  docs removed. Koboyo research recorded in the plan §2.

## Feel bugs (owner's daily test)
- (none yet)

## Feel probe targets (phase 1.1)
- p95 pointer→paint ≤ 16 ms @ 500 nodes; 0 dropped frames / 3 s drag; zoom drift ≤ 1 px.
