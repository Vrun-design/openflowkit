---
draft: false
title: OpenFlow DSL
description: Use OpenFlow DSL as the editor-native text representation for OpenFlowKit diagrams.
---

OpenFlow DSL is the native text representation used by OpenFlowKit Studio. It is the best option when you want a code-first representation that stays close to the editor's own graph model.

## Smallest example

```openflow
flowchart
Client -> API : request
API -> Database : query
```

## Where it fits

Use OpenFlow DSL when you want:

- a readable editor-native syntax
- deterministic structural edits before layout
- a better fit than Mermaid for OpenFlowKit-specific workflows
- an easier target for AI-generated code than raw JSON

The Studio code panel can generate DSL from the current canvas and apply DSL back onto it.

Use Mermaid instead when ecosystem compatibility matters more than editor-native fidelity. See [Mermaid vs OpenFlow](/mermaid-vs-openflow/).

## Basic document structure

Start with a header:

```text
flow: User Signup
direction: TB
```

Common direction values:

- `TB`
- `LR`
- `RL`
- `BT`

## Nodes

Use explicit node declarations with stable ids.

```text
[start] start
[process] signup: Signup Form { icon: "UserPlus", color: "blue" }
[process] verify: Verify Email { icon: "Mail", color: "violet" }
[end] success: Workspace Ready { color: "emerald" }
```

Good ids are:

- short
- lowercase
- semantic
- stable enough to survive edits

## Edges

Create edges with arrow syntax:

```text
start ==> signup
signup -> verify
verify ==> success
```

You can attach labels with inline branch syntax:

```text
[decision] approved: Approved? { color: "amber" }
verify -> approved
approved ->|Yes| success
approved ->|No| signup
```

Common edge styles are `->` for default flow, `==>` for primary flow, `-->` for secondary flow, and `..` for dotted async or optional relationships.

## Why teams use it

OpenFlow DSL is useful when:

- OpenFlowKit is the primary editing environment
- you want a reviewable text representation without committing to Mermaid’s constraints
- you want a format that maps more directly to editor-native concepts
- you want AI to target a structure that is closer to the actual canvas model

## Recommended workflow

Use DSL when you want to control the structure, then switch back to the canvas for final visual tuning. It is especially useful for:

- architecture drafts
- system workflows
- iterative AI-assisted editing where text inspection matters

## Related pages

- [Mermaid vs OpenFlow](/mermaid-vs-openflow/)
- [MCP Server](/mcp-server/)
- [Studio Overview](/studio-overview/)
- [Choose an Input Mode](/choose-input-mode/)
