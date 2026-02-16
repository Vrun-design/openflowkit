import { useEffect, useState } from 'react';

interface ShortcutHandlers {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  deleteNode: (id: string) => void;
  deleteEdge: (id: string) => void;
  undo: () => void;
  redo: () => void;
  duplicateNode: (id: string) => void;
  selectAll: () => void;
  onCommandBar: () => void;
  onSearch: () => void;
  onShortcutsHelp: () => void;
}

export const useKeyboardShortcuts = ({
  selectedNodeId,
  selectedEdgeId,
  deleteNode,
  deleteEdge,
  undo,
  redo,
  duplicateNode,
  selectAll,
  onCommandBar,
  onSearch,
  onShortcutsHelp,
}: ShortcutHandlers) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {

      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;

      // Command Bar (Cmd+K)
      if (isCmdOrCtrl && e.key === 'k') {
        e.preventDefault();
        onCommandBar();
        return;
      }

      // Search (Cmd+F)
      if (isCmdOrCtrl && e.key === 'f') {
        e.preventDefault();
        onSearch();
        return;
      }

      // Help (?) - Shift+/
      if (e.key === '?' || (isShift && e.key === '/')) {
        // Only if not typing in input
        const tag = (document.activeElement as HTMLElement)?.tagName;
        const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || (document.activeElement as HTMLElement)?.isContentEditable;
        if (!isEditable) {
          e.preventDefault();
          onShortcutsHelp();
        }
      }

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const tag = (document.activeElement as HTMLElement)?.tagName;
        const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || (document.activeElement as HTMLElement)?.isContentEditable;
        if (isEditable) return;

        if (selectedNodeId) {
          deleteNode(selectedNodeId);
        }
        if (selectedEdgeId) {
          deleteEdge(selectedEdgeId);
        }
      }

      // Undo / Redo
      if (isCmdOrCtrl && e.key === 'z') {
        e.preventDefault();
        if (isShift) {
          redo();
        } else {
          undo();
        }
      }
      if (isCmdOrCtrl && e.key === 'y') {
        e.preventDefault();
        redo();
      }

      // Duplicate
      if (isCmdOrCtrl && e.key === 'd') {
        e.preventDefault();
        if (selectedNodeId) duplicateNode(selectedNodeId);
      }

      // Select All
      if (isCmdOrCtrl && e.key === 'a') {
        e.preventDefault();
        // Only if focus is body or canvas (not inputs)
        const tag = (document.activeElement as HTMLElement)?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          selectAll();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNodeId, selectedEdgeId, deleteNode, deleteEdge, undo, redo, duplicateNode, selectAll, onCommandBar, onSearch, onShortcutsHelp]);
};
