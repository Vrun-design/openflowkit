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

---

## Implementation Log

### Completed in this pass

- Added explicit Mermaid import contract types in [importContracts.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/mermaid/importContracts.ts):
  - `MermaidImportStatus`
  - `MermaidImportDiagnostic`
  - normalization and classification helpers
- Upgraded [parseMermaidByType.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/mermaid/parseMermaidByType.ts) to:
  - preserve `originalSource`
  - emit `structuredDiagnostics`
  - classify imports as `editable_full`, `editable_partial`, `invalid_source`, `unsupported_family`, or `unsupported_construct`
- Tightened [detectDiagramType.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/mermaid/detectDiagramType.ts) so unsupported-family detection only triggers on real header-shaped lines, which avoids false positives like treating `A --> B` as family `"A"`.
- Added [officialMermaidValidation.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/mermaid/officialMermaidValidation.ts) as the seam for the official Mermaid validator so Phase 1 can land without reworking the dispatcher again.
- Installed the official `mermaid` package and upgraded [officialMermaidValidation.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/mermaid/officialMermaidValidation.ts) into a real Phase 1 service with:
  - synchronous official type detection for the app’s current import path
  - asynchronous official parse validation for correctness work and harnessing
- Added [scripts/mermaid-compat-report.mjs](/Users/varun/Desktop/Dev_projects/flowmind-ai/scripts/mermaid-compat-report.mjs) as the first compatibility scorecard scaffold.
- Verified a real upstream integration constraint in the current Node harness:
  - Mermaid 11 official parsing surfaces `DOMPurify` environment failures for several valid families in this environment
  - genuine syntax failures still produce real official parse errors
  - this confirms we need browser-aware async preflight validation rather than pretending the current synchronous import path can fully delegate to Mermaid today
- Added async official-Mermaid preflight to the command-bar apply path in [applyCodeChanges.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/components/command-bar/applyCodeChanges.ts), so upstream parse failures can now block apply before editable conversion in the UI path that already supports async work.
- Strengthened flowchart fidelity in:
  - [mermaidParser.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/mermaidParser.ts)
  - [mermaidParserHelpers.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/mermaidParserHelpers.ts)
  - [mermaidBuilder.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/export/mermaidBuilder.ts)
  with:
  - explicit subgraph id + label parsing, e.g. `subgraph api[API Layer]`
  - round-trip preservation of explicit subgraph ids during export
  - retention of inline `:::class` metadata on edge-declared nodes so `classDef` styling applies correctly
- Expanded the compatibility harness from a stub into a corpus-driven scorecard with:
  - fixture data in [mermaid-compat-fixtures.json](/Users/varun/Desktop/Dev_projects/flowmind-ai/scripts/mermaid-compat-fixtures.json)
  - family-level summaries
  - expected-outcome matching
  - explicit `environment_limited` classification for upstream DOMPurify/runtime constraints
- Tightened architecture compatibility expectations:
  - added an official-subset architecture edge fixture with no label
  - reclassified labeled architecture edges as an OpenFlowKit extension outside the current official Mermaid subset
- Made [officialMermaidValidation.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/mermaid/officialMermaidValidation.ts) browser-aware for full validation so non-browser runtimes degrade intentionally to type detection instead of surfacing misleading DOM runtime failures as diagram syntax failures.
- Extended [importFidelity.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/importFidelity.ts) and [applyCodeChanges.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/components/command-bar/applyCodeChanges.ts) so Mermaid warnings now flow into import reports instead of being silently treated as clean successes.
- Tightened class diagram export fidelity in [classDiagramMermaid.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/export/mermaid/classDiagramMermaid.ts) so relationship cardinalities already captured by the parser, such as `User "1" o-- "*" Account`, now round-trip instead of being silently dropped on export.
- Tightened ER diagram export fidelity by separating editor-facing field formatting from Mermaid-facing field formatting:
  - [entityFields.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/entityFields.ts) now includes a Mermaid-specific serializer that emits valid `type name` ER field syntax and preserves `REFERENCES` metadata.
  - [erDiagramMermaid.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/export/mermaid/erDiagramMermaid.ts) now uses that serializer so exported ER diagrams no longer degrade field order or silently drop foreign-key references.
- Tightened journey export fidelity so imported titles now round-trip instead of being overwritten by a hardcoded fallback:
  - [journey/plugin.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/diagram-types/journey/plugin.ts) now preserves the Mermaid `title` value on journey nodes.
  - [journeyMermaid.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/export/mermaid/journeyMermaid.ts) now exports the preserved title instead of always writing `title Journey`.
- Tightened mindmap wrapper fidelity so supported Mermaid wrapper syntax now round-trips instead of being flattened into plain labels:
  - [mindmap/plugin.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/diagram-types/mindmap/plugin.ts) now preserves wrapper metadata such as `((...))`, `[[...]]`, and `{{...}}` on parsed nodes.
  - [mindmapMermaid.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/export/mermaid/mindmapMermaid.ts) now re-emits those wrappers during export.
- Tightened studio Mermaid preview UX in [useStudioCodePanelController.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/components/studio-code-panel/useStudioCodePanelController.ts) so partially editable Mermaid drafts no longer present the same preview copy as clean imports. The preview now explicitly says `Ready with warnings` and calls out partial editability before apply.
- Centralized Mermaid import-state presentation in [importStatePresentation.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/mermaid/importStatePresentation.ts) and reused it across:
  - studio preview copy
  - command-bar Mermaid import summaries
  - paste-path warning toasts
  This removes state-specific wording drift between entrypoints.
- Extended Mermaid diagnostics snapshots in [types.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/store/types.ts) so `importState` now travels with the diagnostic payload. That gives downstream UX a stable way to distinguish `editable_partial`, `unsupported_construct`, and `invalid_source` instead of inferring from generic warnings/errors.
- Tightened blocked-state guidance so unsupported Mermaid families and constructs now surface actionable fallback messaging instead of only raw parser errors:
  - [importStatePresentation.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/mermaid/importStatePresentation.ts) now exposes shared guidance text per import state.
  - [applyCodeChanges.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/components/command-bar/applyCodeChanges.ts), [useFlowCanvasPaste.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/components/flow-canvas/useFlowCanvasPaste.ts), and [useStudioCodePanelController.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/components/studio-code-panel/useStudioCodePanelController.ts) now reuse that guidance so unsupported Mermaid reads like an intentional fallback path.
- Centralized Mermaid diagnostics snapshot creation in [diagnosticsSnapshot.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/mermaid/diagnosticsSnapshot.ts) and enriched the snapshot contract with:
  - `statusLabel`
  - `statusDetail`
  This makes the stored diagnostics payload immediately usable by future UI surfaces instead of forcing each surface to recompute Mermaid state meaning from raw errors and warnings.
- Added Mermaid source preservation to the diagnostics snapshot contract:
  - [diagnosticsSnapshot.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/mermaid/diagnosticsSnapshot.ts) now carries `originalSource`
  - [MermaidDiagnosticsBanner.tsx](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/components/MermaidDiagnosticsBanner.tsx) now tells the user that the original Mermaid source is preserved and points them back to Mermaid code for safe recovery
  This is the first concrete step toward a true source-preserving fallback mode instead of warning-only UX.
- Tightened the recovery/reporting layer for Mermaid:
  - [importFidelity.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/importFidelity.ts) now summarizes Mermaid imports with human-readable state labels instead of raw enum codes.
  - [ImportRecoveryDialog.tsx](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/components/ImportRecoveryDialog.tsx) now shows Mermaid-specific status and recovery guidance when the failed import came from Mermaid.
- Added a real shell-level Mermaid recovery action instead of banner-only messaging:
  - [MermaidDiagnosticsBanner.tsx](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/components/MermaidDiagnosticsBanner.tsx) now supports an optional action button.
  - [useFlowEditorController.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/components/flow-editor/useFlowEditorController.ts) now exposes the existing `openStudioCode` controller action to shell consumers.
  - [FlowEditor.tsx](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/components/FlowEditor.tsx) now wires preserved-source Mermaid diagnostics to an `Open Mermaid code` action that takes the user straight into Mermaid code mode for recovery.
- Extended the same recovery path into failed Mermaid import flows:
  - [ImportRecoveryDialog.tsx](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/components/ImportRecoveryDialog.tsx) now supports an optional recovery action alongside retry/dismiss.
  - [FlowEditor.tsx](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/components/FlowEditor.tsx) now passes `Open Mermaid code` into the import recovery dialog when the failed import is Mermaid and preserved Mermaid source is available in diagnostics.
- Moved preserved Mermaid source into the import report contract itself:
  - [importFidelity.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/importFidelity.ts) now carries `originalSource` on Mermaid reports.
  - [applyCodeChanges.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/components/command-bar/applyCodeChanges.ts) now persists the original Mermaid source into manual Mermaid import reports across blocking, failure, warning, and success-with-fallback paths.
  - [ImportRecoveryDialog.tsx](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/components/ImportRecoveryDialog.tsx) now renders the preserved-source recovery note from the report itself.
  - [FlowEditor.tsx](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/components/FlowEditor.tsx) now prefers report-owned Mermaid source for recovery actions instead of relying only on ambient global diagnostics.
- Expanded the compatibility corpus materially:
  - [mermaid-compat-fixtures.json](/Users/varun/Desktop/Dev_projects/flowmind-ai/scripts/mermaid-compat-fixtures.json) now covers 19 fixtures across flowchart, stateDiagram, sequence, classDiagram, erDiagram, mindmap, journey, architecture, and unsupported gitGraph.
  - [compatReportHarness.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/mermaid/compatReportHarness.test.ts) now asserts broader family coverage instead of only a minimal smoke baseline.
  - The expanded corpus surfaced one real upstream compatibility nuance: `REFERENCES CUSTOMER.id` in Mermaid ER fields is currently rejected by official Mermaid in this harness, so that fixture is now classified as officially invalid instead of silently assuming official compatibility.
- Expanded the compatibility corpus again to cover more invalid and partial-shape cases:
  - [mermaid-compat-fixtures.json](/Users/varun/Desktop/Dev_projects/flowmind-ai/scripts/mermaid-compat-fixtures.json) now covers 24 fixtures, adding invalid flowchart, sequence, stateDiagram, classDiagram, and journey cases.
  - The harness now distinguishes between true official-invalid cases and `environment_limited` cases where the current Node runtime cannot honestly validate an officially invalid expectation because Mermaid falls over on DOMPurify first.
- Fixed a real sequence activation fidelity bug across parser, renderer, and exporter:
  - [types.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/types.ts) now models `seqActivations` as explicit `{ order, activate }` events instead of a lossy number list.
  - [sequence/plugin.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/diagram-types/sequence/plugin.ts) now preserves explicit activation/deactivation events on participant nodes.
  - [sequenceMermaid.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/export/mermaid/sequenceMermaid.ts) now emits activation commands in the correct timeline position instead of front-loading them before all messages.
  - [SequenceParticipantNode.tsx](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/components/custom-nodes/SequenceParticipantNode.tsx) now renders activation bars from explicit activation ranges instead of assuming simple alternating start/end pairs.
- Fixed a real stateDiagram composite-label fidelity bug across parser and exporter:
  - [stateDiagramMermaid.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/export/mermaid/stateDiagramMermaid.ts) now preserves composite state labels by emitting `state "Label" as Alias {` when a composite state's display label differs from its node id.
  - [stateDiagram/plugin.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/diagram-types/stateDiagram/plugin.ts) now recognizes quoted composite aliases during parent reconstruction and supports quoted note targets in state note parsing.
  - [mermaidParser.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/mermaidParser.ts) now accepts broader state alias identifiers like `Working.Set` or `WorkingSet`.
- Tightened the generic flowchart parser so malformed-but-recoverable structure is no longer silently treated as a clean import:
  - [mermaidParserModel.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/mermaidParserModel.ts) now carries parser diagnostics alongside nodes and edges.
  - [mermaidParser.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/mermaidParser.ts) now emits diagnostics for invalid edge syntax, malformed subgraph declarations, unexpected block closers, unrecognized flowchart lines, and unclosed flowchart blocks.
  - [parseMermaidByType.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/mermaid/parseMermaidByType.test.ts) now asserts that these malformed flowchart cases downgrade to `editable_partial` instead of pretending the parse was fully clean.
- Tightened ER export compatibility against official Mermaid:
  - [entityFields.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/entityFields.ts) now emits Mermaid-compatible ER field references as `REFERENCES TABLE` and uses `UK` instead of `UNIQUE` for uniqueness markers in Mermaid export.
  - [erDiagram/plugin.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/diagram-types/erDiagram/plugin.test.ts) now covers the official-compatible table-only `REFERENCES` form.
  - [mermaid-compat-fixtures.json](/Users/varun/Desktop/Dev_projects/flowmind-ai/scripts/mermaid-compat-fixtures.json) now includes an officially valid ER field fixture using `FK REFERENCES CUSTOMER` plus `UK`, and the compatibility report shows that as a genuine official-valid case.
- Fixed a real sequence fragment fidelity gap across parser and exporter:
  - [sequence/plugin.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/diagram-types/sequence/plugin.ts) now preserves per-branch fragment metadata for `alt/else` and `par/and` instead of flattening every branch back to a generic fragment start.
  - [sequenceMermaid.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/export/mermaid/sequenceMermaid.ts) now emits `else ...` and `and ...` branch markers in the correct timeline position instead of incorrectly reopening a second `alt` or `par` block.
  - [mermaidBuilder.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/export/mermaidBuilder.ts) now recognizes fragment annotation nodes as part of sequence exports so mixed participant/note/fragment sequence canvases are exported through the sequence serializer instead of falling through to another family.
- Added a dedicated editable-partial regression corpus for malformed-but-recoverable Mermaid imports:
  - [editablePartialCorpus.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/mermaid/editablePartialCorpus.test.ts) now verifies malformed-but-editable cases across flowchart, stateDiagram, classDiagram, erDiagram, mindmap, and journey.
  - The corpus asserts that these cases stay importable, downgrade to `editable_partial`, and produce structured syntax diagnostics instead of silently looking like clean imports.
- Fixed a real stateDiagram export fidelity gap around explicit direction:
  - [stateDiagramMermaid.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/export/mermaid/stateDiagramMermaid.ts) now preserves an explicitly provided `direction LR/TB` during export instead of always re-inferring direction from node layout.
  - [mermaidBuilder.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/export/mermaidBuilder.ts) now passes the caller-provided direction through to the stateDiagram exporter just like the flowchart exporter already did.
- Tightened sequence fragment fidelity again by covering parallel branches as first-class Mermaid branches:
  - [remainingFamiliesRoundTrip.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/remainingFamiliesRoundTrip.test.ts) now verifies that `par ... and ... end` round-trips as `par/and` instead of degrading to repeated `par` openings.
  - [mermaid-compat-fixtures.json](/Users/varun/Desktop/Dev_projects/flowmind-ai/scripts/mermaid-compat-fixtures.json) now includes `state-direction-lr` and `sequence-par-and`, pushing the compatibility corpus to 29 fixtures.
- Fixed a real classDiagram export fidelity gap for generic identifiers:
  - [classDiagramMermaid.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/export/mermaid/classDiagramMermaid.ts) now converts internal generic identifiers like `Repository<T>` back to Mermaid syntax like `Repository~T~` during export instead of leaking the normalized internal form.
  - [remainingFamiliesRoundTrip.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/remainingFamiliesRoundTrip.test.ts) now verifies generic class identifiers and generic relation endpoints round-trip honestly through parse/export/parse.
- Expanded malformed-but-recoverable coverage for sequence imports:
  - [editablePartialCorpus.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/mermaid/editablePartialCorpus.test.ts) now includes a sequence case with one valid message followed by a malformed message, verifying that sequence imports can stay editable as `editable_partial` with syntax diagnostics.
  - [mermaid-compat-fixtures.json](/Users/varun/Desktop/Dev_projects/flowmind-ai/scripts/mermaid-compat-fixtures.json) now includes `sequence-partial-after-valid-message`, pushing the compatibility corpus to 30 fixtures.
- Fixed a real architecture round-trip fidelity gap around titles:
  - [architecture/plugin.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/diagram-types/architecture/plugin.ts) now preserves `title ...` metadata on imported architecture nodes instead of discarding it during parse.
  - [architectureMermaid.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/export/mermaid/architectureMermaid.ts) now emits the preserved architecture title back into Mermaid export.
  - [architectureRoundTrip.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/architectureRoundTrip.test.ts) now verifies title preservation through parse/export/parse.
- Expanded editable-partial coverage to architecture recovery cases and tightened the corpus contract:
  - [editablePartialCorpus.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/mermaid/editablePartialCorpus.test.ts) now includes an architecture implicit-node recovery case and asserts expected structured diagnostic codes per corpus case instead of incorrectly assuming every partial import is `MERMAID_SYNTAX`.
  - That keeps recovery-driven partial imports like architecture implicit-node creation measured honestly as `MERMAID_RECOVERY` instead of weakening the corpus with a false generic assertion.
- Expanded the compatibility harness to cover architecture titles explicitly:
  - [mermaid-compat-fixtures.json](/Users/varun/Desktop/Dev_projects/flowmind-ai/scripts/mermaid-compat-fixtures.json) now includes `architecture-title-basic`, pushing the compatibility corpus to 31 fixtures.
  - [compatReportHarness.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/mermaid/compatReportHarness.test.ts) was raised accordingly so title preservation is tracked in the corpus, not just unit tests.
  - The harness also surfaced another real upstream constraint: official Mermaid still reports the architecture-title fixture as `environment_limited` in this Node runtime because the same DOMPurify/browser assumption affects that path too.
- Fixed a real mindmap round-trip fidelity gap around Mermaid alias prefixes:
  - [mindmap/plugin.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/diagram-types/mindmap/plugin.ts) now preserves alias prefixes for wrapped Mermaid mindmap nodes like `root((Root))` and `feature[[Topic]]` instead of dropping them when the structured node tree is built.
  - [mindmapMermaid.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/export/mermaid/mindmapMermaid.ts) now emits preserved aliases back into Mermaid export for wrapped mindmap nodes.
  - [mindmap/plugin.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/diagram-types/mindmap/plugin.test.ts) and [remainingFamiliesRoundTrip.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/remainingFamiliesRoundTrip.test.ts) now verify alias preservation through parse/export/parse.
- Updated tests in:
  - [parseMermaidByType.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/mermaid/parseMermaidByType.test.ts)
  - [importFidelity.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/importFidelity.test.ts)
  - [remainingFamiliesRoundTrip.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/remainingFamiliesRoundTrip.test.ts)
- Expanded flowchart parser fidelity for modern architecture-style Mermaid syntax:
  - [mermaidParserHelpers.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/mermaidParserHelpers.ts) now preserves annotation-only `@{ ... }` label and shape metadata without requiring legacy bracket syntax.
  - [mermaidParserHelpers.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/mermaidParserHelpers.ts) now accepts dotted Mermaid ids like `api.gateway`, `db.primary`, and `cluster.api` across standalone nodes, inline edge endpoints, modern annotations, and subgraph ids.
  - [flowchartRoundTrip.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/flowchartRoundTrip.test.ts) now verifies dotted-id and modern-annotation flowcharts survive parse/export/parse without losing labels or endpoints.
- Expanded flowchart class styling fidelity:
  - [mermaidParserHelpers.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/mermaidParserHelpers.ts) now parses Mermaid `class A,B hot` assignment lines instead of silently skipping them.
  - [mermaidParser.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/mermaidParser.ts) now applies those class assignments to registered nodes, including dotted ids, so later `classDef` styling actually reaches the imported canvas nodes.
  - [mermaidParser.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/mermaidParser.test.ts) and [parseMermaidByType.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/mermaid/parseMermaidByType.test.ts) now cover class-assignment directives, dotted ids, and modern annotation-only nodes through both the raw parser and the higher-level Mermaid dispatcher.
- Expanded the compatibility corpus again:
  - [mermaid-compat-fixtures.json](/Users/varun/Desktop/Dev_projects/flowmind-ai/scripts/mermaid-compat-fixtures.json) now includes flowchart fixtures for `class` assignment lines and modern annotation+dotted-id combinations, pushing the tracked corpus to 33 fixtures.
  - [compatReportHarness.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/mermaid/compatReportHarness.test.ts) was raised accordingly so these flowchart constructs are now part of the ongoing compatibility scorecard, not one-off unit tests.
- Tightened flowchart export fidelity so imported styling semantics now survive round-trip instead of being flattened away:
  - [mermaidBuilder.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/export/mermaidBuilder.ts) now emits Mermaid `style ...` directives for node background/border/text colors and `linkStyle ...` directives for edge stroke color/width when those styles exist on the editable graph.
  - [exportService.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/exportService.test.ts), [flowchartRoundTrip.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/flowchartRoundTrip.test.ts), and [mermaidExportQuality.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/export/mermaidExportQuality.test.ts) now verify that Mermaid-imported `classDef`/`class` and `linkStyle` semantics survive parse/export/parse as concrete Mermaid directives.
- Tightened sequence fragment fidelity so notes inside control blocks no longer fall out of their Mermaid fragment context on export:
  - [sequence/plugin.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/diagram-types/sequence/plugin.ts) now preserves fragment metadata on note nodes created inside `alt`, `par`, and similar control blocks.
  - [sequenceMermaid.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/export/mermaid/sequenceMermaid.ts) now drives fragment open/close transitions for note timeline entries as well as message edges, so note export stays inside the correct Mermaid block.
  - [sequence/plugin.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/diagram-types/sequence/plugin.test.ts) and [remainingFamiliesRoundTrip.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/remainingFamiliesRoundTrip.test.ts) now verify note-in-fragment preservation through parse/export/parse.
- Tightened architecture round-trip fidelity for richer node kinds:
  - [architectureMermaid.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/export/mermaid/architectureMermaid.ts) now exports preserved architecture kinds like `person`, `container`, and `database_container` instead of collapsing everything non-group/non-junction back to `service`.
  - [architectureRoundTrip.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/architectureRoundTrip.test.ts) and [exportService.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/exportService.test.ts) now verify that richer architecture node kinds survive import/export/import honestly.
- Expanded the compatibility corpus again for these two families:
  - [mermaid-compat-fixtures.json](/Users/varun/Desktop/Dev_projects/flowmind-ai/scripts/mermaid-compat-fixtures.json) now includes `sequence-note-inside-alt` and `architecture-rich-node-kinds`, pushing the tracked corpus to 35 fixtures.
  - [compatReportHarness.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/mermaid/compatReportHarness.test.ts) was raised accordingly so these architecture/sequence cases stay part of the ongoing compatibility scorecard.
  - [entityFields.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/entityFields.test.ts)
  - [journey/plugin.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/diagram-types/journey/plugin.test.ts)
  - [mindmap/plugin.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/diagram-types/mindmap/plugin.test.ts)
  - [useStudioCodePanelController.test.tsx](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/components/studio-code-panel/useStudioCodePanelController.test.tsx)
  - [StudioCodePanel.test.tsx](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/components/StudioCodePanel.test.tsx)
  - [importStatePresentation.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/mermaid/importStatePresentation.test.ts)
  - [applyCodeChanges.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/components/command-bar/applyCodeChanges.test.ts)
  - [diagnosticsSnapshot.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/mermaid/diagnosticsSnapshot.test.ts)
  - [MermaidDiagnosticsBanner.test.tsx](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/components/MermaidDiagnosticsBanner.test.tsx)
  - [ImportRecoveryDialog.test.tsx](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/components/ImportRecoveryDialog.test.tsx)
  - [FlowEditor.test.tsx](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/components/FlowEditor.test.tsx)
  - [editablePartialCorpus.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/mermaid/editablePartialCorpus.test.ts)
  - [stateDiagramRoundTrip.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/stateDiagramRoundTrip.test.ts)
  - [compatReportHarness.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/mermaid/compatReportHarness.test.ts)

### Plan changes made during implementation

- Refined Phase 0 to include a hard distinction between `invalid_source` and `unsupported_family`.
  Why this improved reliability:
  The previous behavior told users that unsupported Mermaid families were "missing chart type declarations," which was false and damaged trust.
- Pulled the structured diagnostics work ahead of the official-parser integration.
  Why this improved reliability:
  The validator layer needs a stable result contract first; otherwise Phase 1 would add more branching without a clear outcome model.
- Added the validator seam before adding the dependency.
  Why this improved quality:
  It decouples contract work from package integration and keeps the parser entrypoint stable when the official Mermaid package is wired in.
- Split official Mermaid integration into a synchronous detection layer and an asynchronous full-validation layer.
  Why this improved reliability:
  Mermaid’s official parser is async, while the current editable import path is synchronous and widely used. Forcing a fake sync wrapper here would have been brittle and high-risk.

### Simplification / refactor pass

- Removed dead fallback control flow from [parseMermaidByType.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/mermaid/parseMermaidByType.ts) after the new finalize path made it redundant.
- Centralized Mermaid import-state classification so plugins do not need to duplicate contract logic.
- Simplified class relation export by giving [classDiagramMermaid.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/export/mermaid/classDiagramMermaid.ts) a single typed resolver for relation token, label, and cardinality metadata instead of reconstructing those pieces in multiple places.
- Avoided an ER editor regression by keeping the existing editor serializer in [entityFields.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/entityFields.ts) unchanged and adding a dedicated Mermaid serializer for export only.
- Avoided a broader document-model refactor for journey metadata by preserving the Mermaid title locally on journey nodes first, which improves round-trip fidelity now without adding a risky cross-format metadata layer in the same change-set.
- Avoided conflating Mermaid wrapper syntax with general node shape styling by preserving the original wrapper token separately in mindmap node data and using it only for Mermaid export.
- Avoided a larger studio preview state-model refactor by reusing the existing `ready` state and making the preview copy truthful for `editable_partial` drafts first.
- Avoided duplicating fallback copy yet again by introducing a shared import-state presenter instead of hardcoding separate strings in studio, import, and paste flows.
- Avoided inventing a new fallback mode in the same pass; instead, made the current blocked states self-explanatory first so the later render-only fallback can sit on a clearer product contract.
- Removed duplicated ad hoc Mermaid snapshot assembly from apply and paste flows so future diagnostics UI changes only need one contract update.
- Preserved original Mermaid source on blocked and partial paths so future fallback actions can operate on the exact user input instead of reconstructing it from diagnostics.
- Removed Mermaid-specific recovery wording drift between import reports and the recovery dialog by reusing the same import-state presenter there too.
- Reused the existing studio-opening controller action instead of adding a second Mermaid-recovery-specific navigation path in the view layer.
- Reused the same Mermaid recovery action contract in both the shell banner and the import recovery dialog so fallback behavior stays consistent across blocked Mermaid entrypoints.
- Removed the import recovery dialog's hidden dependency on global Mermaid diagnostics by storing preserved Mermaid source on the report itself, which makes failed Mermaid recovery more self-contained and reliable.
- Removed a hidden sequence export assumption that activation commands always alternate cleanly and can be reconstructed purely from count/order parity. That assumption was false and caused incorrect Mermaid round-trips.
- Removed a hidden stateDiagram export assumption that composite state ids and human-readable labels are interchangeable. That assumption was false and caused composite state labels to be dropped on round-trip.
- Removed a hidden flowchart import assumption that malformed structure without a hard parse failure should be treated as a clean editable import. That assumption was false and masked partial reliability problems.
- Removed a hidden ER export assumption that richer editor semantics like `UNIQUE` and `REFERENCES TABLE.field` automatically map to Mermaid’s officially accepted ER subset. That assumption was false; the exporter now uses the official-compatible token forms where available.
- Removed a hidden sequence export assumption that every fragment branch can be reconstructed as a fresh fragment start. That assumption was false and caused `else` and `and` branches to round-trip as the wrong Mermaid control syntax.
- Added a focused editable-partial corpus instead of burying malformed-but-recoverable cases inside unrelated happy-path tests, which keeps reliability regressions easier to diagnose family by family.
- Removed a hidden stateDiagram export assumption that layout shape is a safe substitute for an explicit Mermaid `direction` declaration. That assumption was false and caused honest `direction LR` inputs to drift on export.
- Removed a hidden sequence export assumption that only `alt/else` needed branch-kind preservation. Parallel `par/and` branches have the same fidelity requirement and are now covered the same way.
- Removed a hidden classDiagram export assumption that internal normalized generic identifiers are safe to emit directly as Mermaid source. That assumption was false and caused generic classes to export in a non-Mermaid form.
- Removed a hidden architecture import/export assumption that `title` is non-essential metadata. That assumption was false and caused architecture diagrams to lose document-level meaning on round-trip.
- Expanded the compatibility harness with title-bearing architecture input so document-level metadata fidelity is measured alongside graph-shape fidelity instead of remaining an untracked round-trip behavior.
- Removed a hidden mindmap parser assumption that alias-like wrapper prefixes were presentation-only. That assumption was false and caused valid Mermaid identifiers like `root((Root))` to disappear on export even though the node itself survived.

### Next recommended implementation steps

- Expand the fixture corpus behind [scripts/mermaid-compat-report.mjs](/Users/varun/Desktop/Dev_projects/flowmind-ai/scripts/mermaid-compat-report.mjs) into a real per-family compatibility harness.
- Introduce an async import preflight path in the command bar so official parse validation can run before editable conversion without forcing the entire canvas paste/import pipeline to become synchronous-in-name-only.
- Start parser-depth work with flowchart and architecture, using the new import-state and structured-diagnostics contract as the baseline.
