import { useCallback, type KeyboardEvent, type RefObject } from 'react';
import type { DocumentHistoryState } from '../application/history/types';
import {
  clearSelection,
  replaceSelection,
  type CanvasSelection,
} from '../application/selection/selection';
import type { ConnectorEditHandle } from '../domain/connectors/editing';
import { createTransformSnapshot, moveTransform } from '../domain/transforms/transformSelection';
import type { TransformResult, TransformSnapshot } from '../domain/transforms/types';
import { cycleConnectorId } from './pixiConnectorOperations';
import { arrowNudgeDelta, isEditableTarget } from './pixiPointerOperations';
import type { CanvasMode } from './PixiSpikeControls';

interface KeyboardShortcutOptions {
  readonly historyRef: RefObject<DocumentHistoryState>;
  readonly selectionRef: RefObject<CanvasSelection>;
  readonly selectedConnectorIdRef: RefObject<string | null>;
  readonly activeConnectorHandleRef: RefObject<ConnectorEditHandle | null>;
  readonly primaryNodeId: string | null;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly addBend: () => void;
  readonly removeActiveBend: () => void;
  readonly resetRoute: () => void;
  readonly nudgeActiveHandle: (key: string, amount: number) => boolean;
  readonly applyConnectorSelection: (connectorId: string | null) => void;
  readonly applySelection: (selection: CanvasSelection) => void;
  readonly commitTransform: (
    page: DocumentHistoryState['present']['pages'][number],
    snapshot: TransformSnapshot,
    result: TransformResult,
    label: string
  ) => void;
  readonly fitView: () => void;
  readonly zoomFromCenter: (factor: number) => void;
  readonly setMode: (mode: CanvasMode) => void;
  readonly openEditor: (nodeId: string) => void;
}

export function usePixiKeyboardShortcuts(options: KeyboardShortcutOptions) {
  return useCallback(
    (event: KeyboardEvent<HTMLElement>): void => {
      if (isEditableTarget(event.target)) return;
      const command = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      const connectorId = options.selectedConnectorIdRef.current;
      const activeHandle = options.activeConnectorHandleRef.current;
      if (command && key === 'z') {
        if (event.shiftKey) options.redo();
        else options.undo();
      } else if (!command && key === 'e') {
        const page = options.historyRef.current.present.pages[0];
        options.applyConnectorSelection(
          cycleConnectorId(page, connectorId, event.shiftKey ? -1 : 1)
        );
      } else if (!command && event.key === 'Insert' && connectorId) {
        options.addBend();
      } else if (
        !command &&
        (event.key === 'Delete' || event.key === 'Backspace') &&
        activeHandle?.kind === 'waypoint'
      ) {
        options.removeActiveBend();
      } else if (!command && key === 'r' && connectorId) {
        options.resetRoute();
      } else if (
        !command &&
        ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) &&
        connectorId &&
        activeHandle &&
        activeHandle.kind !== 'endpoint'
      ) {
        options.nudgeActiveHandle(event.key, event.shiftKey ? 10 : 1);
      } else if (
        !command &&
        ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) &&
        options.selectionRef.current.nodeIds.length > 0
      ) {
        const page = options.historyRef.current.present.pages[0];
        const snapshot = createTransformSnapshot(page, options.selectionRef.current.nodeIds);
        const delta = arrowNudgeDelta(event.key, event.shiftKey ? 10 : 1);
        options.commitTransform(
          page,
          snapshot,
          moveTransform(snapshot, delta, { snap: false }),
          'Nudge selection'
        );
      } else if (!command && key === 'v') options.setMode('select');
      else if (!command && key === 'h') options.setMode('pan');
      else if (event.shiftKey && event.code === 'Digit1') options.fitView();
      else if (command && (event.key === '=' || event.key === '+')) options.zoomFromCenter(1.2);
      else if (command && event.key === '-') options.zoomFromCenter(1 / 1.2);
      else if (command && key === 'a') {
        const nodeIds = options.historyRef.current.present.pages[0].nodes.map(({ id }) => id);
        options.applyConnectorSelection(null);
        options.applySelection(replaceSelection(nodeIds));
      } else if (event.key === 'Escape') {
        if (connectorId) options.applyConnectorSelection(null);
        else options.applySelection(clearSelection());
      } else if (event.key === 'F2' && options.primaryNodeId) {
        options.openEditor(options.primaryNodeId);
      } else return;
      event.preventDefault();
    },
    [options]
  );
}
