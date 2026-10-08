---
title: Coming from Structurizr
description: Move a Structurizr DSL workspace into OpenFlowKit, see what is reported as lost, and keep the diagrams in your repository and CI.
---

Structurizr Cloud shut down on 2026-09-30. If you have a `workspace.dsl`, you can bring it
here. The import runs on your machine. Nothing is uploaded.

Structurizr DSL becomes an `architecture` workspace: one model, many views
([C4 architecture](/architecture-c4/)). Most of a normal workspace converts. What does not
is reported, never dropped silently.

## Import a workspace

Pick one way.

- **In the app.** On the home page choose **Import a file…** and pick the `.dsl` file. Text
  files open one at a time, in the editor. Or paste the text into the code panel (⌥D).
  The panel says "Structurizr DSL detected". Choose **Convert** (⌘⇧M). The draft is
  rewritten as OpenFlow DSL and the losses show up as warnings in the panel.
- **With the CLI.** This writes an editable file with every view in it, and an SVG next to it:

  ```text
  openflowkit convert workspace.dsl -o x.openflow.json --svg
  ```

  The CLI prints one line per loss to stderr. Add `--strict` to exit 1 when anything was
  lost. Add `--json` for a machine-readable report. `--svg` needs `-o`.

The CLI ships in the MCP server package. See [MCP Server](/mcp-server/).

## A worked example

This Structurizr workspace:

```text
workspace "Shop" "An online shop" {
  model {
    customer = person "Customer"
    shop = softwareSystem "Shop" {
      web = container "Web" "Storefront" "React"
      api = container "API" "Orders and carts" "Go"
    }
    stripe = softwareSystem "Stripe" "Payments"
    customer -> web "Browses"
    web -> api "Calls" "HTTPS"
    api -> stripe "Charges cards"
  }
  views {
    systemContext shop "context" {
      include *
      autoLayout lr
    }
    container shop "containers" {
      include *
    }
    theme default
  }
}
```

ran through `openflowkit convert` and printed four losses:

```text
convert: structurizr line 1: not converted — workspace description dropped
convert: structurizr line 21: not converted — theme dropped
convert: structurizr line 14: not converted — view key "context" dropped
convert: structurizr line 18: not converted — view key "containers" dropped
```

The DSL it produced:

```openflow
architecture
title: Shop

model {
  person Customer
  system Shop {
    container Web [tech: React, desc: Storefront]
    container API [tech: Go, desc: Orders and carts]
    Web -> API : Calls [tech: HTTPS]
  }
  system Stripe [desc: Payments]
  Customer -> Web : Browses
  API -> Stripe : Charges cards
}
views {
  view context of Shop right {
    include *
  }
  view container of Shop {
    include *
  }
}
```

The file has two pages, `Overview: Shop` and `Services: Shop`.

## What imports

| Structurizr | Becomes |
| --- | --- |
| `person`, `softwareSystem`, `container`, `component` | `person`, `system`, `container`, `component`, with `desc`, `tech` and `tags` |
| relationships, including scoped `-> b` inside an element | `a -> b : label [tech: …]` |
| `deploymentEnvironment`, `deploymentNode`, `infrastructureNode`, `containerInstance` | a `deployment` block with nodes and instances |
| `systemLandscape`, `systemContext`, `container`, `component`, `deployment` views | `view landscape`, `context of`, `container of`, `component of`, `deployment of … in …` |
| `include` and `exclude` with `*`, names, `->` forms, `element.type ==`, `element.tag ==`, `&&`, `\|\|` | the same predicates ([view predicates](/architecture-c4/#view-predicates)) |
| `dynamic` views | `flow` blocks |
| `autoLayout lr` (or `rl`, `tb`, `bt`) | the view's direction |
| `styles`: background, shape, icon | copied onto every element with that tag |
| `!identifiers flat` | ids rewritten to dotted paths (the ids change; the report says so) |

## What is reported as lost

Each of these produces a warning with its line number:

- the workspace description, and `theme`, `themes`, `branding`, `terminology`, `configuration`;
- view keys (`"context"` above) and `title` lines inside a view;
- `group` and `deploymentGroup` (the elements stay, flattened);
- `properties`, `perspectives`, `url`, and `!docs`, `!adrs`, `!include` and other `!` directives;
- the separations after `autoLayout`;
- any `styles` property other than background, shape and icon;
- blocks under a relationship or a dynamic step (flattened);
- relations or instances that point at an unknown element, or across environments;
- `!impliedRelationships false` (implied relations are always derived).

A view expression outside the supported subset (for example `element.parent ==` or
`relationship.*`) is kept as text and warns W160, but it is not applied.

## How views become pages

Every view is one page. The plain names:

| Structurizr view | Page name |
| --- | --- |
| `systemLandscape` | the landscape page, named by the view (the starter calls it **System map**) |
| `systemContext x` | `Overview: x` |
| `container x` | `Services: x` |
| `component x` | `Inside x` |
| `deployment x env` | `Deployment (env): x` |

The pages of one model are grouped together in the page list, indented by level. Each page
zooms into the one above it. Regenerating matches pages by stable id, so your layout is not
duplicated.

## Edit the model

Open the model panel from the canvas. It has four tabs: Elements, Views, Flows and Tags.
Edit an element's name, technology, description, tags and links there, or remove it from the
model. Rename a label on the canvas and it changes in every view, as one undo step. The
panel is marked beta. The same model is plain text in the code panel if you prefer typing.

## Keep it in the repository

Commit the files, not a service.

```text
openflowkit convert workspace.dsl -o docs/shop.openflow.json --svg
```

That writes `docs/shop.openflow.json` (open it again in the app) and `docs/shop.svg` (embed it
in a README). Rerun the command after you change the source. `convert` keeps every view;
`render` draws only the first.

The [workspace folder](/architecture-workspace/) keeps the DSL as `architecture.ofk` instead,
with layout overrides and ADRs, if you want to edit in the app and commit text.

## Catch drift in CI

```text
openflowkit drift . --model architecture.ofk
```

It scans the repository and compares it with the model by element name and technology. It
prints what the model has that the code does not, and the reverse. It exits 1 when it finds
any drift, 2 on a usage error. `--json` gives a machine-readable report. It cannot see
intent, renames or moved code ([details](/architecture-workspace/)). The default model path
is `<dir>/architecture.ofk`.

## Diagrams in pull requests

The OpenFlowKit PR diagrams GitHub Action comments on a pull request with how its diagrams
changed: node and connector counts before and after, the DSL diff, and drift for `.ofk` models.
It runs in your CI, with the CLI, `git` and `gh`. It can also refresh a stale committed `.svg`
beside a diagram. See `action/README.md` in the repository for the inputs, fork behavior and
branch-protection notes.

## What is different from Structurizr DSL

| | Structurizr DSL | OpenFlow DSL |
| --- | --- | --- |
| Declare an element | `api = container "API" "desc" "Go"` | `container API [tech: Go, desc: desc]` |
| Ids | assigned with `=`; flat or hierarchical | dotted paths (`shop.api`); relative inside an element |
| Relationship | `a -> b "label" "tech"` | `a -> b : label [tech: …]` |
| View | `container shop "key" { … }` | `view container of Shop { … }` |
| Filter | `element.tag == X` | `where tag is X` |
| Layout | `autoLayout lr 300 300` | a direction word on the view; no separations |
| Flow of steps | `dynamic` view | `flow` block, with `alt`, `par`, `loop` |
| Styling | `styles` block with tags | attributes on the element |
| Output | the Structurizr tools | the canvas, SVG, PNG, JSON, motion formats |

There is no export back to Structurizr DSL. Convert once and edit here, or keep editing in
Structurizr and convert again.

## Where to go next

- [Mermaid, Structurizr and D2 import](/mermaid-import/) — the import panel in general.
- [C4 architecture](/architecture-c4/) — views, flows, deployment.
- [Architecture workspace](/architecture-workspace/) — folder sync, discovery and drift.
