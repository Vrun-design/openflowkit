---
draft: false
title: OpenFlow DSL
---

OpenFlow DSL is the native text representation used by OpenFlowKit Studio. It is the best option when you want a code-first representation that stays close to the editor's own graph model.

## Where it fits

Use OpenFlow DSL when you want:

- a readable editor-native syntax
- deterministic structural edits before layout
- a better fit than Mermaid for OpenFlowKit-specific workflows
- an easier target for AI-generated code than raw JSON

The Studio code panel can generate DSL from the current canvas and apply DSL back onto it.

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

You can add labels and other edge-level metadata:

```text
verify -> success [label: "Verified"]
verify -> retry [label: "Expired"]
```

## Typical node attributes

The visual node model supports a broad set of properties. In practice, the most useful attributes to express in DSL are:

- `label`
- `subLabel`
- `shape`
- `color`
- `icon`

For advanced families, the graph model also carries metadata for mind maps, journey nodes, architecture nodes, class diagrams, and ER diagrams.

## Example

```text
flow: "Payment Recovery"
direction: LR

node invoice [label: "Invoice Due", color: blue]
node charge [label: "Attempt Charge", color: emerald]
node decision [label: "Charge Successful?", shape: diamond, color: amber]
node retry [label: "Retry Sequence", color: violet]
node review [label: "Manual Review", color: slate]
node success [label: "Subscription Active", shape: capsule, color: emerald]

invoice -> charge
charge -> decision
decision -> success [label: "Yes"]
decision -> retry [label: "Retry"]
decision -> review [label: "Manual"]
```

## Editing workflow in Studio

The Studio code panel does three things:

1. generates current DSL from the canvas
2. previews whether your draft is valid
3. applies the parsed graph back to the editor

Use **Reset** if the draft diverges too far from the current canvas.

## When to choose OpenFlow DSL over Mermaid

Prefer OpenFlow DSL when:

- the diagram lives mainly inside OpenFlowKit
- you want fewer Mermaid translation constraints
- you want a format tailored to the editor's own graph model

Prefer Mermaid when:

- the diagram must also live in Markdown-heavy environments
- you already have Mermaid sources
- external tooling expects Mermaid syntax

## Recommended AI instruction

If you want another agent to write OpenFlow DSL for this app, give it these constraints:

```text
Generate OpenFlow DSL for OpenFlowKit.
Use explicit node ids.
Create a clear flow title and direction.
Prefer process, decision, start, end, and custom nodes unless a more specific family is required.
Label all meaningful branch edges.
Keep names concise and production-friendly.
```

Use ONLY these types:

start
end
process
decision
system
note
section
container

Guidelines:

start      → beginning of flow
end        → termination states
process    → actions or steps
decision   → branching logic
system     → external system/service/database
note       → annotations
section    → major grouped area
container  → generic grouping

----------------------------------------

4. NODE ATTRIBUTES (Optional)

Attributes use JSON-like syntax:

{ color: "red", icon: "database", style: "dashed" }

Rules:
- Only add attributes if meaningful.
- Keep styling minimal.
- Do not invent unsupported properties.

----------------------------------------

5. EDGES (CONNECTIONS)

Basic syntax:
id1 -> id2

Edge types:
->   solid
-->  curved
..>  dashed
==>  thick

Labeled edges:
id1 ->|Yes| id2

Edge with attributes:
id1 -> id2 { label: "Async", style: "dashed" }

Rules:
- Always connect using IDs, not labels.
- Decision nodes MUST use labeled edges.
- Every branch from a decision must be explicit.
- No floating nodes.

----------------------------------------

6. GROUPS

Use grouping when logical clustering exists.

Syntax:

group "Group Name" {
    node declarations
    internal connections
}

Rules:
- Groups should wrap related nodes only.
- Connections across groups should be declared outside the group block.

----------------------------------------

7. COMMENTS

Use # for comments sparingly.
Do not over-comment.

----------------------------------------

8. OUTPUT RULES (STRICT)

You MUST:

- Output ONLY valid FlowMind DSL
- Do NOT explain
- Do NOT use markdown formatting
- Do NOT wrap in code blocks
- Do NOT add commentary
- Do NOT describe what you are doing
- Do NOT output anything except the DSL

If user description is vague:
- Make reasonable assumptions
- Choose logical structure
- Keep flow clean and readable

========================================
LOGIC CONVERSION STRATEGY
========================================

When converting user input:

1. Identify:
   - Start event
   - End states
   - Actions
   - Decisions
   - External systems
   - Logical clusters

2. Convert:
   - Events → start / end
   - Actions → process
   - Branching → decision
   - Databases/APIs → system
   - Parallel logic → separate branches
   - Error paths → explicit end nodes

3. Ensure:
   - Every path leads to an end
   - No orphan nodes
   - Clean logical readability

========================================
USER REQUEST
========================================

Convert the following workflow description into FlowMind DSL V2:

{{USER_WORKFLOW_DESCRIPTION}}

Generate the DSL now.
```

---
