# FlowMind DSL Syntax Guide (V2)

FlowMind uses a concise, human-readable Domain Specific Language (DSL) to define diagrams textually. V2 adds support for explicit IDs, styling attributes, and groups.

## 1. Document Header
Every DSL file starts with optional metadata:

```yaml
flow: "My Awesome Workflow"
direction: TB
```
- `flow`: The title of the diagram.
- `direction`: Layout direction. `TB` (Top-to-Bottom) or `LR` (Left-to-Right).

## 2. Nodes
Define nodes using brackets for the type. You can optionally provide an **ID** and **Attributes**.

### Basic Syntax
```
[start] Start Process
[process] Handle Request
[end] End Process
```

### With Explicit IDs
Useful for clearer connections or when labels are duplicate/long.
```
[start] start: Start Process
[process] proc1: Handle Request
[end] end: End Process

start -> proc1
proc1 -> end
```

### With Attributes
Customize node appearance using JSON-like syntax `{ key: "value" }`.
```
[process] p1: Critical Step { color: "red", icon: "alert-triangle" }
[system] db: Database { icon: "database" }
```

### Supported Types:
| DSL Type | Visual Appearance | Color |
| :--- | :--- | :--- |
| `start` | Rounded/Capsule | Emerald |
| `end` | Rounded/Capsule | Red |
| `process` | Rounded Rectangle | Slate |
| `decision` | Diamond | Amber |
| `system` | Custom Node | Violet |
| `note` | Sticky Note | Yellow |
| `section` | Group Container | Blue |
| `container`| Generic Group | Gray |

*Note: If a node is used in an edge but not declared, it defaults to a `process` node.*

## 3. Edges (Connections)
Connect nodes using arrows.

### Basic Connection
```
Start Process -> Handle Request
```

### Edge Styles
Visual sugar for common edge types:
- `->` : Default solid line
- `-->` : Curved line
- `..>` : Dashed line
- `==>` : Thick/Heavy line

```
A ..> B  # Dashed connection
C ==> D  # Thick connection
```

### Labeled Connection
Add text to the connection using pipes `|...|` or attributes.
```
Is Valid? ->|Yes| Save Data
Is Valid? ->|No| Return Error
```

### Edge Attributes
```
A -> B { style: "dashed", label: "Async" }
```

## 4. Groups
Group related nodes together using the `group` keyword.

```
group "Backend Services" {
    [process] api: API Server
    [system] db: Database
    api -> db
}
```

## 5. Comments
Lines starting with `#` are ignored.

```
# This is a comment
[start] Begin
```

## Example

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
check ->|No| err { color: "red", style: "dashed" } // Dashed error path
```
