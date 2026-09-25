---
title: OpenFlow DSL
description: The editor-native text language — write a diagram, generate it as a frame, and keep the text and canvas from lying to each other.
---

OpenFlow DSL is the hub of OpenFlowKit: the code panel, AI generation, Mermaid import and the
MCP tools all produce it, and one compiler turns it into the canvas. The grammar is versioned
and written down in full in the [DSL reference](/openflow-dsl-reference/).

## The code panel

Press `⌥D` to open **Diagram as code**. Type or paste DSL and press `⌘↵` (or **Generate
diagram**). Diagnostics appear under the editor as you type; **the diagram is the compiled
result of the text you see**, not a parallel copy of the canvas.

- **Generate** compiles the draft into a frame. The frame is placed after the existing
  diagrams, or in place when the panel is editing one.
- **Edit as code** (right-click a generated frame) reopens its source in the panel; generate
  again to replace that same frame.
- A **canvas edited** warning appears when the frame on screen no longer matches the text that
  produced it. Generate overwrites those canvas edits — and one undo restores them.
- The **diagram palette** picker sets the default palette for the generated frame; an
  `appearance:` line in the source wins over it.

## This text

```openflow
flowchart
Client -> API : request
API -> Database : query
```

The first line names the family (`flowchart` here; every family is listed in the
[reference](/openflow-dsl-reference/)). Names are ids: `API` in two places is the same node.
Edges declare their endpoints, so you never have to pre-declare a node you are about to use.

## Round-trip, or why dragging does not rewrite your text

Two laws hold for the whole grammar, and the test suite checks them over a fixture corpus:

- formatting the text again changes nothing: `format(format(x)) == format(x)`;
- compiling and serialising preserves structure and attributes.

The canvas is a view of the text, not its owner. Drag a node and the text is untouched — the
canvas keeps the position in the document. **Generate** compiles the text again and re-lays
the frame out from it; manual moves are discarded, and one undo brings them back. The
exceptions are deliberate and small: chart data and the `animate` block are written back from
their panels, because there they *are* the data.

## Every family, one grammar

[Flowchart](/diagram-flowchart/), [architecture](/diagram-architecture/),
[sequence](/diagram-sequence/), [state](/diagram-state/), [ERD](/diagram-erd/),
[class](/diagram-class/), [mindmap](/diagram-mindmap/), [gitgraph](/diagram-gitgraph/),
[chart](/diagram-chart/) and [wireframe](/diagram-wireframe/) — plus the model layer for [C4 workspaces](/architecture-c4/).

Reserved family names (`bpmn`, `org`, `gantt`, `sankey`, `journey`, `timeline`)
parse as a flowchart with warning W105; they are not rendered as their own family yet.

## Foreign syntax

Paste Mermaid and the panel offers to [convert it](/mermaid-import/). Structurizr DSL pasted
into the panel converts to an architecture workspace the same way. Both report what they could
not represent instead of dropping it silently.

## What it cannot do

- **One frame per generate.** Generating replaces the bound frame; to keep a variant, duplicate
  it as a new document or edit the copy by hand.
- **No layout coordinates in the text.** `pin` and `rank` are hints; ELK decides the layout,
  and canvas drag positions do not survive a regenerate — only a C4 workspace's
  `views/*.snap` overrides do (see [Architecture workspace](/architecture-workspace/)).
- **No silent fixes.** A line the parser cannot read is dropped with a warning naming its
  number; it is never guessed at.

## Where to go next

- [OpenFlow DSL reference](/openflow-dsl-reference/) — the whole grammar, generated from source.
- [Mermaid import](/mermaid-import/) — bring existing text across.
- [Architecture (C4)](/architecture-c4/) — the model layer inside the same language.
