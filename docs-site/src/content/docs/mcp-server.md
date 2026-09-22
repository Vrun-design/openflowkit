---
title: MCP Server
description: Drive the live editor or edit .openflow.json files from any MCP client — the full tool surface, generated from the manifest.
---

:::note[Generated]
This page is generated from `src/agent/manifest.ts`, `src/agent/ops/` and the tool registrations under `mcp-server/src` by `npm run generate:refs`. Edit the source, not this page.
:::

OpenFlowKit ships a local MCP server: a stdio process that gives Claude Desktop, Claude
Code, Cursor, Windsurf and anything else that speaks MCP a set of diagram tools. It runs on
your machine, needs no API key of its own, and returns deterministic results — your MCP
client's model does the thinking.

## Run it

```bash
npx -y @vrun-design/openflowkit-mcp
```

Point your client at that command. In Claude Desktop's `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "openflowkit": { "command": "npx", "args": ["-y", "@vrun-design/openflowkit-mcp"] }
  }
}
```

Node 18 or newer is required.

## Two modes

- **Live** — open the app, click **Connect agent**, and every op runs against the document
you see. The bridge listens on `127.0.0.1:43119` by default (change it in Settings), checks
the request origin, and can be gated with a shared token. Edits land as one undo step per
call; `screenshot` returns a real PNG; `fit_view` moves your view.
- **File** — `openflow_open` a `.openflow.json` path and the same ops run headlessly on
that document, with `openflow_save` writing it back. There is no canvas here, so PNG/GIF/
MP4/WebM export and `screenshot` ask you to connect the live editor; SVG, animated SVG and
JSON export work.

If no editor is paired, pass `documentId` (from `openflow_open`) to target a file-mode
document; without it, tools use the paired editor or the first open document.

## Document and server tools

| Tool | What it does |
| --- | --- |
| `analyze_codebase` | Scan a repository and suggest architecture elements |
| `discover_architecture` | Derive an architecture model from a repository |
| `drift_report` | Compare a model against the repository; matches by name and tech only |
| `explain_element` | What the model says about one element, plus linked ADR markdown |
| `get_starter_template` | One starter template, by name |
| `list_diagram_node_types` | Family names, shape words and edge styles |
| `list_starter_templates` | List the starter DSL templates |
| `openflow_create` | Create an empty file-mode document |
| `openflow_open` | Load a .openflow.json from disk into file mode |
| `openflow_save` | Write a document back to disk |
| `server_info` | Server name, version and capabilities |
| `validate_openflow_dsl` | Parse DSL with the real parser and return its diagnostics |
| `whoami` | Which mode the server is in, and which documents it holds |

## Resources and prompts

The server also exposes MCP resources: `grammar`, `icons-by-provider`, `icons-catalog`, `template`, `templates-catalog` — the
grammar, the icon catalogs and the starter templates. Three prompts steer a client toward
the right tools: `flowchart_from_description`, `convert_mermaid_to_openflow` and
`architecture_from_codebase`.

## The operations

One MCP tool per operation; every mutating op has an inverse, and the live editor applies it
as a single undo step. The manifest names the human operation each one mirrors.

### `create_diagram`

Create diagram — mirrors **Generate diagram from code** in the code panel; changes the document (one undo step in live mode).

| Argument | Type |
| --- | --- |
| `dsl` | string |
| `pageId` | string *(optional)* |
| `at` | object: x (number), y (number) *(optional)* |
| `palette` | `pastel` \| `paper` \| `builder` \| `mono` *(optional)* |

### `update_diagram`

Update diagram — mirrors **Regenerate a diagram frame** in the code panel; changes the document (one undo step in live mode).

| Argument | Type |
| --- | --- |
| `frameId` | string |
| `dsl` | string |
| `palette` | `pastel` \| `paper` \| `builder` \| `mono` *(optional)* |

### `get_diagram`

Read diagram — mirrors **Edit as code** in the context bar; read-only.

| Argument | Type |
| --- | --- |
| `frameId` | string *(optional)* |
| `pageId` | string *(optional)* |

### `list_diagrams`

List diagrams — an agent-only lookup; read-only.

Takes no arguments.

### `get_syntax`

Read the grammar — an agent-only lookup; read-only.

| Argument | Type |
| --- | --- |
| `family` | string *(optional)* |

### `search_icons`

Search icons — an agent-only lookup; read-only.

| Argument | Type |
| --- | --- |
| `query` | string |
| `limit` | number *(default `10`)* |

### `find_icons_for`

Find icons for a concept — an agent-only lookup; read-only.

| Argument | Type |
| --- | --- |
| `concept` | string |
| `limit` | number *(default `8`)* |

### `move`

Move shapes — mirrors **Move / nudge shapes** in a canvas gesture; changes the document (one undo step in live mode).

| Argument | Type |
| --- | --- |
| `ids` | string[] |
| `to` | object: x (number), y (number) *(optional)* |
| `delta` | object: x (number), y (number) *(optional)* |

### `style`

Style shapes — mirrors **Fill / stroke / width / dash / opacity** in the context bar; changes the document (one undo step in live mode).

| Argument | Type |
| --- | --- |
| `ids` | string[] |
| `fill` | string *(optional)* |
| `stroke` | string *(optional)* |
| `strokeWidth` | number *(optional)* |
| `strokeStyle` | `solid` \| `dashed` \| `dotted` *(optional)* |
| `opacity` | number *(optional)* |
| `textColor` | string *(optional)* |

### `delete`

Delete shapes — mirrors **Delete selection** in a keyboard action; changes the document (one undo step in live mode).

| Argument | Type |
| --- | --- |
| `ids` | string[] |
| `kind` | `node` \| `connector` \| `any` *(default `"any"`)* |

### `add_shape`

Add shape — mirrors **Create rectangle / ellipse / text** in the toolbar; changes the document (one undo step in live mode).

| Argument | Type |
| --- | --- |
| `kind` | `rectangle` \| `ellipse` \| `text` \| `rounded` \| `capsule` \| `circle` \| `ellipse` \| `diamond` \| `triangle` \| `trapezoid` \| `parallelogram` \| `hexagon` \| `octagon` \| `pentagon-tag` \| `chevron` \| `plus` \| `star` \| `heart` \| `cloud` \| `lightning` \| `bookmark` \| `speech-bubble` \| `page` \| `folder` \| `list-card` \| `filled-bar` \| `half-round` \| `cylinder` \| `document` \| `cube` \| `prism` \| `layer-stack` \| `target` \| `check-circle` \| `cross-circle` \| `numbered-circle` \| `brace` \| `bracket` \| `pin` \| `actor` \| `arrow-up` \| `arrow-down` \| `arrow-left` \| `arrow-right` \| `venn` \| `process` \| `start` \| `decision` \| `end` \| `custom` \| `text` \| `image` \| `annotation` \| `sticky` \| `callout` \| `pen` \| `highlighter` \| `line` \| `arrow` \| `architecture` \| `provider_icon` \| `group` \| `section` \| `swimlane` \| `class` \| `er_entity` \| `mindmap` \| `journey` \| `sequence_participant` \| `sequence_note` \| `sequence_fragment` \| `browser` \| `mobile` \| "chart" *(default `"process"`)* |
| `label` | string *(optional)* |
| `x` | number *(default `0`)* |
| `y` | number *(default `0`)* |
| `id` | string *(optional)* |
| `chart` | object: kind (`bar` \| `line` \| `area` \| `scatter` \| `pie` \| `donut` \| `radar` \| `heatmap` \| `table` \| `quadrant` *(default `"bar"`)*), categories (string[] *(optional)*), series (object: name (string), values (number[])[] *(optional)*), points (object: label (string), x (number), y (number)[] *(optional)*) *(optional)* |

### `export`

Export — mirrors **Export PNG / SVG / PDF / JSON** in the document bar; read-only.

| Argument | Type |
| --- | --- |
| `format` | `svg` \| `png` \| `pdf` \| `json` \| `svg-animated` \| `gif` \| `mp4` \| `webm` *(default `"svg"`)* |
| `scope` | `selection` \| `page` \| `document` *(default `"document"`)* |
| `pageId` | string *(optional)* |
| `ids` | string[] *(optional)* |
| `scale` | 1 \| 2 \| 3 *(default `1`)* |
| `theme` | `light` \| `dark` \| `print` *(default `"light"`)* |
| `preset` | `build` \| `walkthrough` \| `pulse` *(default `"build"`)* |
| `order` | string *(optional)* |
| `durationMs` | number *(optional)* |
| `loop` | boolean *(default `false`)* |
| `size` | 720 \| 1080 \| 1440 *(default `1080`)* |
| `fps` | 12 \| 24 \| 30 *(default `24`)* |

### `screenshot`

Screenshot a diagram — an agent-only lookup; read-only.

| Argument | Type |
| --- | --- |
| `frameId` | string *(optional)* |
| `pageId` | string *(optional)* |
| `scale` | 1 \| 2 \| 3 *(default `2`)* |
| `theme` | `light` \| `dark` *(default `"light"`)* |

### `fit_view`

Fit the view — mirrors **Zoom to fit / zoom to selection** in a keyboard action; read-only.

| Argument | Type |
| --- | --- |
| `ids` | string[] *(optional)* |
| `frameId` | string *(optional)* |

### `get_document`

Read the page — mirrors **Read document and page** in a canvas gesture; read-only.

| Argument | Type |
| --- | --- |
| `pageId` | string *(optional)* |

### `list_pages`

List pages — mirrors **Page list** in the document bar; read-only.

Takes no arguments.

## What it does not do

- **No cloud, no telemetry.** The server is stdio and local; there is no hosted service.
- **No account or key.** Your MCP client's model is the only AI involved.
- **No raster in file mode.** PNG, GIF, MP4 and WebM need the live editor's canvas.
- **No collaboration.** One editor pairs with the bridge at a time.
