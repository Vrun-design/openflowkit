---
draft: false
title: Import from Structured Data
description: Turn SQL, OpenAPI, Terraform, and Kubernetes source text into editable diagrams from the Studio import flows.
---

The structured import flows in Studio convert source text into editable diagrams. This is useful when you already have SQL, OpenAPI, Terraform, or Kubernetes-related content and want a visual model quickly.

## How it works

Paste your source text, choose the matching mode, and generate the diagram. Depending on the input type, OpenFlowKit either runs a specialized AI-assisted import or a deterministic parser-based flow.

One common pipeline is:

```text
Your text → specialized prompt → AI model → DSL → ELK layout → canvas
```

All your existing AI provider and API key settings apply.

For fully deterministic infrastructure parsing that does not need AI, use [Infrastructure Sync](/infra-sync/).

## SQL DDL → Entity-Relationship Diagram

Paste one or more `CREATE TABLE` statements to generate an ER diagram.

FlowPilot will:

- create one node per table
- list primary keys, foreign keys, and key columns inside each node
- draw edges between tables that share foreign key relationships
- group related tables where the model can infer a useful structure

## OpenAPI and service-structure imports

Use OpenAPI import when you want a service or endpoint-level first pass from an existing API spec.

## When to choose this flow

Choose structured import when a source artifact already exists and you want a fast editable draft. Choose manual editing when the diagram is primarily conceptual. Choose [Infrastructure Sync](/infra-sync/) when determinism matters more than AI interpretation.
