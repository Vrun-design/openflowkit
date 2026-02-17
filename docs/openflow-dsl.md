# 🧠 FlowMind DSL Syntax Guide (V2)

FlowMind uses a clean, human-readable DSL to define diagrams using text.
Version 2 introduces:

* Explicit node IDs
* Styling attributes
* Groups / containers
* Edge customization

---

# 1️⃣ Document Header

Every DSL file can begin with optional metadata:

```yaml
flow: "My Awesome Workflow"
direction: TB
```

### Fields

| Field       | Description                                                    |
| ----------- | -------------------------------------------------------------- |
| `flow`      | Title of the diagram                                           |
| `direction` | Layout direction: `TB` (Top to Bottom) or `LR` (Left to Right) |

---

# 2️⃣ Nodes

Nodes define diagram elements.

## Basic Syntax

```
[start] Start Process
[process] Handle Request
[end] End Process
```

---

## With Explicit IDs

Useful for clarity, especially in large flows.

```
[start] start: Start Process
[process] proc1: Handle Request
[end] end: End Process

start -> proc1
proc1 -> end
```

---

## With Attributes

Attributes use JSON-like syntax:

```
[process] p1: Critical Step { color: "red", icon: "alert-triangle" }
[system] db: Database { icon: "database" }
```

### Attribute Examples

| Attribute | Purpose               |
| --------- | --------------------- |
| `color`   | Override node color   |
| `icon`    | Add icon              |
| `style`   | Custom style modifier |

---

## Supported Node Types

| DSL Type    | Shape             | Default Color |
| ----------- | ----------------- | ------------- |
| `start`     | Capsule           | Emerald       |
| `end`       | Capsule           | Red           |
| `process`   | Rounded rectangle | Slate         |
| `decision`  | Diamond           | Amber         |
| `system`    | Custom node       | Violet        |
| `note`      | Sticky note       | Yellow        |
| `section`   | Group container   | Blue          |
| `container` | Generic group     | Gray          |

If a node is referenced in a connection but not declared, it defaults to `process`.

---

# 3️⃣ Edges (Connections)

Connections define flow between nodes.

## Basic Connection

```
Start Process -> Handle Request
```

---

## Edge Types

| Symbol | Meaning     |
| ------ | ----------- |
| `->`   | Solid line  |
| `-->`  | Curved line |
| `..>`  | Dashed line |
| `==>`  | Thick line  |

Example:

```
A ..> B
C ==> D
```

---

## Labeled Connections

Use pipes:

```
Is Valid? ->|Yes| Save Data
Is Valid? ->|No| Return Error
```

---

## Edge Attributes

```
A -> B { style: "dashed", label: "Async" }
```

---

# 4️⃣ Groups

Use `group` to cluster nodes.

```
group "Backend Services" {
    [process] api: API Server
    [system] db: Database
    api -> db
}
```

Groups help visually separate logical areas.

---

# 5️⃣ Comments

Lines starting with `#` are ignored.

```
# This is a comment
[start] Begin
```

---

# ✅ Complete Example

```yaml
flow: "User Login Flow"
direction: TB

# Define Nodes
[start] user: User
[process] login: Login Page { icon: "log-in" }

group "Authentication" {
    [system] auth: Auth Service
    [decision] check: Is Valid?
}

[end] dash: Dashboard
[end] err: Error

# Define Logic
user -> login
login -> auth
auth -> check

check ->|Yes| dash { color: "green" }
check ->|No| err { color: "red", style: "dashed" }
```

---

# 🤖 LLM Agent Prompt Template

If someone wants to generate FlowMind DSL using an LLM agent, they can paste the following prompt:

---

## Copy-Paste Prompt for LLM

```
You are an expert FlowMind DSL V2 generator.

Your job is to convert a user's workflow description into valid FlowMind DSL.

You must strictly follow the FlowMind DSL V2 specification defined below.

========================================
FLOWMIND DSL V2 SPECIFICATION
========================================

1. DOCUMENT HEADER (Required)

Every output MUST begin with:

flow: "Title Here"
direction: TB or LR

Rules:
- Always generate a meaningful title.
- Default to TB unless user clearly needs horizontal layout.

----------------------------------------

2. NODE DECLARATION RULES

Node syntax:

[type] id: Label { optional_attributes }

Example:
[process] p1: Handle Request
[decision] d1: Is Valid? { icon: "help-circle" }

Rules:
- ALWAYS use explicit IDs.
- IDs must be short, lowercase, no spaces.
- IDs must be unique.
- Use semantic naming (start, login, checkAuth, db, etc).
- Do NOT reuse labels as IDs.
- Do NOT skip node declarations.

If a node is referenced in a connection, it MUST be declared first.

----------------------------------------

3. SUPPORTED NODE TYPES

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
