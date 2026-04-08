# Mermaid Import Audit, Research, and Execution Plan
**Date:** 2026-04-08
**Product Goal:** Import Mermaid diagrams reliably, make them fully editable, make them look excellent, and use icons only when they are genuinely correct.
**Standard:** We should aim to be as reliable as Mermaid for supported syntax, and better than Mermaid in editability, diagnostics, and visual polish.

---

## Executive Summary

OpenFlowKit is not currently using Mermaid's official parser/runtime for import. We use a custom Mermaid detection and plugin parsing pipeline that converts Mermaid text into our own editable graph model.

That is not automatically wrong. In fact, for a product whose output must be editable canvas nodes, edges, sections, handles, icons, and property panels, a custom parser is a valid and often necessary architecture.

The real problem is not "custom parser vs official parser" in isolation. The real problem is that we currently have:

- a custom editable import pipeline
- no official Mermaid parser installed as a validator or compatibility oracle
- selective support for eight Mermaid families
- uneven syntax coverage between those families
- good diagnostics in many places, but no systematic compatibility benchmarking against official Mermaid
- post-parse enrichment and layout logic that can improve the output, but can also reduce trust when it overreaches

My strongest recommendation is:

1. Keep the custom editable parser pipeline.
2. Add official Mermaid as a syntax oracle and compatibility gate.
3. Treat import as a two-layer system:
   - Layer A: official Mermaid compatibility validation
   - Layer B: OpenFlowKit editable AST conversion
4. Define a strict "supported editable subset" per diagram family.
5. Add a fallback mode for valid Mermaid we cannot yet map cleanly into editable nodes.

That gives us the best chance of becoming:

- as reliable as Mermaid for accepted syntax
- better than Mermaid at editability
- better than many competitors at diagnostics and visual outcomes
- less annoying than current auto-enrichment behavior

---

## Short Answer to the Core Question

### Do we currently have the official Mermaid parser in the app?

No.

Evidence:

- [package.json](/Users/varun/Desktop/Dev_projects/flowmind-ai/package.json) does not include a `mermaid` dependency.
- Mermaid import enters through [parseMermaidByType.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/mermaid/parseMermaidByType.ts).
- That dispatcher routes to our plugin registry in [builtInPlugins.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/diagram-types/builtInPlugins.ts).
- Flowchart and part of state parsing ultimately rely on our local parser in [mermaidParser.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/mermaidParser.ts).

### Should we replace our parser with the official Mermaid parser?

No, not as a full replacement.

The official Mermaid stack is optimized to parse and render Mermaid diagrams. Our product needs to parse, normalize, enrich, lay out, and convert Mermaid into an editable internal graph model. That requires product-specific structure that Mermaid does not directly provide as a ready-made editable canvas AST.

### Should we still use the official Mermaid parser?

Yes.

We should use official Mermaid for:

- syntax validation
- compatibility benchmarking
- diagram type confirmation
- regression corpus testing
- fallback behavior for valid Mermaid we cannot yet edit faithfully

That hybrid model is the strongest path.

---

## Current Architecture in This Repo

### Current Import Flow

For paste/import, the current path is effectively:

1. Detect diagram type via [detectDiagramType.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/mermaid/detectDiagramType.ts)
2. Dispatch by family via [parseMermaidByType.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/mermaid/parseMermaidByType.ts)
3. Parse through a custom plugin:
   - `flowchart`
   - `stateDiagram`
   - `classDiagram`
   - `erDiagram`
   - `mindmap`
   - `journey`
   - `architecture`
   - `sequence`
4. Enrich nodes via [nodeEnricher.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/nodeEnricher.ts)
5. Normalize icon state via `nodeIconState`
6. Compose layout and smart handles in [useFlowCanvasPaste.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/components/flow-canvas/useFlowCanvasPaste.ts)

### Important Architectural Strength

This architecture is already aligned with an editable-diagram product:

- parsing is family-aware
- diagnostics are often surfaced without hard-failing
- result is converted to product-native nodes and edges
- import already feeds directly into editable canvas state

This is the right overall shape for "editable Mermaid import."

### Important Architectural Gap

We currently do not have an external source of truth validating whether:

- the Mermaid input is valid according to official Mermaid
- our type detection is correct
- our parser is silently under-parsing valid Mermaid
- our diagnostics match real Mermaid behavior
- a failing import is due to invalid Mermaid or our unsupported editable subset

That makes trust weaker than it should be.

---

## What the Codebase Is Good At Today

### 1. Editable-native import

This is the biggest advantage of the current approach.

We do not just render Mermaid. We convert it into:

- editable nodes
- editable edges
- editable sections/containers
- product-specific node types
- downstream layout and icon enrichment

Many Mermaid-capable tools stop at "render from text." We already go further.

### 2. Plugin-per-family architecture

The family plugin model is a strong foundation:

- [stateDiagram/plugin.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/diagram-types/stateDiagram/plugin.ts)
- [sequence/plugin.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/diagram-types/sequence/plugin.ts)
- [classDiagram/plugin.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/diagram-types/classDiagram/plugin.ts)
- [erDiagram/plugin.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/diagram-types/erDiagram/plugin.ts)
- [mindmap/plugin.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/diagram-types/mindmap/plugin.ts)
- [journey/plugin.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/diagram-types/journey/plugin.ts)
- [architecture/plugin.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/diagram-types/architecture/plugin.ts)

That makes targeted fixes possible without a full rewrite.

### 3. Diagnostics instead of just throwing

Multiple plugins emit warnings and continue parsing where possible. That is good product behavior because users care about import usefulness, not parser purity.

### 4. Supported family scope is explicit

[parseMermaidByType.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/mermaid/parseMermaidByType.ts) clearly defines supported editable families. That is better than pretending full Mermaid support and failing unpredictably.

### 5. Conservative icon work is already moving in the right direction

The recent tightening in:

- [nodeEnricher.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/nodeEnricher.ts)
- [iconMatcher.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/iconMatcher.ts)

is the right direction. "No icon" is better than a wrong icon.

---

## Where the Codebase Is Not Good Enough Yet

## 1. No official Mermaid compatibility oracle

This is the largest strategic gap.

Without official Mermaid in the loop:

- we cannot distinguish "invalid Mermaid" from "valid Mermaid we do not support"
- we cannot benchmark fidelity against Mermaid itself
- we are vulnerable to spec drift
- we lack a robust parser acceptance corpus tied to the upstream project

## 2. Our flowchart parser is spec-shaped only in part

[mermaidParser.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/mermaidParser.ts) and [mermaidParserHelpers.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/mermaidParserHelpers.ts) are pragmatic and useful, but they are still handwritten rule-based parsing.

That means:

- edge forms can be missed
- special syntax quirks can drift from Mermaid behavior
- new Mermaid syntax will not arrive automatically
- ambiguous lines are interpreted by our rules, not the official grammar

## 3. Support is broad by family but not deep by syntax

Current support covers the right high-level families, but several plugins still support only a practical subset of their official syntax.

Examples visible in code and tests:

- state diagrams still rely partly on generic parsing plus plugin augmentation
- journey parsing warns and skips malformed lines rather than fully modeling richer journey semantics
- class and ER diagrams parse enough for editability, but not full language richness
- sequence diagrams parse structured messages, but the rendering/edit model still has room to better represent fragments and advanced constructs

## 4. Import trust is still fragile when enrichment is too opinionated

Even after improvements, enrichment remains a product risk area.

Users trust imports when:

- the structure is correct
- the text is preserved
- icons are accurate when present
- absence of icon feels intentional, not broken

Wrong icons are more damaging than missing icons.

## 5. We do not yet separate product guarantees clearly enough

We need to explicitly define:

- valid Mermaid
- supported Mermaid
- editable Mermaid
- render-only Mermaid
- unsupported Mermaid

Right now those boundaries exist in code but are not formalized as product contracts.

---

## External Research and Competitive Landscape

## 1. Official Mermaid

Official Mermaid's main strength is rendering Mermaid text into diagrams. The Mermaid documentation positions Mermaid.js as the JavaScript library that renders diagrams from text, and the Mermaid Live Editor as a text-first editor for writing and previewing Mermaid diagrams in real time.

What this implies:

- Mermaid itself is excellent as a syntax and rendering engine
- Mermaid is not, by default, an editable whiteboard/canvas product in the way OpenFlowKit is trying to be
- Mermaid's own live editor is code-first, not a full node-dragging GUI editor for canvas-native editing

Source:
- Mermaid docs: https://mermaid.js.org/intro/getting-started.html

## 2. Mermaid Chart

Mermaid Chart explicitly describes the open-source Mermaid stack as having a limited editing experience because the live editor renders Mermaid code but has no GUI for adding nodes or dragging them without writing code. It positions its own product around visual editing, collaboration, enhanced design, and AI on top of Mermaid syntax.

What this implies:

- the market sees "editable Mermaid" as a meaningful upgrade over Mermaid itself
- visual editing on top of Mermaid is a real product category
- OpenFlowKit is directionally pursuing a real and valuable problem

Source:
- Mermaid Chart blog: https://mermaid.ai/docs/blog/posts/mermaid-chart-the-evolution-of-mermaid

## 3. Lucidchart

Lucid's help content describes "Diagram as code with Mermaid in Lucidchart," which indicates Lucid treats Mermaid as an import/generation path into Lucidchart diagrams.

What this implies:

- enterprise diagram tools are using Mermaid as an ingestion format
- the product expectation is not just rendering but diagram creation within a richer editor
- OpenFlowKit is competing in a real workflow, not inventing a niche problem

Source:
- Lucid help center article listing: https://help.lucid.co/hc/en-us/profiles/395718981451-Shanna-S

## Research Takeaway

There are roughly three classes of Mermaid products:

1. Render-first
   - Mermaid OSS
   - best at syntax-to-rendering

2. Visual-editing-on-top-of-Mermaid
   - Mermaid Chart
   - likely treats Mermaid as source plus enhanced editing surface

3. Diagram-suite importers
   - Lucidchart and similar tools
   - treat Mermaid as one input into a broader diagramming system

OpenFlowKit should compete as:

- editable importer
- better diagnostics than render-only tools
- better visual polish than plain Mermaid
- more trustworthy than "magic conversion" tools

---

## Strategic Product Positioning

We should not try to beat Mermaid by becoming a better raw Mermaid renderer.

We should try to beat Mermaid by being:

- as syntax-compatible as possible for supported families
- more editable after import
- more visually polished after import
- more explicit and trustworthy about what was imported faithfully vs approximated

This is a crucial difference.

### Wrong target

"Support every Mermaid feature exactly like Mermaid and also make everything editable immediately."

That is expensive, brittle, and likely unrealistic.

### Right target

"For a clearly-defined supported subset, import with very high reliability and editability. For valid Mermaid outside that subset, fail gracefully or offer render-only/fallback behavior."

That is shippable, honest, and strong.

---

## Core Decision: What Should We Do About the Official Parser?

## Recommendation

Add official Mermaid as a dependency and use it in four roles.

### Role 1: Syntax oracle

Before editable conversion, validate the source with official Mermaid.

Possible outcomes:

- valid Mermaid, supported editable family
- valid Mermaid, unsupported editable family
- invalid Mermaid

This gives much better diagnostics and product trust.

### Role 2: Compatibility benchmark

Use official Mermaid examples and acceptance cases as a test corpus.

We should continuously answer:

- does Mermaid accept this?
- do we accept it?
- if we accept it, do we preserve semantics faithfully?

### Role 3: Fallback renderer or snapshot oracle

For valid Mermaid that we cannot edit faithfully yet, give one of these paths:

- render-only preview
- import with warning and partial editability
- offer "convert what is supported" vs "render as locked group"

### Role 4: Type confirmation and future-proofing

Use official Mermaid detection/parse behavior where possible to reduce drift from our own detection heuristics.

## Recommendation Against Full Replacement

Do not replace our editable parser pipeline with official Mermaid runtime as the main model source.

Reason:

- official Mermaid is not our internal node graph
- it does not directly solve our editable canvas modeling problem
- we still need semantic mapping into OpenFlowKit nodes, sections, icon metadata, property panels, and layout

The right architecture is hybrid, not replacement.

---

## Proposed Target Architecture

```text
Mermaid Input
  -> Pre-normalization
  -> Official Mermaid validation
  -> Diagram type detection confirmation
  -> Editable support gate
     -> if supported: family plugin conversion to OpenFlowKit AST
     -> if partially supported: import with structured diagnostics
     -> if valid but unsupported: render-only or locked fallback
  -> Semantic enrichment
  -> Layout
  -> Editable canvas
  -> Round-trip metadata and diagnostics
```

## New Contracts We Need

Every Mermaid import should end in one of these explicit states:

- `editable_full`
- `editable_partial`
- `render_only_valid`
- `invalid_source`
- `unsupported_family`
- `unsupported_construct`

This contract should be visible in diagnostics and analytics.

---

## Family-by-Family Audit

## Flowchart

### Strengths

- Most mature path
- backed by the generic parser
- already editable
- compatible with current icon enrichment strategy

### Risks

- rule-based edge parsing is still vulnerable to syntax edge cases
- special token handling can drift from Mermaid
- some valid Mermaid flowchart features may be accepted differently than official Mermaid

### Recommendation

- use official Mermaid as acceptance oracle for flowchart corpus
- keep our editable flowchart parser
- expand parity tests aggressively

## State Diagram

### Strengths

- plugin exists
- diagnostics are relatively strong
- notes and composite handling are partially modeled

### Risks

- relies in part on the generic parser, which is not truly state-diagram-native
- state semantics are richer than flowchart semantics
- initial/final states and advanced constructs need explicit fidelity rules

### Recommendation

- continue plugin-specific modeling
- reduce reliance on generic flowchart-like parsing
- benchmark against official stateDiagram examples

## Class Diagram

### Strengths

- plugin exists
- block parsing and diagnostics exist

### Risks

- class syntax richness is high
- relationship semantics can outpace current editable model
- generics, visibility, annotations, stereotypes, and richer relationship metadata need careful mapping

### Recommendation

- formally define supported editable subset
- preserve unsupported tokens in metadata even when not visually modeled

## ER Diagram

### Strengths

- entities and relations are modeled
- diagnostics exist

### Risks

- fields are not yet treated as rich schema objects to the extent needed for best-in-class editing
- key constraints and relation/cardinality fidelity matter a lot here

### Recommendation

- move from string-ish field handling to structured field AST
- make ER import one of the flagship "better than Mermaid" families

## Mindmap

### Strengths

- relatively contained syntax
- good candidate for high reliability

### Risks

- indentation sensitivity can be brittle
- wrapper syntax and formatting need parity with Mermaid expectations

### Recommendation

- this should become one of the highest-confidence editable imports

## Journey

### Strengths

- supported
- diagnostics exist

### Risks

- current editable semantics may undershoot user expectations around actors and scoring
- visual differentiation is important for usefulness

### Recommendation

- elevate journey beyond "parsed lines" into a richer native journey model

## Sequence

### Strengths

- plugin exists
- good foundational parsing path

### Risks

- advanced sequence constructs are where many products become unreliable
- visual semantics matter a lot

### Recommendation

- define exact supported fragment subset
- add richer visual fidelity for fragments, notes, activations, and participant semantics

## Architecture

### Strengths

- likely our best strategic family
- close fit with product value
- strict mode already exists

### Risks

- architecture users are the most sensitive to wrong icons and wrong semantics
- this family can look amazing or feel fake depending on icon quality

### Recommendation

- make architecture the gold-standard import family
- require highest trust threshold for icons
- consider provider-aware validation and stronger architecture linting

---

## Icons: How We Should Think About Them

Icons should never be treated as decoration during Mermaid import.

Icons are semantic claims.

If we add an AWS Lambda icon, we are claiming:

- this node is Lambda
- not just "compute"
- not just "serverless"
- not just "some backend thing"

That means our icon policy should be:

- exact product match -> use icon
- strong alias match -> use icon
- trusted vendor/product compound match -> use icon
- generic concept -> do not use icon
- ambiguous concept -> do not use icon
- uncertain variant/wordmark match -> do not use icon

Best practice for Mermaid import:

- no icon is better than wrong icon
- structural defaults are okay for start/end/decision
- product icons must be earned, not guessed

This matches the recent direction in:

- [nodeEnricher.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/nodeEnricher.ts)
- [iconMatcher.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/iconMatcher.ts)

### Additional Recommendation

Persist skip reasons in import metadata:

- `generic_term`
- `ambiguous_match`
- `runner_up_too_close`
- `variant_only`
- `no_trusted_candidate`

Then surface those gently in the inspector rather than forcing icons silently.

---

## Reliability Standard We Should Adopt

If we want to be "as good as or better than Mermaid," we need to stop defining success as:

"Did we create some nodes and edges?"

We should define success across five dimensions:

## 1. Syntax compatibility

For supported families, official Mermaid accepts it and we accept it too.

## 2. Semantic fidelity

We preserve the meaning of:

- node identity
- labels
- edge direction
- relationship type
- hierarchy
- family-specific semantics

## 3. Editability

After import, the user can actually work with the diagram as native OpenFlowKit content.

## 4. Visual quality

Layout, spacing, handles, typography, colors, and icons should improve the result rather than making it noisier.

## 5. Honesty

When we approximate or ignore something, we say so.

This last one is how we beat many competitors in trust.

---

## Recommended Roadmap

## Phase 0: Product Contract and Instrumentation

### Goal

Define what "supported editable Mermaid" means.

### Work

- Add import result status enum
- Add structured diagnostics object, not just strings
- Add analytics for:
  - valid official Mermaid / invalid official Mermaid
  - editable full / editable partial / render-only
  - family-level success rate
  - icon assignment rate
  - icon skip reason rate

### Why first

Without this, we cannot measure progress honestly.

## Phase 1: Add Official Mermaid as Syntax Oracle

### Goal

Introduce official Mermaid without disrupting editable import.

### Work

- add `mermaid` dependency
- build a validation adapter service
- validate source before plugin conversion
- classify failures into:
  - invalid Mermaid
  - valid but unsupported family
  - valid but unsupported construct

### Output

Users finally get trustworthy diagnostics.

## Phase 2: Build a Compatibility Harness

### Goal

Measure ourselves against Mermaid continuously.

### Work

- create an upstream-style Mermaid fixture corpus
- import official Mermaid examples for supported families
- for each fixture, assert:
  - Mermaid accepts it
  - we accept it
  - we preserve key semantics
- add snapshot tests for OpenFlowKit AST and visible output

### Output

A real compatibility scorecard instead of vibes.

## Phase 3: Define Editable Subsets Per Family

### Goal

Stop pretending support is binary.

### Work

- publish per-family support matrix
- define:
  - fully editable constructs
  - partially editable constructs
  - render-only constructs
  - unsupported constructs

### Output

Clear engineering and product boundaries.

## Phase 4: Strengthen Family Parsers

### Goal

Deepen syntax support where it matters most.

### Priority order

1. flowchart
2. architecture
3. sequence
4. stateDiagram
5. erDiagram
6. classDiagram
7. mindmap
8. journey

### Why this order

- flowchart is the broadest usage surface
- architecture is the highest strategic differentiator for OpenFlowKit
- sequence/state/ER/class are high-value technical diagrams

## Phase 5: Fallback Modes

### Goal

Never force a bad editable conversion.

### Work

For valid Mermaid that we cannot edit faithfully:

- offer render-only locked import
- or import with warnings and explicit unsupported markers
- preserve original Mermaid source in metadata

### Output

Trust improves because we stop pretending.

## Phase 6: Visual Quality and Icon Excellence

### Goal

Make imports look polished without making them dishonest.

### Work

- keep strict sparse icon policy
- family-aware icon rules
- architecture-specific provider icon rules
- sequence/state/class/journey default to minimal iconing
- layout tuned per family and graph density
- typography and spacing presets by diagram family

### Output

Imported diagrams look upgraded, not over-decorated.

---

## Concrete Engineering Recommendations

## Recommendation A

Add a new service:

`src/services/mermaid/officialMermaidValidation.ts`

Responsibilities:

- run official Mermaid validation
- normalize validation result into our diagnostics format
- expose:
  - `isValid`
  - `detectedType`
  - `errors`
  - `unsupportedByOpenFlowKit`

## Recommendation B

Add an import compatibility report generator

Suggested path:

`scripts/mermaid-compat-report.mjs`

Responsibilities:

- run fixture corpus through official Mermaid and OpenFlowKit
- produce per-family compatibility stats
- output CI artifact

## Recommendation C

Add structured diagnostics model

Current string diagnostics are useful, but we should move toward:

```ts
type MermaidImportDiagnostic = {
  code: string;
  severity: 'info' | 'warning' | 'error';
  family?: string;
  line?: number;
  message: string;
  officialMermaidAccepted?: boolean;
  editableImpact?: 'none' | 'partial' | 'blocked';
};
```

## Recommendation D

Store original Mermaid source with imported diagram metadata

This enables:

- re-validation
- re-import upgrades later
- compare/editability troubleshooting
- future round-trip tooling

## Recommendation E

Separate parsing from semantic decoration more cleanly

The parser's job:

- detect
- tokenize
- model structure
- preserve semantics

The decoration layer's job:

- layout
- icon enrichment
- color defaults
- visual polish

These should remain cleanly separated.

---

## Strong Suggestions and Non-Negotiables

## 1. Do not make icon enrichment more aggressive again

That would hurt trust.

## 2. Do not market "full Mermaid support"

Market:

- "editable Mermaid import for supported diagram families"
- "strong diagnostics for unsupported or partially supported constructs"

## 3. Add official Mermaid before broadening syntax claims

Otherwise we will keep guessing at compatibility.

## 4. Make architecture import best-in-class

This is where OpenFlowKit can feel truly better than Mermaid:

- provider-aware icons
- clearer structure
- better layout
- editable cloud/infra semantics

## 5. Make fallback behavior a feature, not an embarrassment

"Valid Mermaid, but not yet editable as native nodes. Imported as locked render with source preserved."

That is much better than mangling a diagram.

---

## Success Metrics

We should start tracking these:

- official-valid Mermaid acceptance rate by family
- editable-full import rate by family
- editable-partial import rate by family
- render-only fallback rate by family
- import diagnostic rate by category
- user correction rate after import
- manual icon override rate
- icon false-positive complaints
- round-trip retention rate for supported families

Target standards:

- flowchart editable-full on supported corpus: 95%+
- architecture editable-full on supported corpus: 95%+
- state/sequence/class/ER supported-corpus semantic fidelity: 90%+
- wrong-icon rate on import: near zero

---

## Final Recommendation

OpenFlowKit should not try to become "Mermaid but with a different parser."

OpenFlowKit should become:

- Mermaid-compatible where it claims compatibility
- more editable than Mermaid
- more visually polished than Mermaid
- more honest than magical importers

The winning strategy is:

- keep our editable parser architecture
- add official Mermaid as a validation and compatibility layer
- formalize supported editable subsets
- introduce graceful fallback for valid-but-not-editable Mermaid
- continue strict sparse iconing
- measure fidelity against official Mermaid continuously

That is the strongest path to being reliable, credible, and genuinely better for the user's actual workflow.

---

## Source Links

- Mermaid documentation: https://mermaid.js.org/intro/getting-started.html
- Mermaid Chart product/positioning blog: https://mermaid.ai/docs/blog/posts/mermaid-chart-the-evolution-of-mermaid
- Lucid help center profile listing showing Mermaid article: https://help.lucid.co/hc/en-us/profiles/395718981451-Shanna-S

## Internal Code References

- [package.json](/Users/varun/Desktop/Dev_projects/flowmind-ai/package.json)
- [parseMermaidByType.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/mermaid/parseMermaidByType.ts)
- [detectDiagramType.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/mermaid/detectDiagramType.ts)
- [mermaidParser.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/mermaidParser.ts)
- [mermaidParserHelpers.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/mermaidParserHelpers.ts)
- [useFlowCanvasPaste.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/components/flow-canvas/useFlowCanvasPaste.ts)
- [nodeEnricher.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/nodeEnricher.ts)
- [iconMatcher.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/iconMatcher.ts)
- [builtInPlugins.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/diagram-types/builtInPlugins.ts)
