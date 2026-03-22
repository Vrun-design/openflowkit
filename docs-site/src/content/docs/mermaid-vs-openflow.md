---
draft: false
title: Mermaid vs OpenFlow
description: Decide whether Mermaid or OpenFlow DSL is the better text representation for your OpenFlowKit workflow.
---

Mermaid and OpenFlow DSL solve adjacent but different problems in OpenFlowKit.

## Choose Mermaid when

- the diagram must live in Markdown, docs sites, or README files
- your team already reviews Mermaid in pull requests
- external tooling expects Mermaid syntax

## Choose OpenFlow DSL when

- the diagram is primarily maintained inside OpenFlowKit
- you want a format closer to the native graph model
- you want fewer compatibility constraints during editing
- you want a better target for OpenFlowKit-specific AI and Studio workflows

## The real difference

Mermaid is the better portability format.

OpenFlow DSL is the better editor-native format.

That usually means:

- Mermaid is better for publication and interoperability
- OpenFlow DSL is better for fidelity inside the product

## Recommended team pattern

If you need both:

- treat JSON or OpenFlow DSL as the editing master
- publish Mermaid as a downstream representation when required

This avoids losing detail every time the diagram moves between ecosystems.

## Related pages

- [Mermaid Integration](/mermaid-integration/)
- [OpenFlow DSL](/openflow-dsl/)
- [Choose an Export Format](/choose-export-format/)
