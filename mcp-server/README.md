<div align="center">

# OpenFlowKit MCP Server

**Give Claude Desktop, Cursor, Windsurf, or any MCP client first-class diagramming tools.**

[![npm](https://img.shields.io/npm/v/@vrun-design/openflowkit-mcp?style=flat-square&color=f97316)](https://www.npmjs.com/package/@vrun-design/openflowkit-mcp)
[![MIT License](https://img.shields.io/badge/License-MIT-f97316.svg?style=flat-square)](https://github.com/Vrun-design/openflowkit/blob/main/LICENSE)
[![Node 18+](https://img.shields.io/badge/Node-18%2B-339933.svg?style=flat-square)](https://nodejs.org/)

</div>

---

OpenFlowKit MCP is **local-first by design** — it runs on your machine over stdio with no API key and no cloud round-trip, and its tools return deterministic output. Your MCP client already has an LLM; this server just gives it diagram-specific tools.

It gives the agent the same operations a human has, in two modes:

- **Live** — click **Connect agent** in the app and the tools act on the document you
  see, over a local bridge on `127.0.0.1:43119` (origin-checked; optional
  `OPENFLOWKIT_BRIDGE_TOKEN`). `screenshot` returns a real PNG and every edit is one undo.
- **File** — `openflow_open` a `.openflow.json`, edit it with the same tools,
  `openflow_save` it back.

No API keys, no telemetry, no account, no server-side storage.

```
You:    Create a checkout flow with a promo-code branch
Claude: get_syntax → writes OpenFlow DSL itself → validate_openflow_dsl
        fixes any issues → create_diagram → screenshot
        returns DSL + what it drew
```

---

## Install

```bash
# No install required; npx fetches the latest published version
npx -y @vrun-design/openflowkit-mcp

# Or install globally
npm install -g @vrun-design/openflowkit-mcp
openflowkit-mcp
```

Requires **Node 18+**.

---

## Claude Desktop setup

Edit your Claude Desktop config:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "openflowkit": {
      "command": "npx",
      "args": ["-y", "@vrun-design/openflowkit-mcp"]
    }
  }
}
```

Restart Claude Desktop. You should see **openflowkit** in the tool picker.

### Cursor / Windsurf / other MCP clients

Point the client at the same command:

- command: `npx`
- args: `["-y", "@vrun-design/openflowkit-mcp"]`

The server speaks the standard MCP stdio protocol. Client UIs differ, but the command shape is the same.

---

## Tools

All tools run locally and require no provider key.

Every tool accepts an optional `documentId`: omit it while an editor is paired, pass
one to target a file-mode document.

| Tool | What it does |
|---|---|
| `create_diagram` / `update_diagram` | Compile DSL into a new frame, or replace one in place — one undo step |
| `get_diagram` / `list_diagrams` | Read a frame's DSL, its drift from the canvas, and what the text cannot express |
| `get_syntax` | The grammar, or one family's section |
| `search_icons` / `find_icons_for` | Search 2,121 provider icons, or expand a concept ("cache", "queue", "auth") |
| `move` / `style` / `delete` / `add_shape` | Scene edits the language cannot say |
| `export` | SVG, PNG, PDF (print HTML) or JSON for a page, a selection or the document |
| `screenshot` | PNG of one frame (live mode) |
| `fit_view` | Frame the camera |
| `get_document` / `list_pages` | Nodes, connectors and pages with geometry |
| `validate_openflow_dsl` | Parse DSL with the real parser, structured diagnostics |
| `analyze_codebase` | Detect platforms, services, structure and language mix in a local repo |
| `discover_architecture` | Walk a repo (compose, Dockerfiles, k8s, terraform, manifests) and propose a C4 `architecture` workspace as DSL, with evidence per element |
| `drift_report` | Re-run discovery against a model (DSL text, open document, or `architecture.ofk` in an open folder) and report `missing` / `undrawn` / `changed` with evidence lines |
| `explain_element` | An element with its relations, discovery evidence, and the text of any linked `adr/*.md` |
| `openflow_create` / `openflow_open` / `openflow_save` | File-mode lifecycle |
| `list_starter_templates` / `get_starter_template` | Working DSL to start from |
| `whoami` | Which mode you are in and what this server holds |
| `list_diagram_node_types` / `server_info` | Reference data and capability metadata |

### `openflowkit` CLI

The package also ships the `openflowkit` binary — the same discovery engine without an
MCP client:

```bash
openflowkit discover ./my-app --out architecture.ofk   # propose a model, with evidence
openflowkit drift ./my-app --model architecture.ofk    # report drift; exit 1 when the model is stale
openflowkit build ./docs-architecture --out dist       # static site: every view, drill-down, flows
```

`build` reads `architecture.ofk` (plus `views/*.snap` layout overrides) and writes a
self-contained `index.html` with inline SVG views, breadcrumb drill-down and a flow
player. It replaces the Structurizr Cloud static export for wiki/GitHub Pages hosting:
no server, no account.

---

## Resources

Agents can read these directly:

| URI | Description |
|---|---|
| `openflowkit://docs/grammar` | The complete, versioned DSL reference |
| `openflowkit://templates` | Starter template catalog |
| `openflowkit://templates/{name}` | DSL for a named starter template |
| `openflowkit://icons` | Full icon catalog |
| `openflowkit://icons/{provider}` | Icon catalog for one provider pack |

Provider packs are `aws`, `azure`, `gcp`, `cncf`, and `developer`.

---

## Prompts

Clients can surface three prompt templates:

- `flowchart_from_description` — agent writes the DSL, validates it and draws it
- `convert_mermaid_to_openflow` — agent converts Mermaid into OpenFlow DSL and draws it
- `architecture_from_codebase` — agent scans a local repo, picks icon slugs, validates the DSL and draws it

---

## Recommended agent workflow

Ask your MCP client:

```text
Using the openflowkit MCP server: read openflowkit://docs/grammar, then write an OpenFlow DSL flowchart for checkout with cart, shipping, promo-code decision, payment, Stripe webhook, and confirmation. Call validate_openflow_dsl, fix any issues, then draw it with create_diagram and show me a screenshot.
```

For architecture diagrams:

```text
Using openflowkit: call analyze_codebase on /path/to/project, read openflowkit://docs/grammar, use search_icons for exact architecture icon slugs, write OpenFlow DSL, validate it, then draw it with create_diagram.
```

---

## Privacy model

- **No telemetry.** The server never phones home.
- **No provider keys.** The MCP client model authors diagrams directly.
- **No OpenFlowKit account.** Nothing leaves the machine; the live bridge binds to 127.0.0.1.
- **Local filesystem access only when requested.** Codebase analysis only reads the path passed to `analyze_codebase`.

---

## Development

This package lives in the [openflowkit monorepo](https://github.com/Vrun-design/openflowkit).

```bash
# From the repo root
npm install --workspace=mcp-server
npm run --workspace=mcp-server build
npm run --workspace=mcp-server test:run

# Run locally against the MCP Inspector
npx @modelcontextprotocol/inspector dist/index.js
```

The MCP Inspector gives you a UI to manually call every tool, browse every resource, and verify client behavior before publishing.
