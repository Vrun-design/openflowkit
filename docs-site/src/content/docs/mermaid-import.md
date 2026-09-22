---
title: Mermaid import
description: Paste Mermaid into the code panel and convert it to OpenFlow DSL, with every loss reported.
---

Mermaid files can be brought in through the code panel (⌥D). Paste the source; when the draft
starts with a Mermaid header the panel offers **Convert**, which rewrites the draft in place as
OpenFlow DSL.

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

The conversion runs locally, in the browser. Nothing is uploaded.

## Losses are reported, not hidden
Anything the converter cannot represent becomes a warning in the code panel's diagnostics —
for example a sequence fragment that has to be flattened, or an arrow whose heads cannot both
survive. The converted text plus its diagnostics are what you edit next; the original paste is
not kept.

## The conversion is one-way

There is no Mermaid export. OpenFlowKit compiles DSL to the canvas and to SVG, PNG, JSON and
motion formats; it does not emit Mermaid. If a round-trip with Mermaid is a hard requirement,
edit in Mermaid and paste again after changes.

## Where to go next

- [OpenFlow DSL](/openflow-dsl/) — the panel the import runs in.
- [MCP Server](/mcp-server/) — let an agent write the DSL instead of pasting text.
- [OpenFlow DSL reference](/openflow-dsl-reference/) — the target language, in full.
