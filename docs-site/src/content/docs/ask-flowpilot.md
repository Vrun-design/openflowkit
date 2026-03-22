---
draft: false
title: Ask Flowpilot
description: Use FlowPilot as the chat-based Studio assistant for drafting, revising, and explaining diagrams.
---

FlowPilot is the chat-based assistant inside Studio. It is the fastest way to describe a diagram in plain language, revise an existing draft, or ask for a different structural take before you start polishing the result manually.

## Good use cases

Ask FlowPilot when you want to:

- create a first draft from a text prompt
- revise an existing system into a cleaner structure
- expand a rough flow with missing failure branches
- convert source code or structured input into a diagram draft

## What to include in your prompt

Useful prompts specify:

- the audience
- the systems or actors involved
- important branches or constraints
- preferred direction such as `LR` or `TB`
- whether you want a high-level overview or a detailed operational flow

## Example prompt

```text
Create a left-to-right architecture diagram for a SaaS app with:
web client, API gateway, auth service, billing service, Postgres,
Redis cache, background workers, and S3-backed file storage.
Show public ingress, async jobs, and failure-handling paths.
```

## What to do after generation

FlowPilot is strongest as a draft generator, not the final editor. After generation:

- inspect the structure on the canvas
- relabel and normalize in the [Properties Panel](/properties-panel/)
- run [Smart Layout](/smart-layout/) if spacing is poor
- save a snapshot before the next major rewrite

## Related pages

- [AI Generation](/ai-generation/)
- [Prompting AI Agents](/prompting-agents/)
- [Choose an Input Mode](/choose-input-mode/)
