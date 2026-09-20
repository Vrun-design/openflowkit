# Legacy advanced-feature quarantine and replacement policy

Updated: 2026-09-20. Owner assessment: the existing GitHub/codebase diagram,
API/OpenAPI diagram, infrastructure sync, DSL, collaboration, and related advanced
workflows are unreliable and must not be treated as product foundations.

## Decision

Code presence, unit tests, UI entry points, demos, and historical parity work do
not establish that a feature works. Every legacy advanced feature begins v2 in
`QUARANTINED` status. V2 may reuse a small pure function only after it passes the
new contract and corpus. No roadmap estimate may assume a quarantined module saves
implementation time.

```text
QUARANTINED → SPECIFIED → CORPUS-PROVEN → INTEGRATED → CUSTOMER-PROVEN
      └──────────────────────────→ REPLACE / DELETE
```

Only `CUSTOMER-PROVEN` behavior can support a product claim. A feature can move
backward when a regression, silent loss, false claim, stale synchronization, or
recovery failure is found.

## Quarantined capability inventory

| Capability | Legacy evidence to inspect, not trust | V2 disposition |
| --- | --- | --- |
| GitHub/codebase diagrams | `githubFetcher`, codebase scanners/parsers/composers and MCP tools | Re-specify from source acquisition through evidence graph, native projection, refresh and review. Prefer deterministic manifests and narrow language adapters. |
| API diagrams | OpenAPI parser and prompt-driven OpenAPI-to-sequence/architecture paths | Replace with a versioned OpenAPI/AsyncAPI semantic importer. Separate declared endpoints/schemas/security from inferred runtime relationships. No prompt-only conversion qualifies. |
| Infrastructure sync | Terraform state, Kubernetes, Compose parsers, infra-to-DSL and sync UI/hooks | Rebuild as importer plus reconciliation engine with provenance, stable identity, diff preview, deletion policy and rollback. It must never imply deployment or bidirectional source control. |
| OpenFlowKit DSL | Multiple parser/exporter/linter/sanitizer implementations and conversions | Treat the language and implementations as unvalidated. Run a language decision before v2 depends on it; replace or version-break it if it cannot express the canonical model losslessly. |
| Collaboration | Yjs/WebRTC/signaling services, bridges, presence/comments and canonical collaboration experiments | Excluded from core v2 launch. Do not port. Reintroduce only from a new collaboration contract after single-user durability and agent concurrency are proven. Existing rooms/transports are not a backend plan. |
| Agent/MCP advanced tools | Existing six operations, DSL tools, codebase analysis and file store | Preserve as compatibility/research evidence. Rebuild against the complete capability manifest, canonical transactions, actual files, render verification and paired live mode. |
| AI generation/sync | Whole-document DSL prompts and provider paths | Replace with scoped proposals, typed operations, source evidence, validation, preview, stale-result rejection and atomic acceptance. |

This policy does not declare every line unusable. It declares every behavior
untrusted until proven under the new contracts.

## Reliability contract for source-backed features

Every repository, API, or infrastructure importer must provide:

1. **Pinned input identity:** source kind, repository/spec identifier, revision or
   content hash, parser version and configuration.
2. **Deterministic extraction:** the same supported input produces the same semantic
   facts and stable source keys without a model call.
3. **Evidence:** each fact records file/JSON pointer/range where possible and is
   labeled `observed`, `inferred`, or `manual`.
4. **Honest coverage:** supported, ignored, ambiguous and failed constructs appear
   in a machine-readable and human-readable report.
5. **Stable reconciliation:** refresh maps facts onto stable entity IDs, preserves
   manual geometry/style/annotations/routes, previews additions/changes/removals,
   and never converts uncertainty into deletion.
6. **Atomicity and recovery:** cancel/failure changes nothing; accept is one durable,
   reversible transaction; reopening yields the same result.
7. **Scale budgets:** bounded time, memory, output size and cancellation on agreed
   small/medium/large corpora, including malformed and adversarial inputs.
8. **Verification:** semantic assertions plus native render/export inspection; a
   generated DSL string or non-empty diagram is not success.
9. **No false agency:** reading infrastructure does not grant permission to deploy,
   mutate a repository, or rewrite a specification.

## DSL decision gate

Do not make the current DSL the v2 canonical document format. A textual language
can remain useful as an interchange or agent-authored representation only if it
earns that role.

V2-DSL-00 must compare three options:

- evolve and version the current DSL;
- use Mermaid for human text input plus canonical JSON for complete fidelity;
- define a new compact textual projection over canonical operations/entities.

The chosen language must have a written grammar and version, deterministic parser,
formatter and diagnostics; unambiguous IDs and escaping; pages, hierarchy, shapes,
text, assets, bindings, ports, connector intent/routes/labels, source evidence,
views and extensions; unknown-field preservation; bounded parsing; canonical
JSON round-trip expectations; and a documented unsupported-feature policy.

Required corpora include whitespace/comments, Unicode/RTL, long text, duplicate and
missing IDs, forward references, nested frames, parallel/self-loop connectors,
manual waypoints, assets, source evidence, unknown future fields, malformed input,
large files, and old DSL samples. Passing means semantic equivalence where promised,
not textual equality. If complete fidelity makes the language unreadable, keep JSON
canonical and scope the DSL honestly instead of forcing it to represent everything.

## Collaboration reset

Collaboration is a new product program after the single-user v2 core, not a legacy
module migration. Its future contract must define document authority, CRDT/operation
semantics, offline edits, reconnect/merge, undo ownership, presence, permissions,
assets, schema upgrades, encryption/privacy, room lifecycle, abuse/rate limits,
transport fallback, observability, load, recovery and cost.

Before implementation, run a transport/authority ADR and adversarial simulations:
two users plus an agent editing the same objects; reconnect after divergent offline
edits; schema mismatch; duplicate delivery; reordered operations; large assets;
host loss; permission revocation; and export during concurrent edits. Existing Yjs,
WebRTC and signaling code may inform the ADR but receives no architectural priority.

## Safe execution rules

- Keep quarantined features out of the v2 production dependency graph and navigation.
- Put every replacement behind its own feature flag and isolated storage namespace.
- Freeze legacy advanced features except critical customer data access or security
  fixes; do not continue parity work.
- Preserve user-owned source documents and export paths while replacing behavior.
- Each slice records files touched, flag, corpus, acceptance, failures and verified
  rollback. Do not mix a parser, reconciliation engine, UI and collaboration change
  into one change set.
- Delete legacy implementations only after the replacement is customer-proven or
  the product explicitly retires the workflow with an access/export plan.
