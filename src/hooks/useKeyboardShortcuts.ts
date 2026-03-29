import { useEffect } from 'react';
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
  onCopy?: () => void;
  onPaste?: () => void;
  onCopyStyle?: () => void;
  onPasteStyle?: () => void;
  onQuickCreateShortcut?: (direction: 'up' | 'right' | 'down' | 'left') => void;
  onAnnotationColorShortcut?: (color: 'yellow' | 'green' | 'blue' | 'pink' | 'violet' | 'orange') => void;
  onClearSelection?: () => void;
  onNudge?: (dx: number, dy: number) => void;
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
  onCopy,
  onPaste,
  onCopyStyle,
  onPasteStyle,
  onQuickCreateShortcut,
  onAnnotationColorShortcut,
  onClearSelection,
  onNudge,
}: ShortcutHandlers): void {
  useEffect(() => {
    function isEditableElement(element: EventTarget | null): boolean {
      if (!(element instanceof HTMLElement)) {
        return false;
      }

      const tag = element.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || element.isContentEditable;
    }

    function isEditableEventTarget(event: KeyboardEvent): boolean {
      if (isEditableElement(event.target)) {
        return true;
      }

      return isEditableElement(document.activeElement);
    }

    function handleKeyDown(e: KeyboardEvent): void {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;
      const key = e.key.toLowerCase();
      const isEditable = isEditableEventTarget(e);

      // Command Bar (Cmd+K)
      if (isCmdOrCtrl && key === 'k') {
        if (isEditable) return;
        e.preventDefault();
        onCommandBar();
        return;
      }

      // Search (Cmd+F)
      if (isCmdOrCtrl && key === 'f') {
        if (isEditable) return;
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

      if (!isCmdOrCtrl && e.altKey && !isEditable) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          onQuickCreateShortcut?.('up');
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          onQuickCreateShortcut?.('right');
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          onQuickCreateShortcut?.('down');
          return;
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          onQuickCreateShortcut?.('left');
          return;
        }
      }

      if (!isCmdOrCtrl && !isEditable && selectedNodeType === 'annotation') {
        const annotationColors = ['yellow', 'green', 'blue', 'pink', 'violet', 'orange'] as const;
        const shortcutIndex = Number(e.key) - 1;
        if (shortcutIndex >= 0 && shortcutIndex < annotationColors.length) {
          e.preventDefault();
          onAnnotationColorShortcut?.(annotationColors[shortcutIndex]);
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
        if (!selectedNodeId) return;
        e.preventDefault();
        requestNodeLabelEdit(selectedNodeId);
        return;
      }

      const isPrintableCharacter = e.key.length === 1 && !isCmdOrCtrl && !e.altKey;
      if (isPrintableCharacter) {
        if (isEditable) return;
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
        if (isEditable) return;
        e.preventDefault();
        selectAll();
      }

      // Copy (Cmd+C)
      if (isCmdOrCtrl && key === 'c' && !isEditable) {
        onCopy?.();
        // Don't preventDefault — let browser clipboard also work
      }

      if (isCmdOrCtrl && e.altKey && key === 'c' && !isEditable) {
        e.preventDefault();
        onCopyStyle?.();
      }

      // Paste (Cmd+V)
      if (isCmdOrCtrl && key === 'v' && !isEditable) {
        onPaste?.();
      }

      if (isCmdOrCtrl && e.altKey && key === 'v' && !isEditable) {
        e.preventDefault();
        onPasteStyle?.();
      }

      // Escape — deselect / clear selection
      if (e.key === 'Escape' && !isEditable) {
        onClearSelection?.();
      }

      // Arrow key nudge (1px; Shift = 10px)
      if (!isCmdOrCtrl && !isEditable) {
        const nudgeDist = isShift ? 10 : 1;
        if (e.key === 'ArrowLeft')  { e.preventDefault(); onNudge?.(-nudgeDist, 0); }
        if (e.key === 'ArrowRight') { e.preventDefault(); onNudge?.(nudgeDist, 0); }
        if (e.key === 'ArrowUp')    { e.preventDefault(); onNudge?.(0, -nudgeDist); }
        if (e.key === 'ArrowDown')  { e.preventDefault(); onNudge?.(0, nudgeDist); }
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNodeId, selectedEdgeId, selectedNodeType, deleteNode, deleteEdge, undo, redo, duplicateNode, selectAll, onAddMindmapChildShortcut, onAddMindmapSiblingShortcut, onCommandBar, onSearch, onShortcutsHelp, onSelectMode, onPanMode, onFitView, onZoomIn, onZoomOut, onCopy, onPaste, onCopyStyle, onPasteStyle, onQuickCreateShortcut, onAnnotationColorShortcut, onClearSelection, onNudge]);
}
