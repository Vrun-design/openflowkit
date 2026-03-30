---
draft: false
title: Snapshots & Recovery
description: Save named versions of your diagram and restore to previous states when things go wrong.
---

Snapshots let you save specific points in your diagram's history and restore to them later. This is different from the automatic undo history — snapshots are named, persistent, and survive browser refreshes.

## When to Use Snapshots

- **Before major changes**: Save before an AI rewrite, large import, or significant restructure
- **Experimentation**: Create a baseline before trying different approaches
- **Collaboration**: Mark completed states before handing off to others
- **Recovery**: Restore a known-good state if something goes wrong

## Creating a Snapshot

1. Open the **Snapshots Panel** from the toolbar or Studio rail
2. Enter a name in the version name field
3. Click the save button

The snapshot saves the current state including all nodes, edges, and their properties.

## Viewing Snapshots

The Snapshots Panel shows two sections:

### Named Versions

Snapshots you created manually with custom names. These are persistent and won't be automatically deleted.

### Autosaved Checkpoints

Automatic snapshots created by the system:

- Before major operations like imports or AI generations
- At regular intervals during editing sessions
- These help you recover from unexpected issues

## Restoring a Snapshot

1. Find the snapshot in the Snapshots Panel
2. Click the restore button on the card
3. The diagram reverts to that snapshot's state
4. You can continue editing from there

Restoring does not delete other snapshots — you can always restore a different one later.

## Comparing with Current State

1. Find the snapshot you want to compare
2. Click the compare button
3. The diagram enters compare mode showing:
   - Nodes that were added (green)
   - Nodes that were removed (red)
   - Nodes that were modified (yellow)
4. Exit compare mode to continue editing

See [Diagram Diff & Compare](/diagram-diff/) for more on compare mode.

## Deleting Snapshots

- Click the delete button on a snapshot card to remove it
- Autosaved checkpoints can be deleted to clean up the list
- Deleted snapshots cannot be recovered

## Best Practices

1. **Name snapshots meaningfully**: "Before AI rewrite v2" is better than "Version 2"
2. **Create before risky operations**: Always snapshot before import, AI generation, or batch edits
3. **Use autosaved checkpoints**: They're helpful fallbacks but don't rely on them alone
4. **Clean up old snapshots**: Delete outdated snapshots to keep the list manageable

## Related Pages

- [Playback & History](/playback-history/)
- [Diagram Diff & Compare](/diagram-diff/)
- [Import from Structured Data](/import-from-data/)
- [AI Generation](/ai-generation/)
