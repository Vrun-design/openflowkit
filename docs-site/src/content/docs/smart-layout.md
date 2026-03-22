---
draft: false
title: Smart Layout
description: Use ELK-based layout to turn rough graphs into cleaner, more readable diagrams in OpenFlowKit.
---

OpenFlowKit uses ELK-based layout strategies to turn rough graphs into readable diagrams quickly.

## When to use auto layout

Use layout when:

- a template is structurally right but visually rough
- AI generation gave you the right nodes in the wrong places
- imported code needs normalization
- you have added branches manually and want spacing fixed

## How to run it

Open the Command Center and choose **Auto Layout**. The editor passes direction, algorithm, and spacing preferences into the layout request.

Current directional options are:

- `TB`
- `LR`
- `RL`
- `BT`

The shell also uses active diagram type as context where needed.

## What layout is good at

Auto layout is especially effective for:

- flowcharts
- architecture graphs
- state-like branching diagrams
- AI-generated drafts

It is less effective for intentionally hand-composed slides or dense annotated canvases where visual storytelling matters more than graph regularity.

## Practical strategy

For the best result:

1. get the right nodes and edges first
2. run layout
3. group with sections if needed
4. make final manual adjustments

Do not spend time hand-aligning a graph before running layout. That work is usually wasted.

## Layout plus code workflow

OpenFlow DSL and Mermaid edits are especially effective when combined with layout:

- make structural changes in text
- apply them
- run auto layout
- finish visual polish in the properties panel

## Related pages

- [Canvas Basics](/canvas-basics/)
- [OpenFlow DSL](/openflow-dsl/)
- [Mermaid Integration](/mermaid-integration/)
