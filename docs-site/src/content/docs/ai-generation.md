---
title: AI generation
description: Bring your own key — describe a diagram, review the proposal, accept it as one undo step.
---

OpenFlowKit's assistant turns a prompt into a diagram without a hosted service in between: your
browser calls the provider you configured, directly, with your key. The provider's answer is
compiled by the same DSL compiler as everything else, then shown for review.

## Set up a provider

Press `⌘J` for the assistant panel and open its provider dialog. Pick a provider and paste a
key. The model field suggests that provider's current models and accepts any id; the base URL
sits under **Endpoint**. **Test key** asks the provider for one short response.

Each provider keeps its own key, marked with a dot on its tile, so switching providers never
sends one vendor's key to another; **Clear all keys** removes every one. Keys are stored in this
browser's `localStorage` and sent only to the provider they were entered for. There is no OpenFlowKit account and no relay: if the request fails, the error names the
cause — bad key, unknown model, rate limit, network.

## Ask for a diagram

Type what you want, in plain language: what it is for, the systems or actors, the important
branches, the direction if it matters. To refine an existing diagram, open its code panel first
— the assistant includes the current frame's DSL in the request, and the result is a proposal
against that frame instead of a new one.

Every request also carries the canonical grammar, so the model writes OpenFlow DSL rather than
inventing a syntax.

## Review, then accept

The reply is converted to DSL, compiled, and shown as a **proposal**:

- a ghost preview of the result on the canvas;
- the list of changes, which you can step through and reject one by one;
- **Accept**, which applies the proposal as a single undo step.

A proposal built against a document that changed while you were reviewing is marked stale and
cannot be applied — ask again.

## What it cannot do

- **No provider list here on purpose.** The catalogue lives in the panel; the providers,
  endpoints and wire formats change independently of this page.
- **No chat.** One prompt, one proposal; the model does not see the conversation beyond the
  grammar and the current frame.
- **No server-side AI.** No OpenFlowKit proxy, key escrow or usage metering.
- **No streaming edits.** The proposal lands complete; it never typewrites onto the canvas.

## Where to go next

- [MCP Server](/mcp-server/) — the other agent path, driven by your own MCP client.
- [OpenFlow DSL](/openflow-dsl/) — what the model is asked to write.
