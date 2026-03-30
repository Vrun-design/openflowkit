import { useCallback } from 'react';
import { APP_STORAGE_KEYS } from '@/lib/legacyBranding';
import { parseNodeStyleData, pickNodeStyleData } from '@/lib/nodeStyleData';
import { readLocalStorageString, writeLocalStorageJson } from '@/services/storage/uiLocalStorage';
import { useCanvasActions, useCanvasState } from '@/store/canvasHooks';

const STYLE_CLIPBOARD_STORAGE_KEY = APP_STORAGE_KEYS.styleClipboard;

export function useStyleClipboard(recordHistory: () => void) {
  const { nodes } = useCanvasState();
  const { setNodes } = useCanvasActions();

  const copyStyleSelection = useCallback(() => {
    const sourceNode = nodes.find((node) => node.selected);
    if (!sourceNode) {
      return;
    }

    writeLocalStorageJson(
      STYLE_CLIPBOARD_STORAGE_KEY,
      pickNodeStyleData(sourceNode.data)
    );
  }, [nodes]);

  const pasteStyleSelection = useCallback(() => {
    const styleDataRaw = readLocalStorageString(STYLE_CLIPBOARD_STORAGE_KEY);
    if (!styleDataRaw) {
      return;
    }

    const selectedIds = new Set(nodes.filter((node) => node.selected).map((node) => node.id));
    if (selectedIds.size === 0) {
      return;
    }

    const styleData = parseNodeStyleData(JSON.parse(styleDataRaw));
    if (!styleData) {
      return;
    }

    recordHistory();
    setNodes((currentNodes) => currentNodes.map((node) => (
      selectedIds.has(node.id)
        ? { ...node, data: { ...node.data, ...styleData } }
        : node
    )));
  }, [nodes, recordHistory, setNodes]);

  return {
    copyStyleSelection,
    pasteStyleSelection,
  };
}
