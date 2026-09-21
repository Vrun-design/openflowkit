# Delivery roadmap and release gates

Updated: 2026-09-20. Status: proposed execution order. No fixed launch date.
Deliver one reversible change set at a time; review evidence before expanding.
The phase names describe outcomes, not separate teams or permission to batch PRs.

See [product strategy](product-strategy.md) for competitive research and the rebuild
decision. Alongside V2-00 discovery, test one bounded source-backed diagram workflow
with design partners using existing infrastructure. This research prototype is not
a new production editor or approval to add every proposed technical feature to v2.
Feed evidence into V2-01's source-reference/view-identity design and subsequent scope.

## Sequence

| Phase | Outcome | Change sets | Exit |
| --- | --- | --- | --- |
| 0 — Evidence and contracts | Know what must survive and what good feels like | V2-00–01 | Fixture manifest, measured baseline, migration/schema decisions |
| 1 — Trustworthy vertical slice | Create, connect, edit, save, reopen, undo, export | V2-02–04 | A small real diagram survives the complete loop without legacy write-back |
| 2 — Excellent everyday editing | Direct manipulation and connectors handle real revisions | V2-05–07 | J1 and interaction gates pass; routing spike accepted |
| 3 — Differentiated workflow | Native Mermaid and design-system-aware technical diagrams | V2-08–09 | J2 passes on the supported corpus with transparent fidelity reports |
| 4 — AI as an editing method | External agents and BYOK proposals use the same complete operation surface | V2-10–11 | J3/J4, file/live modes, and deterministic evaluations pass |
| 5 — Production readiness | Compatibility, offline, export, hardware, accessibility | V2-12–13 | All cutover gates pass; remaining limitations documented |
| 6 — Retirement | Default flip, observation, then remove obsolete ownership paths | V2-14–15 | Customer access and recovery remain intact; dependency audit passes |

External-agent requirements are specified in [agent-native-spec.md](agent-native-spec.md).
Future Pro and hosted operations are planned separately in
[the Pro, business, infrastructure, and agent platform plan](pro-business-and-platform-plan.md).
Billing is not a dependency of the v2 editor; document records must not encode plan
names or require entitlement service availability.
Legacy GitHub/API/infra/DSL/collaboration features are quarantined under
[the replacement policy](legacy-feature-quarantine.md). They are not reusable
roadmap completion and no estimate may credit them before their new gates pass.
P-08 and J4 are release blockers. Operation coverage starts in V2-01/02 and grows
with every feature, rather than being retrofitted in phase 4.
UI modernization and debt retirement are specified in
[ui-and-debt-plan.md](ui-and-debt-plan.md). P-09 is a release blocker and applies
to every vertical slice; UI work is not deferred to production-readiness polish.
Model routing and handoff rules are specified in
[the model-assisted execution strategy](model-assisted-execution.md). Astra leads
high-leverage design/difficult integration, Sol handles most bounded implementation,
and Opus provides independent critique. Model output never waives a gate.

Text, accessibility, persistence, and performance checks apply from phase 1.
Phase 5 broadens and verifies them; it does not introduce them for the first time.
One simple Mermaid fixture and one mocked AI action should exercise the canonical
contracts in phase 1, even though the complete interfaces arrive later.

## Change-set backlog

Flags below are **proposed**, not existing environment variables. `v2Editor` is
the umbrella opt-in gate for `/v2`; capability flags stage incomplete UI within it.
Disabling a UI flag must not make already-created records unreadable/exportable.
Each row names likely files/areas; before code, enumerate exact touched files in
the change-set record. All paths prefixed with `oc/` mean `src/opencanvas/`.

| ID / dependencies | Work and likely files | Gate / acceptance | Rollback |
| --- | --- | --- | --- |
| V2-00 / none | Baseline inventory, permissioned fixture manifest, customer pain-point research, UI/navigation/component audit, legacy dependency/writer/duplication map, establish current status; `docs/v2/`, `docs/v2/implementation-status.md`, existing benchmark/e2e suites | No runtime flag. Hash fixtures; record current pass/fail and browser/hardware; identify legacy families/assets/workflows; capture the debt metrics and representative UI task baseline defined in the UI/debt plan. | Documentation/fixture revert; no user data changes. |
| V2-01 / 00 | Versioned typed content, endpoint and parent-coordinate spike, migration fixtures; `oc/domain/document/`, `oc/domain/connectors/`, `oc/domain/geometry/` | `v2Editor` off. Validate schema v1→v2 copy, unknown fields, future versions, free endpoints, rotated boundaries, command inverses; record accepted ADRs. | Keep v1 authoritative; remove experimental callers, retain source snapshots. |
| V2-02 / 01 | Canonical session/store and commit service with revisions plus automated v2 dependency boundaries; `oc/application/`, `oc/domain/commands/`, `oc/application/history/`, architecture checks | `v2Editor`. No legacy round trip/direct record write in a v2 edit; undo/redo and stale-command rejection work; manual, mock agent and import operations use the same path; forbidden imports fail CI. | Disable route; no mutation to v1 workspace. |
| V2-03 / 02 | Isolated durable v2 repository, ordered autosave, minimal recovery and JSON/SVG export; `src/services/storage/`, `oc/infrastructure/export/` | `v2Editor`. Save/reopen, quota failure, interrupted write, and multi-tab revision conflict tests; original v1 source hash unchanged. | Keep v2 records and standalone export accessible; reopen untouched v1 originals. |
| V2-04 / 03 | First production v2 route and entirely new shell/design-system foundation: accepted spatial direction, normalized tokens, document/save status, compact creation toolbar, contextual selection bar, basic shapes/text, select/move, simple bound connector, DOM text edit, semantic tree; route entry, shared UI, `oc/presentation/`, Pixi | `v2Editor`. First-visit and create→connect→label→move→undo→redo→save→reload→SVG journeys pass; I-01–03, 06, 12–13, 24, 31–34; 1440×900/1280×800 canvas-area and framing budgets, keyboard/touch/200%-zoom, and complete component states pass. Visual review confirms it is not legacy shell composition with new styling. | Disable route exposure; retain v2 recovery/export path. |
| V2-05 / 04 | Transform, snapping, style bar, clipboard, groups/frames, lock/hide and ordering; `oc/domain/transforms/`, `oc/application/`, `oc/presentation/`, shared UI | `v2Editing`. I-04–11 and 21 including rotation, nested transforms, asset ID remapping, cross-page copy; save/export each feature. | Hide unfinished actions; readers retain their records; retain prior v2 build. |
| V2-06 / 05 | Binding lifecycle and complete direct connector editing; `oc/domain/connectors/`, `oc/presentation/`, `oc/infrastructure/pixi/` | `v2Connectors`. I-13–20 and I-27–30: free/fixed/dynamic/port, every supported outline, quick-create, reconnect, multiple labels, markers, curve/segment/waypoint edits, loops, parallel/reverse edges, bridges, dense hit testing, insertion, keyboard/touch/agent parity; accepted FigJam/Miro reference-task benchmark has equal or lower repair work. | Disable new controls, preserve endpoints/intent and older manual routes. |
| V2-07 / 06 | Router comparison spike then selected implementation; scoped routing/layout; `oc/domain/connectors/obstacleRouting.ts`, route interface/index, `src/services/elk-layout/` | `v2Routing`. Dense corpus and motion sequences; finite budget, explicit unresolved status, stable manual waypoints, measured interaction latency; J1. | Use baseline router with honest degraded status; preserve manual intent. Never silently rewrite saved paths. |
| V2-08 / 07 | Native icons/images and portable assets, technical shape vocabulary; `src/services/assetCatalog.ts`, storage asset modules, `oc/domain/`, Pixi/export adapters | `v2Assets`. Paste/drop/replace/copy/reload/export, missing-asset state, fresh-profile bundle restore; no online dependency for embedded assets. | Hide insertion, retain render/export support and asset bytes. |
| V2-09 / 08 | Neutral Mermaid IR, native flowchart conversion, theme/layout preview, support matrix; `src/services/mermaid/`, `src/services/elk-layout/`, `oc/application/` | `v2Mermaid`. I-22/J2; topology and editability assertions plus visual corpus; cancel leaves document unchanged; unsupported constructs retain source. | Disable native conversion entry; source + sanitized image option remains explicit. Imported native records stay editable. |
| V2-10 / 09 | Shared operation/action coverage and revisioned proposal engine; `src/agent/`, `oc/application/ai/`, `mcp-server/` | `v2Ai`. Schema/scope/lock/stale/dependency/idempotency tests, atomic accept and inverse; manual and agent results equivalent. | Disable AI entry points; all accepted records remain ordinary editable objects. |
| V2-11 / 10 | BYOK selection workflow and provider capability handling; `src/services/aiService.ts`, `src/store/aiSettingsPersistence.ts`, settings and proposal UI | `v2Ai`. I-23/J3; context preview, cancellation, failure recovery, explicit key persistence, compatible provider check, no secret leakage. | Disable new AI interface; manual editing and data remain available. |
| V2-12 / 11 | Basic ink, complete multi-page/export/offline behavior; `oc/presentation/`, canonical export, `src/services/storage/`, `public/sw.js` | `v2Editor` + staged capability gates. I-26; PNG/PDF/SVG/JSON/bundle; all supported content offline after readiness; service-worker upgrade does not break open documents. | Preserve old app assets and data; disable incomplete feature entry points; retain downloads. |
| V2-13 / 12 | Full compatibility, product-shell usability, visual consistency, responsive behavior and accessibility/performance qualification; `benchmarks/`, actual-route UI suites, fixture corpora, semantic tree, recovery UI | Opt-in cohort. I-01–26 in scope, P-09 UI journeys, manual AT/touch, narrow laptop/tablet, same-hardware GPU run, v1 compatibility report, WebGL recovery, J1–J4 customer sessions. | Keep v1 default and v2 opt-in; resolve blockers rather than waive data integrity or UX. |
| V2-14 / 13 | Make v2 default for supported workflows; retain version-aware v1 opening, originals, and recovery/export | `v2Default` off→on. All release gates below; staged cohort and an observation window covering save/reopen, upgrade, and backup/restore use. | Turn default back off; route v2 files to compatible v2 reader/export. Do not downgrade them. |
| V2-15 / 14 | Remove obsolete legacy ownership, old editor shell/inspector/components, white-label/design-system UI and store machinery, duplicate controllers, flags and dependencies after compatibility obligations close; store/hooks/bridges, React Flow imports, theme/design-system surfaces, UI/build config | Dependency/debt audit and all gates pass on fresh build; legacy themed documents retain supported appearance or explicit fidelity reports; zero legacy imports in the v2 production graph; no v1-only customer workflow remains without an accepted access plan. | Restore last compatible release/artifact; keep additive schema readers and backups. No destructive storage cleanup in this PR. |

Large rows are milestones within a slice family, not invitations to giant PRs.

V2-10 explicitly includes these required sub-slices: (a) capability manifest and
full authoring operation parity; (b) atomic file persistence and rendering;
(c) live-bridge feasibility, pairing and document grants; (d) revision-aware live
execution, change observation and reconnect; (e) visual feedback and file/live
equivalence tests. V2-13 validates J4 with actual local-capable Claude and Codex
clients and records product/version/transport. These are proposed integrations,
not verified current compatibility. V2-14 cannot pass with file-only MCP support.

Split V2-05/06/09/12 into individually reviewable behavior changes with suffixes
such as V2-06a. Do not implement an unrelated new feature while another slice's
data integrity or interaction gate is failing.

## Required record for each implementation change

```text
change_id:
problem and user-visible result:
requirement IDs / dependencies:
existing implementation reused:
exact files touched:
feature flag and off-state behavior:
schema/data impact:
acceptance cases and observed results:
commands run / revision / environment / evidence paths:
rollback procedure and verified result:
remaining limitations / next slice:
```

Before a schema-affecting change, additionally record input/output fixtures,
migration idempotence, asset retention, future-version handling, and why the
previous app cannot accidentally open/write the new format. Keep accepted ADRs
for document ownership, connector representation, coordinate conventions, router,
text layout, source synchronization, and compatibility retirement.

## Validation gates

For each code slice: typecheck/build and lint pass; targeted tests pass; affected
diagram-family regressions pass; actual-route browser acceptance passes for UI
changes; flag-off/rollback is exercised. Use existing scripts where applicable:

```sh
npx tsc -b --pretty false
npm run lint
npm run build:ci
npm run test -- --run <targeted-test-paths>
npm run test:opencanvas:editor-surface
npm run test:opencanvas:recovery
npm run test:mermaid:gold
npm run eval:agent
```

The final four are scope-dependent and currently exercise existing infrastructure;
extend them or add a v2 actual-route suite rather than presenting v1 success as
v2 evidence. Run a broader suite when shared contracts change. Record baseline
failures explicitly; do not silently treat them as new-change passes.

Performance: `npm run bench:browser:hardware` and the corresponding check script
require a suitable clean committed worktree and real GPU. CI software WebGL checks
lifecycle, not production rendering speed. Add connector/text-heavy variants to
existing 100/300/1,000-node fixtures; record warm/cold import, p95 input latency,
frame work, route settle time, save time, heap trend, and retained textures/assets.
Five repetitions on the same browser/hardware establish variance before enforcing
new budgets. Keep the current bundle check; set a measured v2 budget in V2-00.

## Default flip and deletion gates

All must pass; a calendar date or elapsed release count is insufficient.

- No silent loss in the agreed legacy/native fixture corpus; unknown content and
  original files survive conversion. Required legacy editing remains accessible.
- J1/J2/J3/J4 pass; core operations work without AI, account, or application backend.
- Every shipped authoring operation has agent coverage. External agents can inspect,
  edit, render, and save in both file and live modes under explicit grants; real-
  client interoperability and concurrent human/agent editing gates pass.
- Save/reopen, multi-tab conflict, crash recovery, quota failure, bundle restore,
  offline readiness, and app upgrade tests pass.
- DOM/Pixi/export text and geometry agree within documented tolerances; no clipped
  supported labels, broken bindings, or invisible objects on the corpus.
- Browser/device, manual accessibility, and hardware performance gates pass.
- Deterministic AI safety and action equivalence tests pass; provider limitations
  and context transmission are visible to users.
- Existing users complete research tasks; severe friction has an owner and fix.
  Record cohort size, observation period, failures, and support feedback.
- React Flow imports and legacy writers are audited before deletion. Keep the
  legacy import adapter, future schema migrations, canonical recovery, and useful
  renderer projections. Removing adapter filenames is not itself success.

## Risk register

| Risk | Early signal | Response / exit evidence |
| --- | --- | --- |
| Schema rewrite strands current customers | Fixtures need opaque fallback or users still edit family data in v1 | Preserve source and v1 access; scope conversion honestly; block retirement. |
| Router remains visually unstable | Path flips during small moves or manual intent disappears | Motion corpus, deviation penalty, bounded router spike; do not hide failures with global relayout. |
| Text undermines the entire canvas | Overlay, Pixi, and SVG wrap differently | Shared line-layout output; fonts/IME/RTL tests early. |
| Two editors become permanent maintenance | New features keep landing in both | v1 fixes for customer breakage only; one v2 controller; retire by measured compatibility. |
| “AI-native” becomes whole-document regeneration | Unselected IDs/geometry change | Scope-enforced operations and proposal diffs; identity preservation evaluations. |
| Local-first is mistaken for guaranteed durability | Saved status without successful transaction; missing assets offline | Failure injection, explicit storage state, portable backups and restore tests. |
| UI minimalism hides essential controls | Users cannot discover reconnect/numeric edits without coaching | Contextual affordances plus accessible details; observe task sessions. |
| Scope returns to the old broad backlog | Tables/templates/family editors delay core-loop completion | Require a target journey and acceptance ID for every launch feature. |

## Capacity and immediate next work

Owner has no hard launch date; team capacity is unconfirmed. Do not turn the
original three-month guess into a commitment. Estimate each next slice only after
the previous gate exposes actual costs; track cycle time and integration rework.
If working solo with AI assistance, keep one active implementation slice. Extra
contributors can take independent fixtures/research only after contracts are stable.

For a single full-time owner using GPT-6 Astra, GPT-5.6 Sol and Claude Opus under
[the model-assisted strategy](model-assisted-execution.md), use 12–16 weeks as the
private-beta planning range, 18–26 weeks for a candidate default replacement, and
22–32 weeks through gated legacy deletion. Reforecast after V2-00, V2-04, V2-07 and
V2-13 using observed cycle time and rework. Quarantined source-sync/DSL replacements
and future collaboration are outside this range unless they replace other scope.

Start V2-00: collect a small representative legacy/Mermaid/connector corpus, run
the existing production baseline, and choose the reference tasks and hardware.
Then V2-01 proves the highest-risk contracts. The first working demo should be
two labeled shapes with a bound connector, saved and reopened from v2 storage,
with undo and export—not a toolbar mockup or a wide set of unfinished tools.

## Current evidence

Record completed work and observed validation only in
[implementation status](implementation-status.md). This roadmap defines future
work; it is not a duplicate shipment or test log.
