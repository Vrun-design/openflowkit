---
title: Mermaid, Structurizr and D2 import
description: Paste Mermaid, Structurizr DSL or D2 into the code panel, or hand it to an agent tool, and get OpenFlow DSL with every loss reported.
---

Mermaid, Structurizr DSL and D2 come in through the code panel (⌥D). Paste the source; when
the panel recognises the language it offers **Convert**, which rewrites the draft in place as
OpenFlow DSL. Agents skip the panel: `create_diagram`, `update_diagram` and
`validate_openflow_dsl` take the same text and answer with `converted.dsl` and
`converted.losses` ([MCP Server](/mcp-server/)).

## What converts

| Mermaid | Becomes |
| --- | --- |
| `flowchart` / `graph` | `flowchart`, direction preserved |
| `sequenceDiagram` | `sequence` |
| `stateDiagram` | `state` |
| `erDiagram` | `erd` |
| `classDiagram` | `class` |
| `mindmap` | `mindmap` |
| `architecture` | `architecture` |

Structurizr DSL becomes an `architecture` workspace — model, views and deployment
environments ([C4 architecture](/architecture-c4/)).

D2 becomes a `flowchart` (containers as groups, shapes, colours, dashes, links, AWS/GCP/Azure
icons), a `sequence` when the file says `shape: sequence_diagram`, or an `erd` when every shape
is a `sql_table`. Globs, `vars`, layers, grids and `near` are reported as losses.

The conversion runs locally, in the browser. Nothing is uploaded.

## Losses are reported, not hidden
Anything the converter cannot represent becomes a warning in the code panel's diagnostics —
for example a sequence fragment that has to be flattened, or an arrow whose heads cannot both
survive. The converted text plus its diagnostics are what you edit next; the original paste is
not kept.

## The conversion is one-way

There is no Mermaid, Structurizr or D2 export. OpenFlowKit compiles DSL to the canvas and to SVG, PNG, JSON and
motion formats; it does not emit Mermaid. If a round-trip with Mermaid is a hard requirement,
edit in the original language and paste again after changes.

## Where to go next

- [OpenFlow DSL](/openflow-dsl/) — the panel the import runs in.
- [MCP Server](/mcp-server/) — let an agent write the DSL instead of pasting text.
- [OpenFlow DSL reference](/openflow-dsl-reference/) — the target language, in full.
