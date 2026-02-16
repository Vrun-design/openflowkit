
OpenFlowKit uses a human-readable JSON structure to represent flows. This allows for programmatic generation and easy diffing in version control.

## Structure

A OpenFlowKit document consists of two main arrays: `nodes` and `edges`.

```json
{
  "nodes": [ ... ],
  "edges": [ ... ]
}
```

## Node Definition

Each node object requires a unique `id`, a `type`, and a `position`.

```json
{
  "id": "node-1",
  "type": "custom",
  "position": { "x": 100, "y": 100 },
  "data": {
    "label": "Login Service",
    "icon": "Database"
  }
}
```

| Property | Type | Description |
| :--- | :--- | :--- |
| `id` | string | Unique identifier for the node. |
| `type` | string | Node variant (e.g., 'custom', 'annotation'). |
| `position` | object | { x, y } coordinates. |
| `data` | object | Content and metadata. |

## Edge Definition

Edges connect two nodes via their IDs.

```json
{
  "id": "edge-1",
  "source": "node-1",
  "target": "node-2",
  "type": "smoothstep",
  "animated": true
}
```

> **Tip:** You can edit this JSON directly in the "Code" tab of the editor to make bulk changes.
