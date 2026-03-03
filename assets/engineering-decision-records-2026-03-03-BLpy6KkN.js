const e=`# Engineering Decision Records (2026-03-03)

This document captures the core Q1 architecture tradeoffs for routing, history, and determinism.

## EDR-001: Smart Routing Cost Control and Safety Mode

- Date: \`2026-03-03\`
- Status: \`Accepted\`
- Related execution items: \`P2-01\` .. \`P2-06\`

### Context

Large diagrams caused routing work to scale poorly during drag/layout interactions. Full-edge reroute during every drag frame risked UI jank.

### Decision

1. Profile routing pressure first with a dedicated benchmark mode (\`routing-hotspot\`).
2. During drag, reroute only edges connected to the actively moved node.
3. On drag stop, run full reconcile to restore global correctness.
4. Add size-based debounce for very large graphs at drag stop.
5. Add \`largeGraphSafetyMode\` (\`auto/on/off\`) that reduces visual cost under load.
6. Keep manual override so users can force behavior.

### Tradeoffs

- Pros:
  - Significant reduction in drag-phase routing work.
  - Preserves correctness via full reconcile path.
  - Safety mode protects large-graph usability.
- Cons:
  - More state/policy complexity.
  - Debounce introduces slight delayed final reconcile for very large graphs.

### Alternatives Considered

- Always full reroute on drag:
  - Rejected due to high per-frame cost.
- Disable smart routing by default:
  - Rejected because quality regresses for normal diagrams.

### Rollback / Controls

- Smart-routing and safety controls remain user-configurable.
- Behavior verified with dedicated routing tests and benchmark integrity checks.

## EDR-002: Store-Owned History Model V2 with Migration and Kill Switch

- Date: \`2026-03-03\`
- Status: \`Accepted\`
- Related execution items: \`P1-05\` .. \`P1-14\`

### Context

History ownership was split between hook-local runtime state and tab model state, creating divergence risk across tab switches and persistence/hydration flows.

### Decision

1. Move history source-of-truth into store/tab state (History V2 path).
2. Add deterministic trim policy using both count cap and estimated memory cap.
3. Ensure per-tab history continuity across tab switching.
4. Add persisted-state migration adapter for legacy payload normalization.
5. Promote V2 default ON with explicit environment kill switch (\`VITE_HISTORY_MODEL_V2=0\`).

### Tradeoffs

- Pros:
  - Deterministic behavior across tabs and reloads.
  - Better control of memory growth under heavy snapshot workloads.
  - Safer rollout due to kill switch and parity checks.
- Cons:
  - Increased store complexity.
  - Migration logic requires long-term maintenance.

### Alternatives Considered

- Keep hook-local history:
  - Rejected due to split-brain ownership and remount inconsistency risks.
- Hard cutover without kill switch:
  - Rejected due to rollout risk.

### Rollback / Controls

- Immediate rollback via \`VITE_HISTORY_MODEL_V2=0\`.
- Migration tests enforce legacy compatibility behavior.

## EDR-003: Deterministic Layout/Serialization as Default Contract

- Date: \`2026-03-03\`
- Status: \`Accepted\`
- Related execution items: \`P3-01\` .. \`P4-04\`

### Context

Diagram-as-code workflows need repeatable export/layout outcomes. Non-deterministic ordering creates noisy diffs and unstable round-trip behavior.

### Decision

1. Normalize layout input ordering with deterministic tie-breaks.
2. Add deterministic seed behavior where layout algorithms support it; deterministic input fallback otherwise.
3. Canonicalize JSON/DSL serialization ordering by default.
4. Provide explicit legacy export mode for compatibility-sensitive users.
5. Add round-trip diagnostics and schema/version compatibility policy:
  - actionable parser diagnostics (\`line\`, \`snippet\`, \`hint\`)
  - explicit JSON version handling (\`legacy\`, \`1.x\`, reject unknown future major)

### Tradeoffs

- Pros:
  - Stable exports and improved trust in diagram-as-code workflows.
  - Lower review noise in repo-based collaboration.
  - Better user guidance when parse/import fails.
- Cons:
  - More strictness can surface malformed inputs previously ignored.
  - Additional maintenance for compatibility docs/tests.

### Alternatives Considered

- Keep best-effort nondeterministic behavior:
  - Rejected due to repeatability and diagnostic quality gaps.
- Remove legacy mode:
  - Rejected to avoid compatibility shock for existing flows.

### Rollback / Controls

- Legacy serialization mode remains available.
- Compatibility matrix and tests define accepted schema boundaries.
`;export{e as default};
