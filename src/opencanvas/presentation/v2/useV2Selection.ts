import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearSelection,
  replaceSelection,
  type CanvasSelection,
} from '../../application/selection/selection';
import type { ScenePage } from '../../domain/document/types';

// Selection is not history: commits never fire for selection changes, and
// undo/redo never restore them. Connector selection clears node selection
// and vice versa so the context bar always has one subject.
export function useV2Selection() {
  const [selection, setSelection] = useState<CanvasSelection>(clearSelection);
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);
  const selectionRef = useRef(selection);
  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  const applySelection = useCallback((next: CanvasSelection) => {
    selectionRef.current = next;
    setSelection(next);
  }, []);
  const applyConnectorSelection = useCallback((connectorId: string | null) => {
    setSelectedConnectorId(connectorId);
  }, []);
  const clearAll = useCallback(() => {
    selectionRef.current = clearSelection();
    setSelection(clearSelection());
    setSelectedConnectorId(null);
  }, []);
  const selectAllNodes = useCallback((page: ScenePage | null) => {
    if (!page) return;
    setSelectedConnectorId(null);
    const next = replaceSelection(page.nodes.map((node) => node.id));
    selectionRef.current = next;
    setSelection(next);
  }, []);

  return {
    selection,
    selectionRef,
    selectedConnectorId,
    applySelection,
    applyConnectorSelection,
    clearAll,
    selectAllNodes,
  };
}
