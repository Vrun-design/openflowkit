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

## Share Modal Features

The Share Modal provides:

- **Room ID**: A unique identifier for the current diagram session
- **Invite URL**: A link others can open to join the room
- **Viewer Count**: Number of people currently in the room
- **Participant Badges**: Visual indicators showing who's in the room (with name and color)
- **Connection Status**: Shows whether you're in realtime sync, connecting, or local-only fallback

## Connection States

- **Realtime**: Connected and syncing with other participants in real-time
- **Connecting**: Attempting to establish a realtime connection
- **Fallback**: Working locally; realtime connection not available

In fallback mode, you can still edit and export your diagram, but changes won't sync with others until reconnected.

## Best Practices

1. **Check status before presenting**: Confirm you're in realtime mode when presenting to others
2. **Export before handoff**: Always export JSON when handing off to someone who won't use the room
3. **Use room links for reviews**: Great for live architecture reviews or brainstorming sessions
4. **Local-first by default**: Even without collaboration, your work is always saved locally

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
