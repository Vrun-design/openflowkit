# OpenFlowKit v2 — Pro, business, infrastructure, and agent platform plan

Updated: 2026-09-20. This is a planning decision record, not launch scope or a
revenue forecast. It assumes the editor remains local-first, useful without an
account, free at its core, and controllable through users' own agents and keys.

## Executive decisions

1. Do not create a second editor or a private Pro fork. Build one open editor,
   one document format, and one operation protocol.
2. Keep the present monorepo while v2 is built. Split an optional hosted control
   plane into a private repository only when paid pilots require it.
3. Keep Cloudflare as the low-cost deployment target. Static free usage must not
   call a paid service. A future Worker and D1 database should hold accounts,
   entitlements, and billing events only; documents remain local by default.
4. Make MCP the broad agent integration. Add thin, tested setup adapters for
   specific clients. Do not build a separate diagram API for every model vendor.
5. Keep excellent manual canvas behavior, Mermaid, local files, core exports,
   BYOK, and complete basic agent editing free. Charge for repeatable professional
   workflows, team controls, hosted convenience, and support.
6. Do not build billing yet. Establish the capability boundary, telemetry plan,
   pricing interviews, and entitlement interface while the v2 core is designed.

## The business thesis

OpenFlowKit should not sell “AI makes a diagram.” That is becoming a commodity.
The stronger job is:

> Turn software truth into an editable visual model, keep human layout intent
> through change, and let any authorized agent inspect, update, verify, and
> explain it.

```text
repo / API / infra / Mermaid
          ↓ deterministic extraction
evidence-backed system model
          ↓ agent proposes a scoped change
native editable canvas
          ↓ human adjusts layout and meaning
stable refresh / review / presentation / export
```

Each piece has competitors. The combined workflow can be valuable if it preserves
identity and manual edits, explains where relationships came from, and updates
small affected regions instead of regenerating a picture. That reliability is
the differentiation. A long feature list is not.

The 770 GitHub stars are credible discovery evidence. They do not establish
weekly retention, team adoption, or willingness to pay. Treat them as a warm
audience for interviews and an early-access cohort.

## Free and paid boundaries

The free promise must remain complete enough that it is not a demo.

| Tier | Recommended capabilities | Cost model |
| --- | --- | --- |
| Free / open core | Full manual canvas; excellent connectors; shapes, text, pages and layers; local/offline documents; editable Mermaid; core technical icons; PNG/SVG/PDF/JSON/bundle export; local MCP and documented operation schemas; basic source import; BYOK; no watermark | Static hosting and users' own compute/model keys |
| Builder Pro — validate at roughly $12–20/month | Source-backed multi-view models; stable incremental refresh; architecture diff/review; advanced repo/API/infra adapters; reusable rules; presentation sequences; advanced video export; larger local automations; priority support; optional encrypted backup later | Mostly local execution; entitlement checks; optional storage within limits |
| Team — validate at roughly $20–30/user/month or a small-team base price | Shared architecture catalog; repository/CI refresh; PR diagram checks; review/approval; policies; team style packs; role controls; audit history; shared source mappings | Paid control plane and CI usage; customer-owned compute where possible |
| Enterprise — quote | SSO/SCIM, audit export, private networking, self-hosted control plane/runner, security review, support SLA and procurement | Contract covers support and dedicated infrastructure |

These prices are interview anchors, not published commitments. Do not meter
shapes, connectors, ordinary local files, or basic MCP tool calls. Do not make a
document unreadable when a subscription ends. On downgrade, paid automation stops
and paid metadata remains readable and exportable.

Hosted model inference can be added later as convenience with explicit quotas or
usage credits. It should not replace BYOK or external-agent access, and it should
not be the only reason Pro exists.

## What Pro should sell first

The first paid wedge should target working engineers and small platform teams:

1. Import a supported repository or specification.
2. Generate an editable, source-linked architecture view.
3. Move, style, annotate, and correct it manually.
4. Refresh after a commit while retaining stable IDs, layout, annotations, and
   deliberate connector routes.
5. Review the architecture change in a pull request or exported artifact.

Start with inputs that can be extracted reliably: OpenAPI, AsyncAPI, Terraform,
Kubernetes manifests, Docker Compose, package/module graphs, and explicit service
manifests. Add language-specific call graphs only with measured precision. Mark
facts as `observed`, `inferred`, or `manual`, include source revision and evidence,
and never silently delete uncertain objects.

Do not promise “understands any codebase.” The product becomes trustworthy by
being explicit about supported evidence and uncertainty.

All existing implementations of these workflows are quarantined. “Start with”
means build and prove new versioned import/reconciliation contracts and corpora; it
does not mean expose the current GitHub, OpenAPI, infrastructure-sync or DSL paths.
See [the legacy replacement policy](legacy-feature-quarantine.md).

## Differentiation scorecard

| Candidate | Market strength | Feasibility | Decision |
| --- | --- | --- | --- |
| Miro/FigJam-level editing and connectors | Required for credibility, weak as a headline | Hard but controllable with the v2 interaction plan | Build as the foundation |
| Mermaid to beautiful native objects | Good acquisition and activation path | High if support remains explicit | Build early; preserve source and editability |
| Bring any agent | Valuable distribution, increasingly common | High through one MCP/action contract | Core requirement, free |
| GitHub/repo to diagram | Useful but already competitive | Medium for narrow formats, low for arbitrary repos | Narrow scope; compete on evidence and refresh quality |
| Stable source-backed refresh | Strong professional value | Medium-hard; requires identity and merge semantics | Primary paid hypothesis |
| Model once, produce several views | Strong for architecture teams | Medium after canonical semantic model | Primary differentiation |
| Architecture change review in CI/PRs | Clear recurring team workflow | Medium; can use customer CI compute | Strong Team hypothesis |
| Presentation and video from the same model | Strong demonstration and communication layer | Medium after camera/timeline model | Build after core model quality |
| Generic templates, whiteboards, and broad collaboration | Crowded and expensive | High ongoing breadth cost | Do not use as the wedge |

The proposed differentiators are strong enough to test, but they are not proven
or individually unique. The reliable source-to-edit-to-refresh loop is the bet.
Interview evidence and repeat usage decide whether it earns Pro investment.

## Agent platform: build once, connect broadly

MCP is an open standard supported by a broad set of clients. OpenAI's current
documentation says Codex can connect to external MCP servers; Anthropic documents
MCP across Claude Code, Claude.ai and Claude Desktop; Google's Gemini CLI supports
stdio and remote MCP configuration. See [MCP introduction](https://modelcontextprotocol.io/docs/2026-07-28/getting-started/intro),
[OpenAI Codex MCP documentation](https://developers.openai.com/codex/mcp/),
[Anthropic MCP documentation](https://docs.anthropic.com/en/docs/mcp), and
[Gemini CLI MCP setup](https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/mcp-server.md).

```text
canonical editor operations and capability manifest
                         ↑
          local file service + paired live bridge
                         ↑
     MCP stdio / MCP HTTP + optional REST/CLI adapter
                         ↑
 Claude, Codex, ChatGPT, Gemini, Cursor, IDE agents, future clients
```

The client compatibility matrix should record exact version, transport, install
steps, authentication, approvals, resources, image/render return, cancellation,
timeouts, and known schema differences. Offer one-click or copyable setup recipes,
but keep the protocol implementation shared.

Do not commit to bespoke “Meta Muse,” Grok, Claude Cowork, or ChatGPT Work
connectors until the named product exposes a stable integration surface and users
request it. First test whether the existing MCP server works. Add an adapter only
for a documented platform gap. OpenAI has also changed its own server-side Codex
integration: current documentation distinguishes connecting Codex to external MCP
servers from exposing Codex through its experimental App Server. This is why the
OpenFlowKit domain contract must not depend on one agent's protocol.

## Where Jev may help

TypeSafe's Jev is a decision model, not the diagram-generating engine. Its
documented shape is useful for cheap, frequent typed decisions: classify an
import, score confidence, decide whether a source relationship needs review,
route a task, or flag that an agent proposal is off-scope. The public Foreman
experiment also warns that accuracy is unproven and requires calibration.

Use Jev only behind a provider-neutral `DecisionService` and only after an offline
evaluation beats deterministic rules and a baseline classifier on cost, latency,
calibration, and false-action rate. It must never be the authority for destructive
document edits, billing entitlements, or source truth. Failure must degrade to a
rule or a request for review. See [TypeSafe Jev documentation](https://docs.typesafe.ai/)
and the explicitly experimental [Foreman integration](https://github.com/thruwire/foreman).

## Repository and deployment strategy

### Now: keep one public monorepo

The repository already contains the editor, marketing site, docs site, and MCP
package, and Cloudflare is configured as three static projects. Keep this shape
through v2. Separate deployable projects are enough; separate repositories would
make shared document/action contracts harder to evolve.

Recommended public structure over time:

```text
apps/editor             static local-first application
apps/web                marketing
apps/docs               documentation
packages/document       schema, migrations, validation
packages/kernel         commands, transactions, history
packages/agent          capabilities and action schemas
packages/render         Pixi and export projections
packages/ui             the new v2 design system
packages/mcp            local file/live bridge server
```

Move into this layout incrementally. Folder movement is not a milestone by itself.

Use separate Cloudflare projects and domains from the same repository:

- `app.openflowkit.com`: static editor; free operation has no runtime API need.
- `openflowkit.com`: marketing and checkout entry.
- `docs.openflowkit.com`: documentation and agent setup recipes.
- Future `api.openflowkit.com`: entitlement/account Worker only.

Replace dashboard-only deployment knowledge with versioned CI configuration when
v2 deployment work starts. Require preview deploys, production environment gates,
rollback to the prior artifact, scoped Cloudflare tokens, and independent deploys
so a docs or marketing failure cannot block the editor.

### Later: isolate the commercial control plane

When a paid pilot is approved, create a small private `openflowkit-cloud`
repository if the hosted/licensing code is proprietary. It may contain:

- billing webhook ingestion and immutable event log;
- account-to-entitlement projection;
- signed license/entitlement token issuance and revocation;
- optional encrypted sync/backup metadata;
- team administration and audit APIs.

It must depend on versioned public contracts. The public editor must not import
private code or require this service to open, edit, save, import, or export local
documents. A locally verified signed entitlement with a reasonable offline grace
period avoids a server request on every launch. Never embed billing secrets in the
client.

## Minimal Pro infrastructure

```text
Paddle hosted checkout/customer portal
             ↓ signed webhooks
Cloudflare Worker → raw billing event + entitlement projection in D1
             ↓
short account session + signed offline-capable entitlement
             ↓
editor unlocks optional Pro capabilities
```

Paddle is the initial recommendation for a globally sold small SaaS because it is
a merchant of record and handles payments, subscription operations, tax, fraud,
and buyer billing support. Its published pay-as-you-go price is 5% + $0.50 per
checkout transaction with no monthly fee. Stripe may have lower direct processing
fees in some markets, including published India rates, but leaves more operational
and tax choices with the seller. Re-evaluate both for the company's legal entity,
customer geography, payout support, and expected volume before signing.

Cloudflare's current free Workers plan includes 100,000 requests per day. The paid
Workers plan starts at $5/month and includes 10 million requests/month. D1 is
available on free and paid plans, and R2 includes 10 GB-month free with no egress
charge. See [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/),
[Paddle pricing](https://www.paddle.com/pricing), and
[Stripe India billing/pricing](https://stripe.com/in/billing/pricing).

This allows a paid pilot to start near $0–5/month in platform cost plus transaction
fees if documents and inference stay local. Set CPU limits, budget alerts, indexed
D1 queries, webhook idempotency, daily backups, and explicit fail-closed behavior
for entitlement mutations. Do not add R2, Durable Objects, queues, vector databases,
hosted collaboration, or hosted AI until a measured workflow needs them.

Illustrative cost scenarios, excluding payment fees, observability, email, support,
and hosted inference:

| Stage | Architecture | Expected platform floor |
| --- | --- | --- |
| Free v2 | Three static sites + npm MCP | Existing static hosting; effectively no per-user application backend cost |
| Paid pilot | Worker + D1 + hosted checkout | Free allowances may cover it; budget $5–25/month with alerts |
| Early team product | Paid Workers + D1, optional small R2 | Usually tens of dollars until request/storage patterns prove otherwise |

These are architecture targets, not quotes. Recalculate from observed requests,
rows, storage, webhook volume, backups, and logs before launch.

## Security and privacy boundaries

- Free documents, repository inputs, API keys, and agent sessions stay local by
  default. Every transmission must name its destination and scope.
- Account identity and subscription state are separate from document identity.
- Billing webhooks are signed, idempotent, replay-safe, and retained as auditable
  events. Entitlements are derived from events rather than toggled manually.
- The local live bridge grants a named document and operation scope; it uses a
  short-lived pairing secret, origin checks, revision checks, and revocation.
- Source import redacts secrets before any model call. Evidence may point to files
  and ranges without copying private source into hosted analytics.
- Product analytics are opt-in or privacy-preserving and never include diagram
  contents, source code, prompts, keys, or exported images.

## Business validation before infrastructure

| Test | Audience | Evidence required | Spend gate |
| --- | --- | --- | --- |
| Activation | Starred users/current users | Can complete create→connect→edit→save and agent setup without help | Continue v2 interaction work |
| Source-refresh design partner | 5–8 engineers | Reuses the same model after real code changes; layout repair time beats current workflow | Build narrow semantic model |
| Paid intent | 15–20 target interviews plus preorder/pilot ask | Several buyers accept a concrete price for refresh/review, not generic enthusiasm | Build entitlement pilot |
| Team workflow | 3–5 teams | Diagram checks or reviews recur across multiple PRs/weeks | Add CI/team control plane |
| Hosted convenience | Existing active users | Measured demand for backup/sync/hosted AI and a sustainable gross margin | Add only the requested service |

Track activation, successful connector task, successful agent connection, first
source-backed diagram, refresh completed without regeneration, manual repair time,
week-4 retained projects, exports/shares, paid conversion, and support minutes per
account. Stars, raw generations, and signups alone are insufficient.

Low-cost growth should create reusable proof: real source-to-diagram demos,
comparison pages, agent-specific setup pages, public benchmark fixtures, technical
tutorials, and shareable example artifacts. Lead with “use your agent, own your
diagram” and “architecture that changes with your code,” then prove connector
quality rather than claiming broad feature parity.

## Sequencing with v2

No billing code belongs in the current v2 critical path. Add these checkpoints
without delaying connector/editor work:

1. During schema/kernel design, reserve optional capability and source-evidence
   metadata without embedding plan names in document records.
2. During agent work, publish the capability manifest and client compatibility
   harness. Complete file and paired live modes before vendor-specific polish.
3. During source-backed experiments, run the paid-intent tests above.
4. After v2 default gates pass and paid demand is concrete, implement a small
   entitlement spike behind an interface and fake provider.
5. Only then select billing provider, create the control-plane deployment, and run
   a paid pilot. Do not make existing local documents depend on it.

## Explicit non-decisions

- No promise of a $10 million valuation or revenue outcome. A path exists through
  recurring engineering/team workflows, but execution and retention determine it.
- No separate repository for the v2 editor.
- No hosted collaboration architecture merely to match Miro.
- No proprietary per-agent protocol.
- No Jev production dependency before calibration.
- No final Pro price or provider until interviews and legal/entity checks finish.
