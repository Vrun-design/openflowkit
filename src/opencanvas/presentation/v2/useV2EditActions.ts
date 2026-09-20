import type { RefObject } from 'react';
import type { ScenePage } from '../../domain/document/types';
import {
  clearSelection,
  replaceSelection,
  type CanvasSelection,
} from '../../application/selection/selection';
import type { DocumentCommand } from '../../domain/commands/types';
import {
  buildDeleteSelectionCommand,
  buildDuplicateSelectionCommand,
  buildMoveNodesCommand,
} from '../../domain/commands/sceneEdits';

interface V2EditActionsOptions {
  readonly commit: (command: DocumentCommand) => void;
  readonly pageRef: RefObject<ScenePage | null>;
  readonly selectionRef: RefObject<CanvasSelection>;
  readonly selectedConnectorId: string | null;
  readonly mintId: (prefix: string) => string;
  readonly readOnly: boolean;
  readonly applySelection: (selection: CanvasSelection) => void;
  readonly applyConnectorSelection: (connectorId: string | null) => void;
  readonly announce: (message: string) => void;
}

// Commits scoped to the current selection: the context bar and keyboard
// share these, and both stay inert in read-only mode. Consumers read them
// through refs or plain props, so no memoization is needed.
export function useV2EditActions(options: V2EditActionsOptions) {
  const { pageRef, selectionRef, selectedConnectorId, readOnly } = options;
  const connectorIds = () => (selectedConnectorId ? [selectedConnectorId] : []);
  const editablePage = () => {
    const page = pageRef.current;
    return page && !readOnly ? page : null;
  };

  const deleteSelection = () => {
    const page = editablePage();
    if (!page || (selectionRef.current.nodeIds.length === 0 && !selectedConnectorId)) return;
    options.commit(buildDeleteSelectionCommand(page, selectionRef.current.nodeIds, connectorIds()));
    options.applySelection(clearSelection());
    options.applyConnectorSelection(null);
    options.announce('Selection deleted.');
  };

  const duplicateSelection = () => {
    const page = editablePage();
    if (!page || selectionRef.current.nodeIds.length === 0) return;
    const command = buildDuplicateSelectionCommand(
      page,
      selectionRef.current.nodeIds,
      connectorIds(),
      options.mintId
    );
    options.commit(command);
    options.applySelection(
      replaceSelection(
        command.commands.flatMap((child) => (child.kind === 'insert-node' ? [child.node.id] : []))
      )
    );
    options.applyConnectorSelection(null);
    options.announce('Selection duplicated.');
  };

  const nudgeSelection = (delta: { x: number; y: number }) => {
    const page = editablePage();
    if (!page || selectionRef.current.nodeIds.length === 0) return;
    options.commit(buildMoveNodesCommand(page, selectionRef.current.nodeIds, delta));
  };

  return { deleteSelection, duplicateSelection, nudgeSelection };
}
