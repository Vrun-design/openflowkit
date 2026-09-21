# V2-00a baseline inventory

Inspected 2026-09-20 at `e70e15904229f365ef7e41cd3cdfe9d2cc3651ac` plus existing
uncommitted documentation edits. This is code evidence for the current delivery
slice, not another roadmap. Results and remaining gates live in
[implementation status](implementation-status.md).

## Reproduce

- `node scripts/v2-baseline.mjs --write`: source digest, candidate dependencies,
  exact file/line references, primitive inventory, fixture hashes, and unknowns.
- `node scripts/v2-baseline.mjs --check-fixtures`: compare current bytes against
  [the pinned fixture manifest](baseline-fixtures.json). Hash drift fails loudly;
  review the changed case before deliberately updating its pin.

Generated reports live under ignored `docs/evidence/v2-00/`. Counts are lexical
candidates, excluding test/spec files; they include definitions and references.
They are not verified dynamic writer counts or architectural enforcement.

| Signal | Files | Occurrences |
| --- | ---: | ---: |
| Legacy `useFlowStore` references | 60 | 214 |
| Legacy graph-write candidates | 37 | 122 |
| React Flow import candidates | 99 | 121 |
| Canonical-to-React Flow projection references | 12 | 25 |
| Selected theme-management import candidates | 4 | 5 |

The theme pattern only matches a narrow set of import paths. It is not the total
size of theme debt. Future checks should resolve imports/aliases with TypeScript
and trace production entrypoints before any deletion decision.

## Ownership and UI findings

| Source evidence | Implication | Removal/reuse gate |
| --- | --- | --- |
| `src/App.tsx` mounts existing editor under `ReactFlowProvider` | Existing app root is not an isolated v2 dependency boundary | V2-02/04 route must avoid legacy provider ownership |
| `OpenCanvasDocumentPage.tsx` imports store and `projectSceneDocumentToReactFlow`, calls `state.setNodes` and `state.setEdges` | Pixi rendering does not imply canonical-only authoring | V2-02 one commit service, then V2-15 retirement |
| `OpenCanvasSurface.tsx` also applies projected nodes/edges | Multiple editing bridges require caller/gesture mapping | Preserve v1 until equivalent production-controller gates pass |
| `FlowCanvas.tsx` calls setters after import layout | Import path owns additional graph writes | V2 import operations must use the same revisioned commit path |
| `src/components/ui/Button.tsx` imports `IS_BEVELED`; brand constant is true | Brand-global geometry remains coupled to controls | New internal primitives; preserve document appearance separately |
| Button has `focus:outline-none` without an explicit replacement ring in its base styles | Keyboard visibility needs actual-state verification | New primitives require visible focus before reuse |
| `src/index.css` combines app tokens, external font loading and global renderer overrides | Copying global stylesheet would carry unrelated dependencies | Isolated token namespace and scoped presentation styles |

Candidate adapter areas remain geometry, Pixi host, asset persistence, canonical
export, Mermaid parsing and storage. Passing kernel tests earns further evaluation,
not automatic v2 reuse. Existing GitHub/API/infra/DSL/collaboration remain quarantined.

## Fixtures and gaps

Six pinned inputs cover repository-owned performance JSON, Mermaid corpus, and
routing/persistence test-source assertions. The test sources are explicitly marked
as such; they are not portable customer documents. No private customer data was
collected. A hash detects drift, not fidelity or permission to republish.

Missing qualification inputs: actual legacy documents for each supported family,
custom themed/white-labelled diagrams, embedded/missing assets, unknown fields and
future versions, rotated/free-ended connectors, and customer-authorized failures.
V2-01 must establish expected migration output/invariants and preserve source hashes.

## Reference tasks and baseline policy

Use the defined J1 six-step branch revision, J2 subgraph/long-label/repeated-edge
Mermaid import, and J4 scoped agent work. The owner asked us to choose from the
specification. This does not establish measured customer pain frequency.

Current release-report script's blanket default-off flag assertion conflicts with
current default-on editor. Keep its result diagnostic. Do not change runtime flags
or call that report the v2 release gate. A versioned v2 policy with explicit route,
recovery, compatibility, and rollout evidence remains required in V2-00.

Retain existing bundle caps. This slice does not enter the app graph; its production
bundle delta is zero by construction. Measured current entry CSS is near its cap;
new design tokens must replace scoped old dependencies at cutover, not accumulate
another global stylesheet indefinitely. Do not set v2 GPU budgets from software WebGL.
