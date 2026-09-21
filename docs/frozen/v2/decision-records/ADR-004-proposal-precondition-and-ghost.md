# ADR-004: Proposals precondition on session revision; ghosts render as a separate Pixi layer

Accepted: 2026-09-20 (V2-10a).

- **Revision, not `updatedAt`, is the proposal precondition.** `applyCommand`
  throws `StaleProposalError` when `currentRevision !== baseRevision` and the
  editor commits with `session.commit(command, baseRevision)` so the session
  rejects the same mismatch independently (`StaleSessionRevisionError`). Every
  commit, undo and redo moves the revision; `updatedAt` only changes when a
  command stamps it, so it cannot see an undo. The `updatedAt` check inside
  `acceptedAiProposalCommand` stays as belt-and-braces because it is free and
  protects callers that hold no session (file-mode MCP).
- **Attribution lives on the batch command.** `BatchDocumentCommand.attribution
  = { kind: 'agent', source, proposalId }`; the inverse carries it. History has
  no metadata slot and adding one would duplicate the command's. The proposal id
  doubles as the idempotency key external clients will send.
- **Non-rejected changes ship.** The review UI toggles decisions back to
  `pending`; preview and batch both treat `pending` as accepted. One rule in
  one place (`sceneProposal.ts`).
- **Action batches flatten one level.** `connect` and `delete_node` return
  batches; the executor forbids nesting. Flattening keeps one history entry per
  proposal without teaching the executor recursion.
- **Ghost = `PixiProposalPreview`, not `setTransformPreview`.** The transform
  preview hides originals, draws a selection frame and only knows nodes that
  exist in the page index; proposal ghosts must show additions and cannot
  collide with a live drag. The new layer draws the proposal preview page
  through the existing node/connector renderers at 0.55 alpha, restricted to
  structurally changed ids, dashes removed nodes' bounds and outlines the
  hovered row's objects. It redraws on page and zoom change and reports
  `proposalPreviewVisible` in diagnostics. Cost: one extra scene index build
  per redraw (O(n)); acceptable at the current page sizes, revisit with
  viewport culling if a 1k-node ghost ever appears.
