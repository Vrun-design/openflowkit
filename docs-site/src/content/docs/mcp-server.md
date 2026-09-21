---
draft: false
title: MCP Server
description: Drive the live OpenFlowKit editor, or work on .openflow.json files, from Claude Code, Claude Desktop, Cursor, Windsurf and every other MCP client.
---

The OpenFlowKit MCP server gives AI clients real diagramming tools that run local-first —
on your machine, no account, no cloud round-trip, deterministic output. Your client
already has the model; OpenFlowKit supplies the canvas.

The package is `@vrun-design/openflowkit-mcp`, over the standard MCP stdio transport.

## Install

```bash
npx -y @vrun-design/openflowkit-mcp
```

Or put it in your client's config:

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

Node 18 or newer. The server prints its local bridge address to stderr on start.

## Two modes

| | Live (paired editor) | File |
| --- | --- | --- |
| What it edits | the document open in your browser, as you watch | a `.openflow.json` on disk |
| How to start | click **Connect agent** in the app | `openflow_open` |
| `screenshot` | real PNG of the frame | needs a live editor |
| Undo | one <kbd>⌘Z</kbd> per agent edit | committed into the file on save |

The live bridge is a local HTTP long-poll on `127.0.0.1:43119`. It checks the request
origin, so a random web page cannot drive your editor; set
`OPENFLOWKIT_BRIDGE_TOKEN` to require a shared token as well (paste it into the
Connect-agent popover).

## Tools

Every tool takes an optional `documentId`. Omit it while an editor is paired and the
call happens in that window; pass one to target a file-mode document instead.

| Tool | What it does |
| --- | --- |
| `create_diagram` | Compile DSL into a new diagram frame — one undo step |
| `update_diagram` | Replace a frame's content from DSL, keeping its position |
| `get_diagram` | The frame's DSL, whether the canvas has drifted from it, and what the text cannot express |
| `list_diagrams` | Every diagram frame, with page, family and drift |
| `get_syntax` | The grammar, or one family's section |
| `search_icons` | Search the provider icon packs |
| `find_icons_for` | Concept search ("cache", "queue", "auth") expanded and ranked |
| `move` / `style` / `delete` / `add_shape` | Scene edits the language cannot say |
| `export` | SVG, PNG, PDF (print HTML) or JSON, for a page, a selection or the whole document |
| `screenshot` | PNG of one frame (live mode) |
| `fit_view` | Frame the camera on a frame, a selection or the page |
| `get_document` / `list_pages` | Nodes, connectors and pages with geometry |
| `validate_openflow_dsl` | Parse DSL with the real parser and return structured diagnostics |
| `analyze_codebase` | Detect platforms, services and structure in a local repo |
| `openflow_create` / `openflow_open` / `openflow_save` | File mode lifecycle |
| `list_starter_templates` / `get_starter_template` | Working DSL to start from |
| `whoami` | Which mode you are in and what this server holds |

## Resources and prompts

| URI | Description |
| --- | --- |
| `openflowkit://docs/grammar` | The complete DSL reference |
| `openflowkit://templates` | Starter template catalog |
| `openflowkit://templates/{name}` | One template's DSL |
| `openflowkit://icons` | Full icon catalog |
| `openflowkit://icons/{provider}` | One provider pack |

Prompts: `flowchart_from_description`, `convert_mermaid_to_openflow`,
`architecture_from_codebase`.

## What a session looks like

```text
You:   Draw the checkout flow: cart → shipping → promo-code decision → payment → Stripe webhook → confirmation.
Agent: get_syntax → writes OpenFlow DSL → validate_openflow_dsl → create_diagram
       → screenshot → "Drew it: 6 shapes, 6 connectors. Promo-code branch is the diamond."
```

The DSL it writes is the same DSL the app's code panel uses, so you can press
<kbd>⌥D</kbd> and keep editing by hand, or right-click the frame → **Edit as code**.
