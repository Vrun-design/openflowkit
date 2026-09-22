---
title: Prompting agents
description: How to ask an MCP client or a bring-your-own-key model for a diagram that compiles.
---

The two agent paths — [MCP](/mcp-server/) and [BYOK](/ai-generation/) — both end in OpenFlow
DSL. What you ask for decides whether the result is usable.

## With MCP tools available

Let the client do the work in order: read the syntax, write the DSL, validate it, then create
the diagram. A prompt that names the tools gets a better result than one that just describes a
picture:

```text
Read the OpenFlow grammar, then create a checkout flow with a promo-code
branch. Validate the DSL before creating it, and screenshot the result.
```

In live mode the tools act on the document you see, so ask for changes in terms of what exists
(`the frame on the active page`, `the selection`) and the client will call `get_diagram` or
`list_diagrams` first.

## With a bring-your-own-key model

The assistant already sends the grammar and the frame you are editing, so the prompt should say
what the diagram *means*, not what syntax to use:

- name the family if you care (a sequence diagram, a state machine, a mind map);
- list the actors and systems, and the direction of the important flows;
- describe the branches and failure paths — they are the part models skip;
- say what the audience is, so detail level is right.

## What helps every time

- **One family per request.** Asking for "an architecture diagram and a sequence diagram" gets
  you one of them, badly.
- **Concrete names.** `Checkout API -> Payments`, not `service -> service`.
- **Ask for a review step.** `Validate before creating` for MCP; the BYOK path already shows a
  proposal you accept or reject.
- **Iterate in the text.** After the diagram lands, edit the DSL in the code panel; regenerating
  is faster than re-prompting.

## What not to ask for

- Mermaid, if the client can write OpenFlow DSL — conversion is an import path with reported
  losses ([Mermaid import](/mermaid-import/)).
- Manual coordinates. Layout is computed; use `pin` and `rank` only when you truly need to
  nudge the result.
- Features that do not exist: collaboration, share links, embedded viewers, slide decks,
  camera paths. Ask for what is in the [feature inventory](/introduction/) — or better, in the
  pages of this site.

## Where to go next

- [MCP Server](/mcp-server/) — the tool surface, with arguments.
- [AI generation](/ai-generation/) — the key-in-browser path.
- [OpenFlow DSL](/openflow-dsl/) — the language both paths write.
