import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearSelection,
  replaceSelection,
  type CanvasSelection,
} from '../../application/selection/selection';
import type { ScenePage } from '../../domain/document/types';

// Selection is not history: commits never fire for selection changes, and
// undo/redo never restore them. A click selects nodes or one connector so the
// context bar has one subject; a marquee or ⌘A may hold both, and then the
// nodes are the subject. `selectedConnectorId` is the one editable connector.
// ponytail: many connectors alone show no style bar — add a multi-connector
// subject to V2ContextBar when restyling a marquee of edges matters.
export function useV2Selection() {
  const [selection, setSelection] = useState<CanvasSelection>(clearSelection);
  const [selectedConnectorIds, setSelectedConnectorIds] = useState<readonly string[]>([]);
  const selectedConnectorId = selectedConnectorIds.length === 1 ? selectedConnectorIds[0]! : null;
  const selectionRef = useRef(selection);
  const selectedConnectorIdsRef = useRef(selectedConnectorIds);
  useEffect(() => {
    selectionRef.current = selection;
    selectedConnectorIdsRef.current = selectedConnectorIds;
  }, [selection, selectedConnectorIds]);

  const applySelection = useCallback((next: CanvasSelection) => {
    selectionRef.current = next;
    setSelection(next);
  }, []);
  const applyConnectorSelection = useCallback((connectorIds: readonly string[]) => {
    selectedConnectorIdsRef.current = connectorIds;
    setSelectedConnectorIds(connectorIds);
  }, []);
  const clearAll = useCallback(() => {
    selectionRef.current = clearSelection();
    setSelection(clearSelection());
    selectedConnectorIdsRef.current = [];
    setSelectedConnectorIds([]);
  }, []);
  const selectAll = useCallback((page: ScenePage | null) => {
    if (!page) return;
    selectedConnectorIdsRef.current = page.connectors.map((connector) => connector.id);
    setSelectedConnectorIds(selectedConnectorIdsRef.current);
    const next = replaceSelection(page.nodes.map((node) => node.id));
    selectionRef.current = next;
    setSelection(next);
  }, []);

  return {
    selection,
    selectionRef,
    selectedConnectorId,
    selectedConnectorIds,
    selectedConnectorIdsRef,
    applySelection,
    applyConnectorSelection,
    clearAll,
    selectAll,
  };
}
