---
title: Architecture (C4)
description: The model layer — one architecture model with many views, flows, a deployment environment, drill-down and playback.
---

The architecture family grows a second mode: when the source contains a `model` block, the
diagram becomes a C4 workspace — one model, many views, each view its own page, all compiled
from the same text.

## One model, many views

```openflow
architecture
model {
  person Customer
  system Shop [tech: SaaS] {
    container Web [tech: React]
    container API [tech: Go]
    store DB [cylinder, tech: Postgres]
  }
  external Stripe
  Customer -> Web : browses
  Web -> API : calls
  API -> DB : reads/writes
  API -> Stripe : charges
}
views {
  view landscape
  view container of Shop
}
```

Each `view` becomes a page. Pages are matched to views by stable id, so regenerating updates
the pages you already have instead of duplicating them. Element ids are dotted paths
(`shop.web`); references may be relative inside the element you are in.

## View predicates

A typed view starts from its scope's default elements and `include` / `exclude` refine it; a
`view custom` starts empty.

| Predicate | Meaning |
| --- | --- |
| `include X`, `include X.*`, `include X.**` | the element, its children, its descendants |
| `include X -> Y`, `include -> X`, `include X ->` | relations touching an element |
| `exclude …` | the same forms, removing |
| `where kind is container` | by element kind |
| `where tag is @core` | by tag; `is not` negates |
| `and` / `or` | combine predicates; later rules override earlier ones |

Anything outside this subset is warning W160 — kept verbatim but not applied.

## Flows

A `flow` block describes a path through the model. Play it with **←**, **→** and Space; the
rest of the diagram dims while a step is active.

```text
flow "Checkout" {
  intro "Customer pays"
  step Customer -> Web : opens cart
  process "Validate the cart"
  alt "paid" { step Web -> API : POST /orders } else { step Web -> Customer : show error }
  par { step API -> DB : write } and { step API -> Events : publish }
  goto "Fulfilment"
  note "Idempotent by order id"
  conclusion "Order placed"
}
```

A flow can be exported as sequence DSL, Mermaid `sequenceDiagram` or PlantUML from the flow
panel.

## Deployment

`deployment Prod { … }` groups nodes by environment; `instance Shop.API` places a model
element inside a deployment node, and `view deployment of Shop in Prod` renders it.

## Editing on the canvas

- **Rename** a placed element's label to rename it in every view — one undo step.
- **Delete** unplaces the element from the current view only. `⌘⇧⌫` or "Remove from model"
  deletes it everywhere.
- **Draw a connector** between two placed nodes to record the matching relation.
- **Tags** drive perspectives: activate a tag in the model panel and matching elements stay
  bright while the rest dim.
- A `views/*.snap` position from the [workspace folder](/architecture-workspace/) overrides
  the computed layout per element.

## What it cannot do

- **Only the documented predicate subset.** Everything else warns W160.
- **One model per document.** The workspace is the document; a second `model` block is not a
  second model.
- **No automatic code discovery inside the editor.** Discovery and drift live in the MCP
  server — see [Architecture workspace](/architecture-workspace/).
- Flows are authored, not inferred: a flow only contains the steps you write.

## Where to go next

- [Architecture workspace](/architecture-workspace/) — folder sync, discovery and drift.
- [Architecture diagrams](/diagram-architecture/) — the plain (non-model) family.
- [OpenFlow DSL reference](/openflow-dsl-reference/) — §9 of the grammar, in full.
