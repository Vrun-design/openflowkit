import { useEffect, useRef } from 'react';
import { requestNodeLabelEdit } from './nodeLabelEditRequest';
import { ROLLOUT_FLAGS } from '../config/rolloutFlags';
import {
  DEFAULT_KEYBOARD_BINDINGS,
  KEYBOARD_BINDINGS_CHANGED_EVENT,
  chordFromEvent,
  loadKeyboardBindings,
  resolveKeyboardAction,
  type KeyboardActionId,
  type KeyboardBindings,
} from '../services/keyboardBindings';

interface ShortcutHandlers {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  selectedNodeType?: string | null;
  deleteNode: (id: string) => void;
  deleteEdge: (id: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndoUnavailable?: () => void;
  onRedoUnavailable?: () => void;
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
  onTogglePinPositionShortcut?: () => void;
}

/**
 * Live bindings for the named editor commands. Resolution always runs; the
 * rollout flag only decides whether stored user overrides are honoured, so the
 * flag-off path is exactly the shipped defaults and there is one dispatch path
 * rather than two that can drift apart.
 */
function useKeyboardBindingsRef(): React.MutableRefObject<KeyboardBindings> {
  const bindingsRef = useRef<KeyboardBindings>(DEFAULT_KEYBOARD_BINDINGS);

  useEffect(() => {
    if (!ROLLOUT_FLAGS.openCanvasCustomShortcutsV1) {
      bindingsRef.current = DEFAULT_KEYBOARD_BINDINGS;
      return;
    }

    function refresh(): void {
      bindingsRef.current = loadKeyboardBindings();
    }

    refresh();
    window.addEventListener(KEYBOARD_BINDINGS_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener(KEYBOARD_BINDINGS_CHANGED_EVENT, refresh);
      bindingsRef.current = DEFAULT_KEYBOARD_BINDINGS;
    };
  }, []);

  return bindingsRef;
}

export function useKeyboardShortcuts({
  selectedNodeId,
  selectedEdgeId,
  selectedNodeType,
  deleteNode,
  deleteEdge,
  undo,
  redo,
  canUndo,
  canRedo,
  onUndoUnavailable,
  onRedoUnavailable,
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
  onTogglePinPositionShortcut,
}: ShortcutHandlers): void {
  const bindingsRef = useKeyboardBindingsRef();

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

    /**
     * Runs one remappable command. Returns false when the command has no
     * handler wired, so the key still reaches the contextual handlers below.
     */
    function runBoundAction(actionId: KeyboardActionId, e: KeyboardEvent): boolean {
      switch (actionId) {
        case 'commandBar':
          e.preventDefault();
          onCommandBar();
          return true;
        case 'search':
          e.preventDefault();
          onSearch();
          return true;
        case 'shortcutsHelp':
          e.preventDefault();
          onShortcutsHelp();
          return true;
        case 'undo':
          e.preventDefault();
          if (canUndo === false) {
            onUndoUnavailable?.();
          } else {
            undo();
          }
          return true;
        case 'redo':
          e.preventDefault();
          if (canRedo === false) {
            onRedoUnavailable?.();
          } else {
            redo();
          }
          return true;
        case 'selectAll':
          e.preventDefault();
          selectAll();
          return true;
        case 'duplicate':
          e.preventDefault();
          if (selectedNodeId) duplicateNode(selectedNodeId);
          return true;
        // Copy/paste stay un-prevented so the browser clipboard still fires.
        case 'copy':
          onCopy?.();
          return true;
        case 'paste':
          onPaste?.();
          return true;
        case 'copyStyle':
          e.preventDefault();
          onCopyStyle?.();
          return true;
        case 'pasteStyle':
          e.preventDefault();
          onPasteStyle?.();
          return true;
        case 'selectMode':
          e.preventDefault();
          onSelectMode?.();
          return true;
        case 'panMode':
          e.preventDefault();
          onPanMode?.();
          return true;
        case 'fitView':
          e.preventDefault();
          onFitView?.();
          return true;
        case 'zoomIn':
          e.preventDefault();
          onZoomIn?.();
          return true;
        case 'zoomOut':
          e.preventDefault();
          onZoomOut?.();
          return true;
        case 'togglePinPosition':
          if (!onTogglePinPositionShortcut) return false;
          e.preventDefault();
          onTogglePinPositionShortcut();
          return true;
        default:
          return false;
      }
    }

    function handleKeyDown(e: KeyboardEvent): void {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;
      const isEditable = isEditableEventTarget(e);

      // Named remappable commands are suppressed entirely while typing.
      if (!isEditable) {
        const chord = chordFromEvent(e);
        const actionId = chord ? resolveKeyboardAction(chord, bindingsRef.current) : null;
        if (actionId && runBoundAction(actionId, e)) {
          return;
        }
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
  }, [bindingsRef, selectedNodeId, selectedEdgeId, selectedNodeType, deleteNode, deleteEdge, undo, redo, canUndo, canRedo, onUndoUnavailable, onRedoUnavailable, duplicateNode, selectAll, onAddMindmapChildShortcut, onAddMindmapSiblingShortcut, onCommandBar, onSearch, onShortcutsHelp, onSelectMode, onPanMode, onFitView, onZoomIn, onZoomOut, onCopy, onPaste, onCopyStyle, onPasteStyle, onQuickCreateShortcut, onAnnotationColorShortcut, onClearSelection, onNudge, onTogglePinPositionShortcut]);
}
