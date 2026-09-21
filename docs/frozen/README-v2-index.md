# OpenFlowKit documentation — start here

Updated: 2026-09-20. This is the single entry point for current product and
engineering planning. The authoritative specification set lives in `docs/v2/`;
each document below owns one subject. Do not maintain another roadmap elsewhere.

## Current implementation plan

| Read | Authority |
| --- | --- |
| [Overview](v2/README.md) | Direction, confirmed constraints, and open decisions |
| [Requirements](v2/product-requirements.md) | Product scope and release journeys |
| [Agent-native contract](v2/agent-native-spec.md) | External-agent capability parity, file/live modes, permissions, and client gates |
| [Interactions](v2/interaction-spec.md) | User-visible behavior and acceptance cases |
| [Technical design](v2/technical-design.md) | Target ownership, schema, rendering, routing, persistence, import, and AI architecture |
| [Design system](v2/design-system.md) | Full UI redesign brief; Builder Orange retained, current code tokens are audit evidence only |
| [UI and debt plan](v2/ui-and-debt-plan.md) | New product shell, explicit reuse/deletion scope, architecture enforcement, and UI acceptance |
| [Delivery roadmap](v2/delivery-roadmap.md) | Change-set sequence, dependencies, validation, and rollback |
| [Implementation status](v2/implementation-status.md) | What has actually been inspected/tested/delivered and the next slice |
| [Product strategy](v2/product-strategy.md) | Competitive research and hypotheses for later builder features/business; not automatic launch scope |
| [Assessment](v2/assessment.md) | Dated baseline review; not a live completion checklist |

The latest direction includes a new core within the existing product, reuse of
verified Pixi/domain/services work, full external-agent control, local ownership,
free core, BYOK, and Pro deferred. Source-backed architecture maintenance and
review are differentiation hypotheses to validate; there is no fixed launch date.

## How to resolve ambiguity

Current user instructions take precedence. Requirements define scope; interaction
and agent contracts define behavior; technical design defines the proposed means;
delivery defines order; status records evidence. A strategy idea does not expand
release scope by itself. Recommendations needing a spike are not falsely marked
as accepted decisions. Resolve a real conflict in these documents before coding.

Implementation starts with V2-00 in the delivery roadmap. Updating these documents
does not mean v2 has shipped. Keep code-derived evidence separate from future work.

## Other documentation

- `docs-site/` contains public feature documentation. Its roadmap page points here;
  public feature claims do not establish v2 completion.
- [Cloudflare Pages setup](cloudflare-pages-setup.md) is an operational reference,
  not a product roadmap. Verify settings against the active deployment when used.
- Source/module READMEs and benchmark instructions are local implementation
  references. Verify dated statements against code rather than treating them as
  current rollout decisions.
- [Archive policy](ARCHIVE.md) explains preserved history. Archived content is
  excluded from normal agent work and is not required to execute this plan.
