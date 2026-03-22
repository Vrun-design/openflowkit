---
draft: false
title: Playback & History
description: Use undo, snapshots, and playback-related state to recover work and review diagram evolution.
---

OpenFlowKit has two related but distinct recovery systems:

- regular undo/redo history
- snapshot-based history and playback state stored on tabs or documents

## Undo and redo

Use:

- `Cmd/Ctrl + Z` to undo
- `Cmd/Ctrl + Shift + Z` to redo

This is the fastest recovery path during active editing.

## Snapshots

Use snapshots when you are about to:

- run a major AI rewrite
- switch diagram family direction
- do a broad text apply from Studio
- restructure a large architecture map

Snapshots are the safest checkpoint tool before large AI or import-driven edits. They are also the baseline you use for compare workflows later.

## Playback model

The data model supports playback scenes, steps, and timed sequences. Animated export options appear in the export menu for playback-oriented outputs such as video and GIF.

## Practical advice

Treat history and snapshots differently:

- use undo/redo for quick corrections
- use snapshots for milestones

If the next operation could meaningfully rewrite the graph, create a snapshot first.

## Related pages

- [Diagram Diff & Compare](/diagram-diff/)
- [Exporting](/exporting/)
- [AI Generation](/ai-generation/)
