import { useCallback, useRef, useState, type RefObject } from 'react';
import {
  canRedoDocument,
  canUndoDocument,
  commitDocumentCommand,
  createDocumentHistory,
  redoDocumentCommand,
  undoDocumentCommand,
} from '../application/history/history';
import type { DocumentHistoryState } from '../application/history/types';
import { replaceSelection, type CanvasSelection } from '../application/selection/selection';
import { areStructurallyEqual } from '../domain/commands/equality';
import { createConnectorEditCommand } from '../domain/connectors/editing';
import type { SceneConnector, SceneNode, ScenePage } from '../domain/document/types';
import { createTransformCommand } from '../domain/transforms/transformSelection';
import type { TransformResult, TransformSnapshot } from '../domain/transforms/types';
import type { PixiRendererHost } from '../infrastructure/pixi/PixiRendererHost';
import { createPixiSpikeDocument } from '../infrastructure/pixi/spikeFixture';

interface PixiDocumentHistoryOptions {
  readonly initialNodeCount: number;
  readonly hostRef: RefObject<PixiRendererHost | null>;
  readonly selectionRef: RefObject<CanvasSelection>;
  readonly selectedConnectorIdRef: RefObject<string | null>;
  readonly applySelection: (selection: CanvasSelection) => void;
  readonly applyConnectorSelection: (connectorId: string | null) => void;
}

export function usePixiDocumentHistory(options: PixiDocumentHistoryOptions) {
  const { applyConnectorSelection, applySelection, hostRef, selectedConnectorIdRef, selectionRef } =
    options;
  const [present, setPresent] = useState(() => createPixiSpikeDocument(options.initialNodeCount));
  const historyRef = useRef<DocumentHistoryState>(createDocumentHistory(present));
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const applyHistory = useCallback(
    (history: DocumentHistoryState) => {
      historyRef.current = history;
      setPresent(history.present);
      const page = history.present.pages[0];
      hostRef.current?.setPage(page);
      const availableNodeIds = new Set(page.nodes.map((node) => node.id));
      const selectedNodes = selectionRef.current.nodeIds.filter((id) => availableNodeIds.has(id));
      applySelection(replaceSelection(selectedNodes));
      const selectedConnectorId = selectedConnectorIdRef.current;
      applyConnectorSelection(
        selectedConnectorId && page.connectors.some(({ id }) => id === selectedConnectorId)
          ? selectedConnectorId
          : null
      );
      setCanUndo(canUndoDocument(history));
      setCanRedo(canRedoDocument(history));
    },
    [applyConnectorSelection, applySelection, hostRef, selectedConnectorIdRef, selectionRef]
  );

  const commitTransform = useCallback(
    (page: ScenePage, snapshot: TransformSnapshot, result: TransformResult, label: string) => {
      if (snapshot.nodes.every((node, index) => areStructurallyEqual(node, result.nodes[index]))) {
        return;
      }
      applyHistory(
        commitDocumentCommand(
          historyRef.current,
          createTransformCommand(page.id, snapshot.nodes, result.nodes, label)
        )
      );
      setAnnouncement(`${label} complete. Undo is available.`);
    },
    [applyHistory]
  );

  const commitConnector = useCallback(
    (page: ScenePage, before: SceneConnector, after: SceneConnector, label: string) => {
      const command = createConnectorEditCommand(page.id, before, after, label);
      if (!command) return;
      applyHistory(commitDocumentCommand(historyRef.current, command));
      setAnnouncement(`${label} complete. Undo is available.`);
    },
    [applyHistory]
  );

  const commitNode = useCallback(
    (page: ScenePage, before: SceneNode, after: SceneNode, label: string) => {
      if (areStructurallyEqual(before, after)) return;
      applyHistory(
        commitDocumentCommand(historyRef.current, {
          kind: 'set-node',
          id: `node-layout:${before.id}`,
          label,
          pageId: page.id,
          before,
          after,
        })
      );
      setAnnouncement(`${label} complete. Undo is available.`);
    },
    [applyHistory]
  );

  const undo = useCallback(() => {
    applyHistory(undoDocumentCommand(historyRef.current));
    setAnnouncement('Last canvas edit undone.');
  }, [applyHistory]);

  const redo = useCallback(() => {
    applyHistory(redoDocumentCommand(historyRef.current));
    setAnnouncement('Canvas edit redone.');
  }, [applyHistory]);

  const reset = useCallback(
    (nodeCount: number) => applyHistory(createDocumentHistory(createPixiSpikeDocument(nodeCount))),
    [applyHistory]
  );

  return {
    historyRef,
    present,
    canUndo,
    canRedo,
    announcement,
    commitTransform,
    commitConnector,
    commitNode,
    undo,
    redo,
    reset,
  };
}
