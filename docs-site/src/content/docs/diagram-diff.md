---
draft: false
title: Diagram Diff & Compare
description: Compare the current diagram against a snapshot baseline and review added, removed, and changed elements.
---

Diagram Diff & Compare lets you inspect how the current graph differs from a saved baseline snapshot.

## What compare mode shows

When compare mode is active, OpenFlowKit surfaces:

- added nodes and edges
- removed nodes and edges
- changed nodes
- the baseline snapshot name and timestamp

This is useful after imports, AI rewrites, or manual restructures when you want to understand what actually changed rather than rely on memory.

## Why it is valuable

Large diagram edits often fail in two ways:

- the result is visually different but you cannot explain what changed
- the result looks mostly similar, but a few important relationships disappeared

Compare mode helps with both. It gives you a concrete change view against a known baseline.

## Recommended workflow

1. Save or identify the baseline snapshot.
2. Make the changes you need.
3. Enter compare mode against that snapshot.
4. Review the counts for added, removed, and changed elements.
5. Exit compare mode and continue editing if needed.

## Good use cases

- checking the impact of a major FlowPilot revision
- reviewing the result of a large infrastructure refresh
- comparing before-and-after states during architecture refactors
- validating that a simplification pass did not delete something important

## Related pages

- [Playback & History](/playback-history/)
- [AI Generation](/ai-generation/)
- [Infrastructure Sync](/infra-sync/)
