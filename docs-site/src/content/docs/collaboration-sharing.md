---
draft: false
title: Collaboration & Sharing
description: Share room links, understand local-only fallback behavior, and use OpenFlowKit collaboration features safely.
---

OpenFlowKit supports share links and collaboration-oriented room flows while keeping local-first behavior as the default.

## What the share flow includes

The share dialog can expose:

- a room ID
- an invite URL
- current viewer count
- participant badges
- connection state such as realtime, connecting, or local-only fallback

## Current collaboration model

The product includes a collaboration scaffold with presence, transport status, and local cache behavior. In practice, that means you can share a room link and see whether the current session is in live sync or local-only fallback mode.

This is important because local-first tools should fail gracefully. If realtime sync is not available, the app should not force you to stop working.

## How to use it well

- open the share dialog before inviting others
- confirm whether the session is in live sync or fallback mode
- use room links when you want collaborators in the same canvas context
- export JSON when you need a durable editable backup outside the current browser state

## When to use sharing vs exporting

Use collaboration sharing when:

- the diagram should stay interactive
- other people should join the current working canvas
- you want presence and room-based workflows

Use exporting when:

- you need an artifact, not a live session
- the next destination is docs, slides, or a design tool
- you need a durable handoff file

## Related pages

- [Exporting](/exporting/)
- [Choose an Export Format](/choose-export-format/)
- [Embed Diagrams in GitHub](/github-embed/)
