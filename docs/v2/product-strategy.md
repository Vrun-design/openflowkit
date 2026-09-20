# OpenFlowKit: rebuild decision, differentiation, and business strategy

Research date: 2026-09-20. Recommendation, not an approved expansion of launch
scope. Owner priorities: a free local-first product, complete agent access,
excellent authoring, technical depth, and eventually a substantial business.
There is no fixed deadline. Active usage, retention, current revenue, team capacity,
and willingness to pay were not supplied; commercial conclusions are hypotheses.

## Executive decision

Build a new canonical editor core within the existing product, keep Pixi unless
measured evidence rejects it, and reuse tested infrastructure. Do not restart the
entire product. Do not wait for the combined feature set of Miro, FigJam, Excalidraw,
and tldraw before testing a differentiated workflow with real customers.

Recommended positioning: **the local-first visual workspace where builders and
their agents explain, change, and maintain software systems together**.

The initial adoption path is editable Mermaid plus a dependable canvas controlled
by the user's own agent. The longer-term business hypothesis is source-backed
architecture maintenance and review: diagrams that remain useful after code changes.
Presentations and animation communicate that model; they are not a separate generic
video-editing product. This is a proposed focus, not proven product-market fit.

## What the market already offers

Sources below are official vendor documentation checked on the research date.
Capabilities are documented claims; no comparative hands-on benchmark was performed.
Absence from a page is not evidence a competitor lacks a feature.

| Product | Verified overlap | Strategic consequence |
| --- | --- | --- |
| Miro | Documents external-agent/MCP workflows, technical diagrams and Mermaid. [Pricing/capabilities](https://miro.com/pricing/) | Agent integration and technical icons alone will not establish a distinct category. |
| Figma/FigJam | Lists diagramming, technical shapes and MCP access that can edit FigJam and other file types. [Official product matrix](https://www.figma.com/pricing/) | “Use an agent to create a board” is already competitive territory. |
| Excalidraw | Free open-source editor; Plus documents API/MCP; official MCP project describes interactive diagram editing and local/remote setups. [Product](https://plus.excalidraw.com/), [Integration docs](https://plus.excalidraw.com/docs), [Official MCP repository](https://github.com/excalidraw/excalidraw-mcp) | Free drawing, open source, and MCP availability are insufficient individually. Do not claim competitors universally require hosted AI. |
| tldraw | SDK and an agent starter kit for interpreting/manipulating the canvas. [Agent kit](https://tldraw.dev/starter-kits/agent) | Developers can build agent canvases quickly; our valuable work must extend beyond a generic canvas wrapper. |
| Eraser | Git-repository diagrams, CI updates, and MCP creation/read/edit/export. [Codebase diagrams](https://docs.eraser.io/codebase-diagrams), [MCP](https://docs.eraser.io/mcp) | “GitHub to diagram” and “keep diagrams updated” already have direct competitors. Benchmark maintenance quality, not feature existence. |
| IcePanel | Connected C4 diagrams and flows explaining message sequences. [Diagramming](https://docs.icepanel.io/core-features/diagramming), [Flows](https://docs.icepanel.io/visual-storytelling/flows) | Connected architecture models and animated explanations are established ideas. |
| Structurizr | Multiple diagrams from one model and view animation. [DSL cookbook](https://docs.structurizr.com/dsl/cookbook/), [Animation](https://docs.structurizr.com/ui/diagrams/animation) | Git-friendly architecture models and multiple views are useful patterns, not exclusive inventions. |

Research conclusion: a defensible opportunity is a particularly good combination
of local ownership, complete agent operations, source evidence, stable visual edits,
and repeatable maintenance. No public-source review establishes that this combination
is unique or that buyers will switch. Both need customer tests.

## Rebuild versus update

| Option | Benefit | Cost/risk | Recommendation |
| --- | --- | --- | --- |
| Keep patching the current legacy-shaped editor | Lowest immediate disruption | Continues dual-model ownership and difficult interaction evolution | Maintain for existing users while replacing the editing path. |
| Rewrite everything with Pixi in a new product | Total freedom | Relearns persistence, imports, export, migration and integration failures; rendering alone does not supply editor semantics | Reject absent evidence that existing foundations are unusable. |
| New core/interaction shell in the existing repository | Clean ownership plus tested services/customer continuity | Requires disciplined boundaries and temporary compatibility code | Preferred. `/v2`, isolated records, incremental slices, measurable retirement gates. |
| Adopt tldraw SDK or embed/fork Excalidraw | Could reduce bespoke interaction engineering | Migration, technical shape integration, agent semantics, ownership, extensibility and commercial terms still need evaluation | Keep as a bounded alternative if the current core repeatedly fails quality/cost gates. |

The tldraw SDK requires production licensing under its published terms; commercial
use requires the corresponding license. Excalidraw's repository uses MIT. Neither
fact alone settles total engineering cost or suitability. Verify dependencies and
terms for the exact version before adoption. [tldraw license](https://tldraw.dev/community/license),
[Excalidraw license](https://github.com/excalidraw/excalidraw/blob/master/LICENSE).

Pixi is a renderer and scene-graph foundation. It does not deliver document history,
connector intent, text editing, migration, agent protocols, or semantic architecture
for us. Keep domain geometry and operations independent of rendering so future
change is feasible. [Pixi architecture](https://pixijs.com/8.x/guides/concepts/architecture).

Retain Pixi because working integration and reusable code exist, not because of sunk
cost or a belief that GPU rendering guarantees superiority. Reopen the decision if
the agreed workloads repeatedly fail input latency, text/accessibility, graphics
recovery, or maintenance-cost gates. Compare alternatives on the same hard fixture,
including migration/customization cost, before selecting another engine.

## Useful work already present

Static source inspection identified the following foundations; this is not a claim
of complete, exposed, or production-verified workflows:

- `src/services/githubFetcher.ts`: quarantined GitHub fetching and source-selection
  heuristics; inventory only until the new acquisition/security contract passes.
- `mcp-server/src/lib/codebaseScanner.ts`: quarantined local code scanner with
  heuristic service detection and evidence strings. It is not a reliable runtime
  dependency map or product foundation.
- `src/services/infraSync/`: quarantined Terraform state, Kubernetes and Compose
  parsers plus DSL conversion. Rebuild evidence, identity, reconciliation and
  native-v2 projection without assuming current results are correct.
- `src/hooks/ai-generation/openApiParser.ts`: quarantined partial JSON extraction;
  `openApiToSequence.ts` builds an AI prompt and is not a reliable API diagram or
  request-sequence pipeline.
- `src/services/export/webCodecsExport.ts`, `cinematicCanonicalFrame.ts`, and
  `src/hooks/useCinematicExport.ts`: video/cinematic foundations to validate and reuse.
- Canonical commands, history, geometry, local storage, Mermaid import, Pixi, icons,
  export and MCP as documented in [assessment](assessment.md).

The advanced features above are governed by
[the quarantine and replacement policy](legacy-feature-quarantine.md). No estimate
may credit them as completed work. Remove dependence on legacy editor ownership;
do not preserve a flawed behavior just because a helper or test exists.

## What counts as baseline quality

Baseline is defined by the customer's task, not the union of four competitors.

| Category | Include |
| --- | --- |
| Universal editing quality | Reliable select/move/resize/rotate, text/IME, connectors, labels, snapping, keyboard/touch, clipboard, frames/groups, undo, camera, recovery and export. |
| Builder baseline | Editable Mermaid, technical shapes/icons, readable layout, source links, easy agent setup, complete programmatic operations, portable local documents. |
| Add after focused validation | API/sequence/C4/ER views, code references, reusable technical components, architecture diff, source refresh, animated walkthroughs. |
| Separate markets, not automatic prerequisites | Workshop voting, timers/music, large template libraries, organization administration, live multi-user facilitation, general presentation/video suites. |

Excellent manual editing is mandatory even in an agent-first product: people must
be able to repair, refine, and explain the generated result. Quality parity for the
selected workflows is more valuable than checkbox breadth. Advanced technical
views become worthwhile when they support the chosen customer job; they are not
permanently excluded by the initial v2 launch scope.

## Recommended differentiated workflows

The order below is a hypothesis based on engineering adjacency, repeat-use potential,
and relevance to builders. No fabricated market-size or demand score is assigned.

### 1. Your existing coding agent gets a precise visual workspace

Example: “Use this repository to map the checkout path. Show which relationships
are evidenced, preserve my layout, and let me move things while you work.”

Deliver complete object operations, semantic queries, snapshots/render feedback,
batching, stable IDs, revision conflicts, shared undo, and local file/live modes.
Semantic operations such as “add branch” or “lay out subsystem” should complement
low-level shape setters, reducing brittle tool-call sequences. Reuse the agent's
repository access instead of requiring users to upload the repository again.

Value to test: less cleanup and easier iteration than their present tool. Basic MCP
support is competitive parity; reliable mixed human/agent editing is the quality bet.
Measure setup completion, task success, edit repairs, token/tool-call cost, and return
use. See [agent-native contract](agent-native-spec.md).

### 2. Source-backed diagrams that survive change

Example: “Update this architecture for the new queue from the latest commit; show
the difference and keep my annotations and pinned positions.”

Every extracted fact has an origin: repository/commit/path/symbol or specification
pointer, extraction method and status. Separate observed, inferred, and manually
asserted relationships. Preserve identity across refreshes; use an explicit diff
for create/update/delete and protect manual overrides. A stale or incomplete scan
must not delete content as if it proved removal.

Start with one tractable input and review workflow, such as Compose/Kubernetes
relationships or a bounded repository language/service. Avoid “understands any
codebase” claims. Existing heuristic scanners are useful evidence collectors, not
an oracle. Eraser already offers CI updates, so the experiment must demonstrate
better trust, local operation, or preservation rather than mere update support.

Value to test: a developer uses it again after a real change, and another teammate
trusts its evidence. Maintenance is a stronger repeat-use hypothesis than one-time
diagram generation. CI can run in the user's environment; an always-on watcher is
optional, never a required OpenFlowKit backend.

### 3. Review architecture changes visually in the development workflow

Example: “Show what this PR changes in the request path, link each change to its
source, and export a review artifact.”

Build semantic graph diff and impacted-neighbor views, scoped refresh, reviewer
annotations and portable before/after artifacts. Later allow user-defined boundary
rules (“this service must not call that database directly”). Proposed risk/impact
findings require evidence and uncertainty labels, not confident AI guesses.

No diagram change should silently deploy infrastructure or modify source code.
Code generation can be a separately reviewed agent task later. This workflow is a
candidate for paid engineering-team value; willingness to pay is unproven.

### 4. Explain a system through a view, a flow, or a short walkthrough

Example: “Make a 60-second walkthrough of authentication, including its failure
path, using this same architecture model.”

Create named views and ordered steps referencing existing entities/relationships.
Agents can author steps, captions and camera focus; users edit them. Interactive
presentation, video and static exports derive from the same revision. Prefer
deterministic timeline rendering over screen recording; stream encoding with
bounded memory rather than keeping every high-resolution frame in RAM.

Animation is not inherently unique: IcePanel and Structurizr already offer flows/
animation. The opportunity is the complete workflow from evidence to editable model
to understandable explanation, with consistent outputs and little manual work.
Treat it as communication and distribution first; validate it before building a
general timeline, voice synthesis, or movie editor.

### 5. Deterministic API and infrastructure views

OpenAPI can reliably describe endpoints/schemas/security declarations; it cannot
by itself prove the internal services called by an implementation. Runtime traces
can show observed requests but not every possible path. Terraform state can contain
secrets and reflects a snapshot rather than universal runtime truth. Define each
importer's evidence boundary and redact secrets before agent transmission.

Build native editable views from validated schemas, with focused support matrices
and stable IDs. Add richer API exploration, event flows, schema impact and trace
overlays only when representative customers demonstrate repeat need. These should
attach to the same technical model, not grow as disconnected import wizards.

## Architectural preparation without a second rewrite

The scene document remains the single authoring authority. Add minimal optional
technical records inside the versioned document: stable entity ID, source reference,
relationship kind, evidence status, and manual override ownership. Shapes may refer
to an entity, allowing one service to appear in multiple views without copying its
semantic identity. A freeform drawing is valid without any technical model.

Later, views own placement and presentation; the technical graph owns supported
facts; walkthroughs reference view objects and graph relationships. Keep all of
these under one transactional document envelope. Do not introduce an independent
writable graph service or force every rectangle to be a system component.

Prove two views of one entity, one source refresh preserving manual layout, and an
agent transaction touching that entity in an isolated spike. Reserve schema
extension points early; implement a full architecture knowledge system only after
the workflow is validated. Use deterministic serialization and stable ordering for
Git artifacts; regenerate derived views without polluting diffs with UI state.

## Bringing any agent: meaningful boundaries

The product should be model/vendor-independent. Publish operation schemas, MCP
tools, a headless command interface for file workflows, and portable examples.
Agents with local process access can use a local companion; agents running in a
remote workspace can operate a file there and return the artifact. Live access to
a user's browser requires pairing and a reachable bridge; a cloud agent cannot
be assumed to reach the user's loopback address. Test actual clients individually.

No hosted relay is proposed now. A future user-controlled relay would require a
separate decision. “Any agent” means an open, documented contract with verified
adapters and honest limits, not an untestable claim that every product works today.

## Business model and the $10 million question

A $10m valuation and $10m annual recurring revenue are different goals. Valuation
cannot be inferred from a feature roadmap or assumed revenue multiple. For a useful
operating target, the table below models $10m ARR using hypothetical realized prices;
these are arithmetic scenarios, not market forecasts or proposed current pricing.

| Realized recurring price | Paying units needed for approximately $10m ARR |
| --- | --- |
| $20 per individual/month | 41,667 individuals |
| $50 per individual/month | 16,667 individuals |
| $200 per team/month | 4,167 teams |
| $500 per team/month | 1,667 teams |

ARR = paying units × realized monthly recurring price × 12. Taxes, discounts,
churn, acquisition/support costs and delivery costs still matter; ARR is not profit.
At a hypothetical 3% active-free-to-paid conversion, the $20 individual scenario
would require roughly 1.39m comparable active users. That is an assumption to expose
the scale, not a conversion benchmark. A team workflow can need fewer accounts but
will generally require a stronger buying reason and more support.

Thousands of users are a useful discovery/distribution advantage. They do not prove
retention or a business at this scale. A free diagram generator may succeed as a
project without becoming a large recurring-revenue company. The stronger commercial
thesis is paying to keep architecture trustworthy across ongoing engineering work.

Preserve the free core and complete basic agent control. Potential future paid
offerings are supported local/self-hosted engineering workflows, advanced review
automation, maintained enterprise integrations, deployment/support packages, and
team-specific technical policies. Assess these with buyers; do not retroactively
charge for existing free authoring/import/export features. Managed AI may eventually
offer convenience, but it is a weak central thesis when users already have agents.

Strictly local-first is compatible with selling software and support. It limits
some hosted collaboration/revenue options. If every advanced feature and support
service must also be free forever, a subscription business lacks a defined product
to sell. Eventually clarify the paid value while preserving the promised free
core. Billing/licensing implementation remains deferred. The proposed commercial
boundary, low-cost architecture, and evidence gates are specified in
[the Pro, business, and platform plan](pro-business-and-platform-plan.md); it does
not change current free/local-first commitments.

## Validation before expanding the roadmap

No deadline does not remove opportunity cost. Use decision checkpoints based on
customer evidence rather than completing years of feature parity in isolation.

1. Interview 10–15 existing users with their actual last diagram. Identify their
   task, tool alternatives, cleanup time, repeat cadence, and whether a team pays
   for the problem. Select one initial audience: engineers maintaining service/API
   architecture, with technical leads as potential buyers.
2. Test one whole journey with 5–8 design partners: agent inspects a repo/spec,
   creates a native diagram, user adjusts it, source changes, agent updates only
   the affected part, and user exports a review artifact. Use current infrastructure
   to test the hypothesis before every v2 polish feature is complete.
3. Compare the same task against each participant's actual alternative. Measure
   time, errors, repairs, source confidence and successful return after a real change.
   Suggested decision gate: at least 5 of 8 complete independently and at least 4
   return for a subsequent real task. These are pilot criteria, not population estimates.
4. Seek 3 concrete paid-pilot commitments for a separately defined advanced workflow
   from the actual budget owner. Compliments, waitlist signups, and a “would pay”
   survey response are weaker than a scoped commitment. Pro implementation stays deferred.
5. If creation succeeds but users do not return, investigate job frequency and update
   value before adding more formats. If setup is the blocker, improve installation.
   If people only want a free image, reconsider the commercial segment.

Track first successful diagram, agent connection success, second real usage,
retained projects, refresh accepted without manual repair, and paid-pilot evidence.
Use opt-in research/local diagnostics; no required document telemetry. Active-user
counts and conversion cohorts must share a defined observation period.

Distribution experiments: documented agent installations and recipes; excellent
Mermaid conversion demos; repo-based examples with inspectable provenance; export
artifacts embedded in technical docs; engineering communities and design partners.
Do not depend on search traffic or generic “AI diagram maker” positioning alone.

## Implications for the current delivery plan

Keep [the v2 execution plan](delivery-roadmap.md) for safety and migration. Add a
bounded source-backed-diagram discovery prototype before the broad rewrite is
complete. Preserve it as an experiment, not an excuse to create another editor.
V2-01 should consider optional semantic/source references and view identity. V2-02
should prove a headless agent operation alongside manual editing. Do not postpone
all differentiation until every baseline checkbox is finished.

After the core and J4 are proven, select the next milestone from measured demand:
source reconciliation/review first by current recommendation; API views and
walkthroughs next. Existing family support remains protected during migration.
New sequence/C4/ER authoring can enter that later roadmap with its own contracts.

The business is plausible enough to test seriously. It is not yet possible to
promise a $10m outcome. The investment case strengthens when users repeatedly
maintain real systems here, trust the outputs, and pay for a recurring engineering
workflow. A clean rebuild and a long feature list do not supply that evidence.
