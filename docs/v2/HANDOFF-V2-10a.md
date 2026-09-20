# V2-10a — Agent proposals in the v2 editor (solo Opus build prompt)

Paste this whole file into a fresh Claude Code (Opus) session in
`/Users/varun/Desktop/Dev_projects/flowmind-ai`, branch `v2`. You build the entire
slice yourself — no cheaper model, no subagents unless you need a read-only scout.
Modes: caveman prose, ponytail code. Honest scoring; praise only when earned.

## 0. Ritual (do first, in this order)

1. `git status` must be clean on `v2`; HEAD should be `9422903` or later. Read
   `docs/v2/HANDOFF.md`, then the last two sections of
   `docs/v2/implementation-status.md` (V2-04e, V2-04f), then
   `docs/v2/agent-native-spec.md` sections "Existing implementation and gap",
   "Capability manifest", "Transactions and authorized autonomy".
2. Say back in 2 lines: goal + first action. Then write the spec (§4) as a
   checklist in your reply and start — Varun has pre-approved this slice; do not
   wait for a second go-ahead. Ask only if you hit a contradiction between this
   file and the code.
3. Kill stale dev/preview servers before any Playwright run
   (`lsof -ti :4191 :5173 :5199 | xargs kill -9`). A stale HMR server once cost an
   hour of phantom bugs.

## 1. Why this slice, and what "done" means

Everything built so far (revisioned session, stale rejection, inverses, single
commit path, isolated storage, editor shell) is substrate for one payoff: an
agent proposes edits, the human reviews, accepts atomically, and can undo — with
the same records, history and persistence a manual edit would produce. V2-10a is
the first real end-to-end proof of that inside `/v2/:id`. It is deliberately
provider-free: the proposal source is a deterministic local "agent" so the whole
loop is testable offline. BYOK/provider selection is V2-11, not this slice.

Destination (design for it now, build only 10a): external clients — Claude
Code, Codex, OpenCode — pair with the live canvas over MCP (V2-10c/d) and drive
every shipped authoring operation, canvas settings included, with the same
records a human edit produces (`agent-native-spec.md` gates 1–2). So the
proposal session you build here must be the object an external
"propose-for-review" request creates later: a plain data structure fed by
commands, no UI-only path, no React in `application/ai`. The panel is just the
first client.

Done = a user in `/v2/:id` can open the agent panel, request a proposal, see the
pending changes as a live ghost preview on the canvas and as a review list,
accept/reject per change, apply the accepted set as ONE undoable history entry
attributed to the agent, and undo it with ⌘Z. A proposal built on revision N is
refused with a visible stale state if the document is at N+1 when applied. All of
this has red→green unit tests, a Playwright gate, and evidence recorded.

## 2. State of the repo you inherit (verified 2026-09-20)

- Branch `v2`, HEAD `9422903`. All green: `npx tsc --noEmit`,
  `npx eslint src --max-warnings=0`, `npx vitest run` (2277 tests / 464 files),
  Playwright gates `scripts/check-v2-04.mjs` and `scripts/check-v2-polish.mjs`
  against `VITE_V2_EDITOR=1 npm run build` + `npx vite preview --host 127.0.0.1
  --port 4191` with `V2_BASE_URL=http://127.0.0.1:4191`.
- Dev: `VITE_V2_EDITOR=1 VITE_V2_LAB=1 npx vite --host 127.0.0.1 --port 5173` →
  `/#/v2/<id>` (editor) and `/#/_labs/v2` (design-system lab).
- Editor composition: `src/opencanvas/presentation/v2/V2EditorPage.tsx` owns
  `useDocumentSession` (`session.commit/undo/redo/revision/document`),
  `useV2Selection`, `useV2Camera`, `useV2Autosave`, `useV2Keyboard`,
  `useV2EditActions`; `V2Chrome` (doc bar, creation toolbar, camera controls,
  settings); `V2CanvasHost` (Pixi host, pointer, context bar, text overlay);
  `V2TreePanel`. Test hook `useV2TestApi` exposes `window.__V2__` (getState,
  getDocument, getNodeRect, getRenderDiagnostics) — extend it read-only.
- Session: `src/opencanvas/application/session/{types,session,useDocumentSession}.ts`.
  `commitSessionCommand(session, command, expectedRevision?)` throws
  `StaleSessionRevisionError` on mismatch. Undo/redo advance revision. This is
  the ONLY write path; `session-boundary.test.ts` and `v2Graph.test.ts` enforce it.
- Existing proposal engine (pure, store-free, already tested):
  `src/opencanvas/application/ai/sceneProposal.ts` —
  `buildAiSceneProposal(document, id, changes)`,
  `decideAiProposalChange(proposal, changeId, decision, base)`,
  `acceptedAiProposalCommand(proposal, current)` (returns a batch command or null;
  currently checks `document.updatedAt`, NOT session revision — you will add a
  revision-based precondition; keep the updatedAt one as belt-and-braces or
  replace it with a clear reason recorded in an ADR).
  `safeErrors.ts` classifies errors to `AiSafeError`.
- Agent actions (pure): `src/agent/actions/{addNode,connect,deleteNode,getDocument,
  moveNode,setLabel}.ts` via `defineAction.ts`; `src/agent/runAction.ts`
  `resolveAgentActionCommand(action, rawInput, document, pageId)` returns
  `{ command, output }` without applying. `src/agent/runInStore.ts` touches the
  legacy store — never import it from v2.
- Design-system components already exist and are demoed in
  `src/opencanvas/presentation/V2LabPage.tsx` (search `AgentPanel`,
  `ProposalReview`, `ProposalBar`, `PermissionPrompt`, `Composer`,
  `ProvenanceBadge`): `presentation/design-system/{AgentPanel,ProposalBar,
  ProposalReview,AgentPresence}.tsx`, exported from `design-system/index.ts`.
  `ProposalReview` props: `id, baseRevision, currentRevision, scopeLabel,
  changes: {id, kind: 'addition'|'modification'|'removal', label, reason?}[],
  decisions, onDecide, onApply(proposalId, expectedRevision, acceptedIds) =>
  Promise<void>, onDiscard, onHighlight?`. `ProposalBar` takes a `ProposalView`
  union (`working|ready|failed|applied`) and `onAccept(id, expectedRevision)`.
  Read the lab page to see the intended states before wiring; the lab is the
  visual contract.
- Live preview infrastructure: `PixiRendererHost.setTransformPreview(result)` and
  `PixiLiveTransformPreview` render transient nodes/connectors without touching
  the document. `V2CanvasHost.onStylePreview` shows the pattern for ghosting.
  For proposal ghosts you may either (a) reuse `setTransformPreview` with the
  proposal's preview nodes (cheap, moves/edits only) or (b) add a small
  `setProposalPreview(page | null)` on the host that renders the proposal
  `preview` page's added/changed objects at reduced alpha through the existing
  renderers. Pick the smallest thing that shows additions AND modifications;
  removals get a dashed outline or reduced alpha on the original. Record the
  choice in the ADR.
- Boundary rules: `src/opencanvas/v2Graph.test.ts` allows v2 roots to import only
  `V2_ROOTS + SHARED_KERNEL + ADOPTION_ALLOWLIST`. `oc/application/ai` and
  `src/agent` are NOT in either list today. Decide and record: add
  `application/ai` to `V2_ROOTS` (it is store-free and v2-owned) and add
  `src/agent/actions` + `src/agent/runAction.ts` to `SHARED_KERNEL` (store-free,
  shared with the MCP server). Do NOT allow `src/agent/runInStore.ts`,
  `src/agent/webmcp.ts` or `src/store/**`. If any of those files import the
  store transitively, split them first — the test will tell you.
- Rollout flags: `src/config/rolloutFlags.ts`. Add `v2Ai` (`VITE_V2_AI`,
  default off). Off-state: no agent panel entry point renders, nothing else
  changes. The roadmap row for V2-10 names this flag.
- Preferences and toasts already exist (`useV2Preferences`, `pushToast` in
  `V2EditorPage`). Announcements go through the existing `sr-only` live region.

## 3. Lessons that are now law

1. Slices ≤ 45 min each, one outcome, one gate command. This file is ~6 slices
   (§5); commit after each one, never one giant commit.
2. Test-first for logic: write the `*.test.ts` with the public API and expected
   results, watch it fail, make it green. Pixels get one screenshot plus Varun's
   eyes; Playwright asserts state, not pixels.
3. Evidence beats plausibility. Never write "should work". Run it. For anything
   about feel or input, open a headed Chromium with instrumentation and let Varun
   drive (V2-04f found a Chrome capture drop this way that headless never showed).
4. Two-strike rule: same fix fails twice → stop, list assumptions, test the one
   you are most sure of.
5. No `console.*` in source. No new check scripts beyond the one gate named
   below. No files outside the lists in §5 without saying so in the commit body.
6. Interaction conventions (Excalidraw/FigJam/tldraw): tools revert to Select
   after one create (Varun re-confirmed this — do not make tools sticky); Escape
   cancels gesture → disarms tool → clears selection → (new) closes proposal
   review if open; ⌘Z undoes the latest transaction whether human or agent.
7. Every recommendation names its tradeoff. Every "done" report separates
   Verified / Assumed / Unknown.
8. Ponytail: reuse before write, stdlib before custom, no interface with one
   implementation, no config for values that never change. Mark deliberate
   ceilings with `// ponytail: <ceiling>, <upgrade path>`.
9. Match surrounding code: comment density, naming, immutability (`readonly`
   everywhere in domain/application types), no default exports.

## 4. Spec (what you are building)

### 4.1 Domain/application (pure, tested first)

`src/opencanvas/application/ai/proposalSession.ts` (new) — the revision-aware
proposal lifecycle on top of `sceneProposal.ts`:

- `createProposal({ document, revision, source, changes, scope })` →
  `Proposal` with `baseRevision`, `status: 'pending'`, per-change decisions
  defaulting to `'accepted'` (agent output is opt-out, like a diff review),
  `preview` document, `error?`.
- `decideChange(proposal, changeId, decision, baseDocument)` — re-derives the
  preview from the base with rejected changes skipped (reuse
  `decideAiProposalChange`).
- `applyCommand(proposal, currentRevision, currentDocument)` → the single
  `batch` `DocumentCommand` labelled e.g. `Apply agent proposal (3 changes)` with
  `attribution: { kind: 'agent', source }` carried in the command's metadata if
  the command type has room; otherwise put attribution in the history entry via
  the session (check `application/history` for an existing label/metadata slot
  before inventing one). Throws `StaleProposalError` when
  `currentRevision !== proposal.baseRevision`. Returns `null` when nothing is
  accepted.
- `summarizeChanges(changes)` → `ProposalChange[]` for the design-system list:
  `kind` derived from command kind (`insert-*` → addition, `remove-*` → removal,
  else modification), `label` from the object (node label or id, connector
  endpoints), `reason` = the change explanation.
- Tests: `proposalSession.test.ts` — empty/duplicate changes rejected; preview
  equals sequential application; reject one → preview excludes it; apply at same
  revision returns one batch with only accepted commands; apply at revision+1
  throws `StaleProposalError`; attribution present; labels derived correctly for
  each of the six action kinds; idempotency — applying the same proposal id twice
  is refused (track `appliedProposalIds` in the hook state, not the domain).

`src/opencanvas/application/ai/localAgent.ts` (new) — the deterministic
proposal source so the loop works with no provider:

- `proposeFromIntent(document, pageId, intent: LocalAgentIntent)` returns
  `Omit<AiProposedChange,'status'>[]` built ONLY through
  `resolveAgentActionCommand` + the existing `src/agent/actions`. Intents to
  support (keep it tiny): `'add-step-after-selection'` (adds a rectangle to the
  right of the primary selected node and connects it), `'label-unlabeled'`
  (setLabel on nodes whose label is empty → "Step N"), `'tidy-row'` (moveNode to
  align selected nodes' y to the primary's y with 48px gaps). Each intent yields
  1–N atomic changes with a one-sentence explanation each.
- Tests: `localAgent.test.ts` — each intent on a fixture document produces the
  expected commands; results committed through the session equal the same
  commands committed manually (state-identical, reuse the pattern from
  `session-boundary`/V2-02 tests). This is release-gate 2 ("equivalent
  manual/agent operations produce equivalent records") in miniature.

### 4.2 Editor wiring

`src/opencanvas/presentation/v2/useV2Proposal.ts` (new hook) — holds
`proposal | null`, `phase` (`idle|working|ready|stale|applied|failed`),
`decisions`, `appliedIds`; exposes `request(intent)`, `decide`, `apply`,
`discard`, `highlightedChangeId`. `apply` calls `session.commit(command,
proposal.baseRevision)` — pass the expected revision so the session itself
rejects staleness; catch `StaleSessionRevisionError`/`StaleProposalError` →
`phase: 'stale'`. Working phase is synchronous for the local agent, but keep the
async shape (`Promise`) so V2-11 can plug a provider in without changing the UI.

`src/opencanvas/presentation/v2/V2AgentPanel.tsx` (new) — composes
design-system `AgentPanel` + `Composer` (or a minimal intent picker if
`Composer` is too provider-shaped; read it first) + `ProposalReview` +
`ProposalBar`. Opens from a new "Agent" button in `V2Chrome` (top-end slot,
behind `v2Ai`) and keyboard `⌘J`. Escape closes it after the gesture/tool/
selection Escape chain. Panel state (open/closed) is a preference, not history.

Canvas ghosting: while `phase === 'ready'`, `V2CanvasHost` shows the proposal
preview (see §2 for the two options). Hovering a review row highlights that
object (`onHighlight`). Ghost clears on apply/discard/stale.

Attribution surfaces: after apply, the history entry label reads as an agent
transaction; `ProvenanceBadge` shows on the review header; the `sr-only`
announcement says "Agent proposal applied: N changes. Press ⌘Z to undo."

Read-only documents (`load.readOnly`): the panel opens but `apply` is disabled
with the existing read-only reason.

`useV2TestApi`: add `getProposal()` → `{ phase, id, baseRevision, changeIds,
decisions }` and nothing that writes.

### 4.3 Gate

`scripts/check-v2-10a.mjs` (one new script, same shape as `check-v2-polish.mjs`,
run against the flag-on production build with `VITE_V2_EDITOR=1 VITE_V2_AI=1`):

1. New doc → create two shapes → select one → open agent (⌘J) → request
   `add-step-after-selection` → `getProposal().phase === 'ready'`, ghost visible
   (assert `getRenderDiagnostics()` shows a preview layer or the node count in
   the host's preview container — expose a boolean in diagnostics).
2. Reject one change → decisions reflect → apply → revision advanced by exactly
   1 → document contains only accepted objects → `⌘Z` restores the prior
   document byte-for-byte (`deepEqual` on `getDocument()`).
3. Stale path: request a proposal, then move a shape by mouse, then apply →
   `phase === 'stale'`, revision unchanged, a visible stale message in the
   ProposalBar/Review. Re-request works.
4. Read-only: not needed in the gate; unit-test the disabled state.
5. Flag off (`VITE_V2_AI` unset): the Agent button does not exist; ⌘J is inert.
   Do this as the last block by building once with the flag off, or assert via a
   second preview on port 4192 — either is fine, say which.
6. Zero page errors; screenshot `docs/evidence/v2-10a/review.png` and
   `stale.png` (directory is git-ignored).

### 4.4 Not in scope (say no)

Provider calls, API keys, settings UI for providers (V2-11). MCP/live bridge
(V2-10c/d). Multi-page. Free-text prompt → planner. Persisting proposals across
reload. Agent cursors/presence. Anything in `mcp-server/`.

## 5. Build order (commit after each; each ≤ 45 min)

1. **Boundary + flag.** Add `v2Ai` flag; extend `v2Graph.test.ts` lists per §2
   with a comment naming why; make sure `src/agent/actions/*` and `runAction.ts`
   really are store-free (grep their imports). Commit
   `chore(v2): v2Ai flag and agent boundary allowlist`.
2. **proposalSession** red→green. Commit `feat(opencanvas): revision-aware
   proposal session (V2-10a-1)`.
3. **localAgent** red→green including the manual/agent equivalence test. Commit
   `feat(agent): deterministic local proposal source (V2-10a-2)`.
4. **useV2Proposal + V2AgentPanel + chrome entry + keyboard**, with a
   `useV2Proposal.test.ts` (renderHook: request→ready, decide, apply at same
   revision commits once, apply after external commit → stale, discard clears).
   Commit `feat(opencanvas): agent panel with proposal review in v2 editor (V2-10a-3)`.
5. **Canvas ghost + highlight + attribution + announcements.** Add the host
   preview diagnostic. Commit `feat(opencanvas): proposal ghost preview and
   attribution (V2-10a-4)`.
6. **Gate + docs.** `scripts/check-v2-10a.mjs`, `docs/v2/implementation-status.md`
   section "V2-10a" using the required record format from
   `docs/v2/delivery-roadmap.md` ("Required record for each implementation
   change"), an ADR in `docs/v2/decision-records/` for the ghost-rendering choice
   and the revision-vs-updatedAt precondition, `docs/v2/HANDOFF.md` state/next
   update. Commit `docs(v2): V2-10a evidence, ADR, handoff`.

After step 6, run the full ritual: `npx tsc --noEmit && npx eslint src
--max-warnings=0 && npx vitest run`, both existing gates + the new one against a
fresh flag-on build, `git diff --check`. Paste outputs verbatim in your final
report. Then ask Varun for a 2-minute click-through and offer the headed capture
window if anything feels off.

## 6. Quality bar (what "100× dev" means here)

- Types first: every new public function has explicit input/output types; no
  `any`, no non-null assertions outside tests, `readonly` on all data.
- Errors are typed classes (`StaleProposalError extends Error` with `name`
  set) and surfaced to the UI as states, never swallowed. Silence ≠ fixed.
- One write path. If you find yourself calling `applyDocumentCommand` from
  presentation code, stop — that is what the session is for.
- No React state for things that change per frame; no effects that re-run every
  render (check deps; V2-04 lost an hour to one). Callbacks read refs.
- Accessibility floor: panel is a labelled region, review rows are focusable,
  accept/reject reachable by keyboard, announcements via the live region.
- Every file you add has a two-line header comment saying what it owns and what
  it deliberately does not (see `useV2Pointer.ts`, `sceneProposal.ts` for tone).
- Before reporting done, be your own hostile reviewer: empty selection,
  100-node page, proposal on a page whose primary node was deleted mid-review,
  double-click on Apply, undo then redo, flag off, read-only doc, unicode labels.

## 7. Final report format (mandatory)

```
Verified: <what you ran, with the exact commands and pasted tails>
Assumed:  <what you believe but did not run, and why it is probably safe>
Unknown:  <what could still be wrong; what Varun should click>
Commits:  <hashes + one line each>
Next:     <V2-10b/V2-05 pointer per HANDOFF.md>
```
