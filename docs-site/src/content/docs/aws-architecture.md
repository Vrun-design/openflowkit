---
draft: false
title: AWS Architecture Diagram
description: Use OpenFlowKit for AWS architecture diagrams with templates, icon-backed assets, AI drafting, DSL, and export workflows.
---

OpenFlowKit is a strong fit for AWS architecture diagrams because it supports provider-backed icon insertion, architecture-oriented layouts, AI-assisted drafting, and code-backed editing in the same workflow.

## Best starting points

For AWS diagrams, start from the input that already exists:

- an AWS template from the template browser
- the Assets view with AWS icon catalog
- AI generation with a provider-specific architecture prompt
- OpenFlow DSL for a deterministic first pass

## How to choose the starting point

- Use templates when you want a known structural baseline.
- Use assets when you know the services already and want manual control.
- Use AI when you want a fast conceptual draft.
- Use DSL when the graph should be reviewed as text.

## Recommended workflow

1. insert core services first
2. add boundaries for VPCs, public/private tiers, or trust zones
3. connect traffic paths and async flows
4. run [Smart Layout](/smart-layout/)
5. refine labels, protocols, and visual emphasis
6. save a snapshot before large revisions
7. export or share in the format your audience needs

## Asset strategy

The assets panel can load provider-backed catalogs and previews. Use icon nodes for branded service identity, then use sections or boundaries to show grouping.

This is usually better than drawing every service as a generic box, especially when the audience expects cloud-provider cues at a glance.

## Example prompt

```text
Create an AWS architecture diagram for a three-tier web app with:
Route 53, CloudFront, ALB, ECS services, RDS PostgreSQL,
ElastiCache Redis, SQS worker queue, S3 assets bucket, and CloudWatch.
Show public ingress, internal service traffic, and async worker processing.
```

## When to use OpenFlow DSL instead

Use DSL when:

- you want the graph reviewed in code form
- you are iterating quickly on service composition
- you want to pair the diagram with infrastructure change planning

## Export recommendation

For architecture reviews:

- export PNG or SVG for slides and docs
- export JSON for editable backup
- optionally export Mermaid or PlantUML for repo or docs workflows

## Related pages

- [Infrastructure Sync](/infra-sync/)
- [Templates & Starter Flows](/templates-assets/)
- [Choose an Export Format](/choose-export-format/)
