# External-agent-native contract

Updated: 2026-09-20. Owner requirement: users must be able to operate OpenCanvas
through their own agents, including Claude and Codex. This is a release requirement,
not an optional integration after the built-in AI interface. Client names below are
integration targets, not claims of verified compatibility.

## Definition

Every shipped document-authoring capability has a discoverable, typed operation
usable by an external agent. Agents can inspect, create, edit, organize, render,
verify, correct, save, and export. Users can alternate manual and agent edits
without losing identity, history, or intent. Pointer gestures have semantic
equivalents; agents should not need to simulate mouse movements.

This means everything the product supports, within user-granted permissions. It
does not mean arbitrary code execution or universal compatibility with hosts that
cannot access the available transports. External agents use their own model access;
they need no OpenCanvas provider key. In-app BYOK is another optional entry point
to the same operations. No account or hosted application backend is required.

## Existing implementation and gap

`src/agent/actions/index.ts` registers six actions. The stdio server in
`mcp-server/src/index.ts` exposes these through `mcp-server/src/tools/diagram.ts`
along with create/open/save/export. `mcp-server/src/lib/documentStore.ts` holds an
in-process document map with explicit file reads/writes. The export tool returns
legacy nodes/edges. It does not attach to a live browser document.

`src/agent/webmcp.ts` registers browser actions only when `navigator.modelContext`
is available. This additional entry point cannot be the sole external-client
connection strategy. The shared action registry is useful but does not yet meet
the full capability or live-canvas requirement.

## Capability manifest

Maintain a versioned manifest mapping every shipped editor operation to its action
schema, result schema, permissions, transport support, and equivalence test. A new
authoring feature is incomplete until its manifest entry and agent test exist.

| Area | Required access |
| --- | --- |
| Discover | Capabilities/schema versions, shapes/styles, imports/exports, limits, searchable icons. |
| Read | Documents/pages, paginated object queries, text/style/geometry, topology/bindings, parents/layers/assets, revisions, live selection/camera. |
| Edit | Every supported object type; text, appearance, transforms, markers, ports, binding modes, labels, waypoints, route intent, strokes and media. |
| Organize | Pages, groups/frames, reparenting, layers/order, lock/hide, duplication, clipboard equivalents, delete, scoped layout, align/distribute, pinning. |
| Import/export | Mermaid with fidelity report/source, canonical/legacy import, assets, native save/bundle, SVG/PNG/PDF/JSON. |
| See results | Page/selection render or image artifact with bounds, revision, diagnostics; semantic read fallback for clients without image support. |
| Compose | Atomic batches, temporary IDs for new objects, validation, preview/diff, commit/cancel, structured errors. |
| Iterate | Change summaries, conflicts, request deduplication, undo/redo, save state, long-job status/cancellation, reconnect/resume. |
| Navigate live | Focus/select, fit, switch page, explicitly identify paired tab/document; session operations stay separate from document history. |

Browser-only export implementations need a packaged local render adapter or an
explicit connected-browser execution path. Report available capabilities precisely;
do not advertise headless PNG/PDF parity before its runtime is delivered and tested.

## File mode and live mode

**File mode:** a local MCP process opens a user-selected canonical file/bundle,
edits transactionally, and explicitly saves. Use atomic temporary-file replacement,
revision/content-hash preconditions, bounded granted paths, recovery snapshots,
and outside-file-change detection. A successful in-memory edit is not a saved file.
No browser is required, subject to declared render capabilities. File mode never
implies access to browser IndexedDB.

**Live mode:** pair with one named tab/document. The browser remains authoritative;
agent requests enter its commit/history/persistence pipeline. Do not create another
writable document in the companion process. Return committed revision and save
state; expose human edits through notifications or revision polling. Never guess
the target from whichever tab happens to be active.

Recommended spike: extend the optional local MCP companion with a paired loopback
bridge to the browser. Agent-to-companion can remain stdio MCP; the browser channel
is a separate application transport. Bind loopback only, validate origins, use
short-lived authenticated pairing, scope to a document, and support revocation.
Prove secure-page/local-network browser behavior, packaging, and supported browsers
before accepting this transport. If unsuitable, evaluate an extension/native bridge;
do not silently introduce a hosted relay. File mode remains independently usable.

The companion is optional local software, not a hosted backend. Ordinary editing
remains a static local-first app. An arbitrary external process needs an explicit
connection mechanism to access private browser state. Cloud-only agent hosts unable
to reach local software are outside initial compatibility; publish that limitation.
Exact bridge choice remains a technical spike, not a claimed existing capability.

MCP defines local stdio and HTTP transport patterns. Pin a revision supported by
the packaged SDK and tested clients rather than relying on an untested draft.
[MCP transports](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports).
Use tools for operations and resources where supported for contextual reads, with
read-tool fallbacks. [Server primitives](https://modelcontextprotocol.io/specification/2025-06-18/server).

## Transactions and authorized autonomy

Requests carry document/page, expected revision, request ID, granted scope, and
typed operations. Results include base/result revisions, created/remapped IDs,
changed objects, warnings, save state, and relevant preview/export artifacts.
Repeated request IDs cannot duplicate edits. Stale writes return typed conflicts
for reread/replan. Bound batch/query sizes and paginate. Long jobs expose status
and cancellation. On disconnect, a transaction is committed or absent; its outcome
can be queried after reconnect.

Support session permissions: read-only, propose-for-review, and authorized direct
editing. Users grant document/workspace scope when connecting and can revoke it.
Within a direct-edit grant, ordinary reversible edits do not need UI confirmation
on every call. Proposals and direct edits share validation, history, and attribution.
Built-in AI defaults to proposals; that default does not restrict deliberate external
automation. Agent-host approval policies still apply.

Live history is chronological and shared with human edits. Ordinary undo affects
the latest transaction. An agent cannot silently rewind newer human work to remove
its older transaction; selective revert requires a validated inverse at the current
revision. File mode owns its history. Keep local transaction attribution without
provider keys or full prompts.

Document access does not grant credentials, arbitrary networking, shell execution,
or every local file. Imported text cannot widen permissions. Asset transfer uses
explicit supported operations and bounded grants.

## Journey J4 and release gates

From an external client: discover capabilities; open a file or pair a live canvas;
import Mermaid; add an icon and branch; adjust a connector; apply a theme; lay out
a selected subsystem; inspect a render; fix a label; export and save. A human moves
a node; the agent observes the new revision and continues without resetting it.

1. Achieve 100% capability coverage for shipped document-authoring operations.
   Document runtime/session differences; no silent UI-only authoring features.
2. Equivalent manual/agent operations produce equivalent records, history,
   persistence, and exports; no pointer simulation needed.
3. Run J4 in file and live modes with two independent clients, targeting a local-
   capable Claude client and a local-capable Codex client. Record actual product,
   version, transport, setup instructions, and artifacts. Do not conflate a vendor's
   desktop/CLI product with its cloud chat service.
4. Test stale edits, concurrent humans/two agents, retries, disconnect, revocation,
   invalid operations, batch failure, and cancelled jobs; no partial mutation.
5. Render/read/export results identify the same revision. Missing live connection
   or render adapter returns an honest capability error, never an old file copy.
6. Document setup, grants, recovery, provider ownership, offline behavior, and limits.

## Delivery integration

V2-01/02 must establish these contracts. Every feature slice adds manifest coverage
and equivalence tests. V2-10 includes full external-agent operations, atomic file
mode, live pairing/bridge, revision observation, and visual feedback in separate
reviewable sub-slices. V2-11 remains in-app BYOK UX. V2-13 exercises real-client J4;
V2-14 is blocked until both modes and the coverage gates pass.
