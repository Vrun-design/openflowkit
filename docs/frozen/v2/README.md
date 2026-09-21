# OpenCanvas v2 — product and engineering plan

Updated: 2026-09-20. Status: current planning source of truth, not a shipment report.
Repository inspected at `e70e159`. Product decisions explicitly confirmed by the
owner: local-first, free core, no required backend, optional BYOK AI, Pro deferred,
and quality over a fixed launch date. Follow-up requirement: full external-agent
control, including users' own Claude/Codex clients. Other choices are recommendations.

## CTO recommendation

The original roadmap has the right ambition but is not yet a safe execution plan.
Keep Pixi, build excellent direct manipulation and connectors, and make Mermaid
and AI produce the same editable objects. Change the sequence: prove persistence,
migration, and one complete edit/save/export loop before expanding the tools.
Reuse verified kernels; replace legacy ownership and interactions incrementally.

The product to win with is **a local-first diagramming canvas for builders:
create by hand, paste Mermaid, or ask AI; refine everything directly**. Compete
on that complete workflow before pursuing the breadth of Miro or FigJam.

## Read in this order

| Document | Purpose |
| --- | --- |
| [Product and business strategy](product-strategy.md) | Research-backed rebuild decision, competitive overlap, builder differentiation, and revenue hypotheses |
| [Pro, business, infrastructure, and agent platform](pro-business-and-platform-plan.md) | Free/paid boundaries, differentiation, low-cost control plane, repository/deployment strategy, agent integrations, and validation gates |
| [Assessment](assessment.md) | What is sound, what is risky, and implementation evidence |
| [Legacy advanced-feature quarantine](legacy-feature-quarantine.md) | Untrusted GitHub/API/infra/DSL/collaboration baseline, replacement contracts, and proof ladder |
| [Model-assisted execution](model-assisted-execution.md) | Astra/Sol/Opus roles, roadmap timing, safe handoffs, UI iteration loop, evidence and cost controls |
| [Product requirements / PID](product-requirements.md) | Audience, scope, user journeys, success criteria, exclusions |
| [Interaction specification](interaction-spec.md) | Testable behavior for shapes, text, connectors, keyboard, and touch |
| [Technical design / TDD](technical-design.md) | Ownership, records, transactions, routing, Mermaid, AI, and durability |
| [External-agent-native contract](agent-native-spec.md) | Full capability coverage, file/live modes, autonomy, and real-client acceptance |
| [Design system](design-system.md) | Full v2 system redesign brief, spatial-density gates, retained brand seed, and token/component requirements |
| [UI and debt plan](ui-and-debt-plan.md) | New editor shell, reuse/retirement boundaries, and controls preventing new debt |
| [Implementation status](implementation-status.md) | Sole current execution record and next slice |
| [Delivery roadmap](delivery-roadmap.md) | Dependencies, bounded change sets, gates, rollback, and cutover |

PID here means project initiation brief; TDD means technical design document.
The interaction specification and release gates supply the test-first acceptance
cases. These documents are sufficient to start the first bounded discovery and
fixture slice; final schema and router choices still require the specified spikes.

## Planning precedence

This is the current specification set indexed by [docs/README.md](../README.md).
Superseded plans are archived and are not prerequisites or instructions. Current
user instructions take precedence; proposed technical decisions still require
their specified evidence/spikes. Product strategy does not automatically expand
release scope. No v2 runtime completion is implied by this documentation.

Start with V2-00 in the delivery roadmap. Record all tested behavior, remaining
gaps, and exact revisions in [implementation status](implementation-status.md).
See [archive policy](../ARCHIVE.md) for historical material handling.

## Decisions still needing evidence

- Obtain the three most frequent customer pain points and permissioned/anonymized
  examples of failed connector edits and Mermaid imports. Do not infer prevalence
  from the size of the codebase or the stated customer count.
- Confirm actual engineering capacity before estimating elapsed delivery time.
- Determine which existing family documents require continued v1 editing before
  any default flip. Preserving raw data alone is not equivalent to preserving use.
- Establish reference hardware and supported browser/device coverage in V2-00.
- Pro implementation is deferred, while its proposed feature boundaries,
  infrastructure, repository strategy, costs, and validation gates are defined in
  [the Pro and platform plan](pro-business-and-platform-plan.md). No current v2
  implementation slice depends on billing.
