# FlowMind DSL Syntax Guide

FlowMind uses a concise, human-readable Domain Specific Language (DSL) to define diagrams textually. This sets it apart from verbose formats like JSON or XML.

## 1. Document Header
Every DSL file starts with optional metadata:

```yaml
flow: "My Awesome Workflow"
direction: TB
```
- `flow`: The title of the diagram.
- `direction`: Layout direction. `TB` (Top-to-Bottom) or `LR` (Left-to-Right).

## 2. Nodes
Define nodes using brackets for the type, followed by the label.

```
[start] Start Process
[process] Handle Request
[decision] Is Valid?
[end] End Process
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

*Note: If a node is used in an edge but not declared, it defaults to a `process` node.*

## 3. Edges (Connections)
Connect nodes using arrows. You can use node labels directly.

### Basic Connection
```
Start Process -> Handle Request
```

### Labeled Connection
Add text to the connection using pipes `|...|`.
```
Is Valid? ->|Yes| Save Data
Is Valid? ->|No| Return Error
```

## 4. Comments
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
[start] User Lands on Page
[process] Enter Credentials
[decision] Is Valid?
[system] Auth Service
[end] Dashboard
[end] Error Message

# Define Logic
User Lands on Page -> Enter Credentials
Enter Credentials -> Auth Service
Auth Service -> Is Valid?

Is Valid? ->|Yes| Dashboard
Is Valid? ->|No| Error Message
```
