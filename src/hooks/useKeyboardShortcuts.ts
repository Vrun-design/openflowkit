import { useEffect } from 'react';
import { ROLLOUT_FLAGS } from '@/config/rolloutFlags';
import { requestNodeLabelEdit } from './nodeLabelEditRequest';

interface ShortcutHandlers {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  selectedNodeType?: string | null;
  deleteNode: (id: string) => void;
  deleteEdge: (id: string) => void;
  undo: () => void;
  redo: () => void;
  duplicateNode: (id: string) => void;
  selectAll: () => void;
  onAddMindmapChildShortcut?: () => void;
  onAddMindmapSiblingShortcut?: () => void;
  onCommandBar: () => void;
  onSearch: () => void;
  onShortcutsHelp: () => void;
  onSelectMode?: () => void;
  onPanMode?: () => void;
  onFitView?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}

export function useKeyboardShortcuts({
  selectedNodeId,
  selectedEdgeId,
  selectedNodeType,
  deleteNode,
  deleteEdge,
  undo,
  redo,
  duplicateNode,
  selectAll,
  onAddMindmapChildShortcut,
  onAddMindmapSiblingShortcut,
  onCommandBar,
  onSearch,
  onShortcutsHelp,
  onSelectMode,
  onPanMode,
  onFitView,
  onZoomIn,
  onZoomOut,
}: ShortcutHandlers): void {
  useEffect(() => {
    const isEditableActiveElement = (): boolean => {
      const activeElement = document.activeElement as HTMLElement | null;
      if (!activeElement) return false;
      const tag = activeElement.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || activeElement.isContentEditable;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;
      const key = e.key.toLowerCase();
      const isEditable = isEditableActiveElement();

      // Command Bar (Cmd+K)
      if (isCmdOrCtrl && key === 'k') {
        e.preventDefault();
        onCommandBar();
        return;
      }

      // Search (Cmd+F)
      if (isCmdOrCtrl && key === 'f') {
        e.preventDefault();
        onSearch();
        return;
      }

      // Help (?) - Shift+/
      if (key === '?' || (isShift && key === '/')) {
        // Only if not typing in input
        if (!isEditable) {
          e.preventDefault();
          onShortcutsHelp();
        }
      }

      // Select mode (V) / Pan mode (H) — Figma/draw.io standard
      if (!isCmdOrCtrl && !isShift && !isEditable) {
        if (key === 'v') {
          e.preventDefault();
          onSelectMode?.();
        }
        if (key === 'h') {
          e.preventDefault();
          onPanMode?.();
        }
      }

      if (!isCmdOrCtrl && isShift && !isEditable && e.code === 'Digit1') {
        e.preventDefault();
        onFitView?.();
        return;
      }

      if (isCmdOrCtrl && !isEditable && (key === '=' || key === '+')) {
        e.preventDefault();
        onZoomIn?.();
        return;
      }

      if (isCmdOrCtrl && !isEditable && key === '-') {
        e.preventDefault();
        onZoomOut?.();
        return;
      }

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (isEditable) return;

        if (selectedNodeId) {
          deleteNode(selectedNodeId);
        }
        if (selectedEdgeId) {
          deleteEdge(selectedEdgeId);
        }
      }

      // Undo / Redo
      if (isCmdOrCtrl && key === 'z') {
        if (isEditable) return;
        e.preventDefault();
        if (isShift) {
          redo();
        } else {
          undo();
        }
      }
      if (isCmdOrCtrl && key === 'y') {
        if (isEditable) return;
        e.preventDefault();
        redo();
      }

      // Duplicate
      if (isCmdOrCtrl && key === 'd') {
        if (isEditable) return;
        e.preventDefault();
        if (selectedNodeId) duplicateNode(selectedNodeId);
      }

      // Mindmap quick-add child (Tab)
      if (!isCmdOrCtrl && !isEditable && e.key === 'Tab') {
        if (selectedNodeId && selectedNodeType === 'mindmap' && onAddMindmapChildShortcut) {
          e.preventDefault();
          onAddMindmapChildShortcut();
          return;
        }
      }

      // Mindmap quick-add sibling (Enter)
      if (!isCmdOrCtrl && !isShift && e.key === 'Enter') {
        if (isEditable) return;
        if (selectedNodeId && selectedNodeType === 'mindmap' && onAddMindmapSiblingShortcut) {
          e.preventDefault();
          onAddMindmapSiblingShortcut();
          return;
        }
      }

      // Enter inline label edit for selected node (F2)
      if (e.key === 'F2') {
        if (isEditable) return;
        if (!ROLLOUT_FLAGS.canvasInteractionsV1) return;
        if (!selectedNodeId) return;
        e.preventDefault();
        requestNodeLabelEdit(selectedNodeId);
        return;
      }

      const isPrintableCharacter = e.key.length === 1 && !isCmdOrCtrl && !e.altKey;
      if (isPrintableCharacter) {
        if (isEditable) return;
        if (!ROLLOUT_FLAGS.canvasInteractionsV1) return;
        if (!selectedNodeId) return;
        e.preventDefault();
        requestNodeLabelEdit(selectedNodeId, {
          seedText: e.key,
          replaceExisting: true,
        });
        return;
      }

      // Select All
      if (isCmdOrCtrl && key === 'a') {
        e.preventDefault();
        // Only if focus is body or canvas (not inputs)
        if (!isEditable) {
          selectAll();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNodeId, selectedEdgeId, selectedNodeType, deleteNode, deleteEdge, undo, redo, duplicateNode, selectAll, onAddMindmapChildShortcut, onAddMindmapSiblingShortcut, onCommandBar, onSearch, onShortcutsHelp, onSelectMode, onPanMode, onFitView, onZoomIn, onZoomOut]);
}
