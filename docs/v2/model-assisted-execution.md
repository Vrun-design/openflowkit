# Model-assisted v2 execution strategy

Updated: 2026-09-20. AI models accelerate design, implementation and review; the
roadmap contracts, repository state, tests, measured benchmarks and customer task
evidence remain authoritative.

## Recommended model roles

| Model/tool | Primary role | Do not use as sole authority for |
| --- | --- | --- |
| GPT-6 Astra in Codex | UX direction, three shell explorations, visual hierarchy, spatial composition, difficult interaction implementation, browser inspection, cross-cutting architecture and final polish | Declaring usability, accessibility, connector correctness, durability or customer acceptance |
| GPT-5.6 Sol in Codex | Day-to-day implementation, bounded refactors, tests, documentation, migration work, repetitive component completion and fixing review findings | Changing accepted product contracts or broadening scope without a decision record |
| Claude Opus 5 / Claude Code | Independent design critique, alternate interaction solution, specification attack, accessibility/edge-case review and selected implementation experiments | Editing the same files concurrently or approving its own implementation |
| Deterministic tools | Typecheck, lint, tests, screenshots, interaction benchmarks, performance traces, schema/corpus comparisons and release reports | Product taste or interpreting customer intent without human review |

Model names are routing defaults, not architectural dependencies. Record the exact
client, model identifier/version, date, prompt/task brief, input artifact, commit and
result for milestone work. If a model becomes unavailable, another model can perform
the role against the same brief and gate.

## Where models enter the roadmap

### V2-00: research and design direction

Use Astra as the primary design collaborator to create three materially different
editor-shell directions against the same realistic diagram and task list. Each must
include 1440×900, 1280×800, tablet, light/dark, panels open/closed, empty/import,
connector editing, agent proposal and failure states.

Give Opus the accepted brief and artifacts independently. Ask it to find hierarchy,
discoverability, density, accessibility, responsiveness and category-copying risks,
and to propose an alternative only where it finds a material issue. Do not tell it
which direction Astra preferred until its first critique is recorded.

Selection remains human-led and uses the design-system principles, canvas-area
budget, reference tasks and user sessions. Model preference is not a vote.

### V2-01 through V2-03: contracts and first durable core

Use Sol for bounded implementation slices. Use Astra for difficult schema,
transaction, migration and dependency-boundary decisions. Opus performs an
independent attack review of data-loss, stale-edit, recovery and rollback cases at
the milestone gate.

### V2-04 through V2-07: shell, editing and connectors

Use Astra for the production shell, direct-manipulation behavior, connector UX and
live browser iteration. Sol completes primitives, state matrices, tests and focused
fixes using the accepted tokens and patterns. Opus reviews the running build and
recorded FigJam/Miro reference tasks for friction and hidden edge cases.

No model may introduce a new component style while completing routine work. New
patterns require a design-system decision and replacement across all affected
states, not a local visual patch.

### V2-08 through V2-12: assets, Mermaid and agent workflows

Use Sol for deterministic import, operation coverage and corpus work. Use Astra for
complex integration and for making agent state understandable without adding heavy
AI chrome. Use Opus to attack unsupported-input reporting, privacy, permissions,
stale results and human/agent concurrency.

Quarantined GitHub/API/infra/DSL/collaboration features do not become valid because
a stronger model can rewrite them quickly. Their separate contracts and corpora in
[the quarantine policy](legacy-feature-quarantine.md) still apply.

### V2-13 through V2-15: qualification and retirement

Use Astra for whole-product visual coherence, interaction polish and cross-surface
review. Use Sol for defects and debt removal. Use Opus as an independent release
critic with no permission to waive failed gates. Real customers, accessibility
checks, hardware measurements, compatibility fixtures and recovery tests decide the
default flip and deletion.

## Safe multi-model handoff

One model owns one bounded change set at a time. Never ask multiple agents to edit
the same production files simultaneously.

Every handoff includes:

```text
change ID and objective
accepted specification and non-goals
starting commit and allowed files
reference artifacts and fixtures
feature flag / isolated storage boundary
acceptance commands and manual tasks
known failures and prohibited legacy dependencies
rollback procedure
```

The implementer produces a reviewable diff and evidence. A different model can
critique that diff, but fixes return to a single owner. This avoids blended changes,
lost decisions and reviews that merely agree with the generator.

## UI design loop

For each meaningful UI slice:

1. Give Astra the exact workflow, viewport matrix, design principles, existing
   accepted shell direction and current running screenshot.
2. Ask for two or three meaningful alternatives before code when the pattern is
   unresolved. Record why one is selected.
3. Implement one vertical state-complete slice in the real `/v2` route.
4. Inspect it live at required sizes and states. Capture screenshots and interaction
   traces from the running product, not a disconnected mockup.
5. Have Opus critique the accepted criteria and running evidence independently.
6. Use Sol to resolve bounded findings and complete state/accessibility coverage.
7. Run automated gates and the human reference task. Update the decision record.

Avoid open prompts such as “make it futuristic.” Prompts must contain the job,
spatial constraints, interaction states, anti-patterns, realistic data, reference
task and definition of done. Futuristic means fluid, context-aware and technically
precise, not decorative gradients, glass, glow or unfamiliar controls.

## Cost control

Use Astra selectively for high-leverage decisions and difficult end-to-end work.
Use Sol for the majority of implementation. Reuse stable task briefs and compact
artifact packs rather than repeatedly sending the entire repository. Keep model
work in the developer's existing subscriptions where their terms and clients allow;
API usage is a separate cost from ChatGPT or Claude subscriptions and must be
budgeted separately if automation requires it.

Do not put any of these model costs into OpenFlowKit's runtime infrastructure. They
are development costs. The released free product remains BYOK and agent-neutral.

### Subscription starting position

Two ChatGPT Plus accounts and one Claude Pro plan are sufficient for V2-00 and the
first implementation slices. They are separate usage/context pools; they do not
combine into one larger continuous agent, so use repository artifacts and the
handoff record rather than trying to share conversational memory.

Do not buy another model subscription at the start. In particular, Grok would add
another opinion and coordination surface before it resolves an observed bottleneck.
Use its free access for a bounded comparison only if a specific task merits it.

Review usage dashboards weekly. Spend more only when all are true:

1. included capacity blocks planned work repeatedly across at least three working
   days rather than once during an unusually large task;
2. compact contexts, bounded change sets and Sol/Astra routing have already been
   applied;
3. the blocked work is on the critical path and cannot move to offline tests,
   customer research or another independent slice; and
4. the incremental monthly cost is smaller than the demonstrated time loss.

If Claude review capacity is the bottleneck, upgrade from Pro to Max 5x before
adding a new vendor. If short intensive automation is the bottleneck, prefer a
capped API-credit budget. If Codex capacity is the bottleneck, use the account's
shown credit/reset option or upgrade path rather than assuming a second account
doubles a single task's usable context. Keep auto-reload off until a monthly cap is
explicitly accepted.

## Planning range with AI-assisted solo execution

These are elapsed full-time working ranges for one owner using the model routing
above. They include implementation, review and normal rework, not waiting for a
marketing launch date. Customer observation windows and discoveries can extend them.

| Outcome | Cumulative range | Included result |
| --- | --- | --- |
| V2-00 direction and evidence | 1–2 weeks | Baseline, corpora, competitor tasks, three UI directions, accepted shell and budgets |
| Durable v2 vertical slice | 3–5 weeks | New schema/kernel, isolated persistence, create/connect/edit/undo/save/reopen/export |
| Convincing editor alpha | 7–10 weeks | New design system/shell, core transforms, excellent direct connector editing and routing baseline |
| Private beta | 12–16 weeks | Assets, supported native Mermaid, agent operation coverage, BYOK, export/offline and migration evidence |
| Candidate default replacement | 18–26 weeks | Browser/device/accessibility/performance qualification, real-client agents, customer gates and staged observation |
| Legacy deletion window | 22–32 weeks | Default proven, compatibility obligations closed, old shell/store/React Flow and quarantined dead paths removed safely |

This is roughly four to six months for a serious default candidate and five to
eight months for safe cleanup with one committed owner working full time. Unlimited
tokens can reduce coding latency, but they do not remove interaction design,
browser/device testing, migration fixtures, customer sessions, reliability failures
or the observation period before deleting legacy behavior.

Quarantined GitHub/API/infra/DSL replacements and a new collaboration program are
not included in the default-candidate range unless deliberately substituted for
other scope. A narrow source-backed Pro pilot adds roughly 4–8 weeks after the core
semantic/evidence contract is chosen; broad repository understanding and production
collaboration are separate multi-month programs.

## Acceptance rule

Model-produced code or design is a proposal. It becomes roadmap progress only when:

- the change set stays within its declared scope;
- required tests and actual-route checks pass;
- the visual/interaction evidence matches the accepted brief;
- rollback is verified;
- unresolved limitations are recorded; and
- the milestone's required human/customer gate passes.
