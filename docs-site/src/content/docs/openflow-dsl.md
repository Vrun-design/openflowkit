---
draft: false
title: OpenFlow DSL
description: Use OpenFlow DSL as the editor-native text representation for OpenFlowKit diagrams.
---

OpenFlow DSL is the native text representation used by OpenFlowKit Studio. It is the best option when you want a code-first representation that stays close to the editor's own graph model.

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

```yaml
flow: "User Signup"
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
node signup [label: "Signup Form"]
node verify [label: "Verify Email"]
node success [label: "Workspace Ready", shape: capsule]
```

Good ids are:

- short
- lowercase
- semantic
- stable enough to survive edits

## Edges

Create edges with arrow syntax:

```text
signup -> verify
verify -> success
```

You can also attach labels or other edge-level metadata when the diagram needs explicit branch meaning.

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
- [Studio Overview](/studio-overview/)
- [Choose an Input Mode](/choose-input-mode/)
