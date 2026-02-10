import { useEffect } from 'react';

interface ShortcutHandlers {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  deleteNode: (id: string) => void;
  deleteEdge: (id: string) => void;
  undo: () => void;
  redo: () => void;
  duplicateNode: (id: string) => void;
  selectAll: () => void;
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
}: ShortcutHandlers) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }

      // Duplicate
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        if (selectedNodeId) duplicateNode(selectedNodeId);
      }

      // Select All
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        if (document.activeElement === document.body) {
          selectAll();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedEdgeId, deleteNode, deleteEdge, undo, redo, duplicateNode, selectAll]);
};
