import { useCallback, useEffect, useRef, type KeyboardEvent, type RefObject } from 'react';
import { isEditableTarget } from './pointerOperations';
import type { V2Tool } from './V2CreationToolbar';

interface V2KeyboardOptions {
  readonly toolRef: RefObject<V2Tool>;
  readonly editingRef: RefObject<boolean>;
  readonly onToolChange: (tool: V2Tool) => void;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onDelete: () => void;
  readonly onDuplicate: () => void;
  readonly onReorder: (direction: 'front' | 'back') => void;
  readonly onToggleLock: () => void;
  readonly onEditPrimary: () => void;
  readonly onNudge: (delta: { x: number; y: number }) => void;
  readonly onCancelGesture: () => boolean;
  readonly onClearSelection: () => void;
  readonly onSelectAll: () => void;
  readonly onFitView: () => void;
  readonly onZoomStep: (factor: number) => void;
  readonly onResetZoom: () => void;
  readonly onToggleTree: () => void;
  readonly onToggleAgent: () => void;
  readonly onSpacePan: (active: boolean) => void;
  /** Type-to-edit: return true when the key opened an editor, false to fall through to shortcuts. */
  readonly onTypeToEdit: (key: string) => boolean;
}

// I-02: V/H/R/O/A/T switch tools; typing in a label or input never does.
// Escape exits the active gesture, then an armed tool, then the selection.
export function useV2Keyboard(options: V2KeyboardOptions) {
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  return useCallback((event: KeyboardEvent<HTMLElement>) => {
    const opts = optionsRef.current;
    if (event.defaultPrevented || isEditableTarget(event.target)) return;
    // Native chrome controls keep activation/navigation keys. Global tool and
    // history shortcuts still work after choosing a tool with the mouse.
    if (event.target instanceof HTMLElement && event.target.closest('button, [role="slider"], [role="menu"], [role="listbox"]')
      && [' ', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    if (event.key === ' ' && !event.repeat) {
      if (!opts.editingRef.current) {
        opts.onSpacePan(true);
        event.preventDefault();
      }
      return;
    }
    if (opts.editingRef.current) return;
    const command = event.metaKey || event.ctrlKey;
    const key = event.key.toLowerCase();
    if (command && key === 'z') {
      if (event.shiftKey) opts.onRedo();
      else opts.onUndo();
      event.preventDefault();
    } else if (command && key === 'y') {
      opts.onRedo();
      event.preventDefault();
    } else if (command && key === 'a') {
      opts.onSelectAll();
      event.preventDefault();
    } else if (command && (event.key === '=' || event.key === '+')) {
      opts.onZoomStep(1.2);
      event.preventDefault();
    } else if (command && event.key === '-') {
      opts.onZoomStep(1 / 1.2);
      event.preventDefault();
    } else if (command && key === '0') {
      opts.onFitView();
      event.preventDefault();
    } else if (command && key === '1') {
      opts.onResetZoom();
      event.preventDefault();
    } else if (command && key === 'd') {
      opts.onDuplicate();
      event.preventDefault();
    } else if (command && key === 'l') {
      opts.onToggleLock();
      event.preventDefault();
    } else if (!command && (event.key === ']' || event.key === '[')) {
      opts.onReorder(event.key === ']' ? 'front' : 'back');
      event.preventDefault();
    } else if (command && key === 'j') {
      opts.onToggleAgent();
      event.preventDefault();
    } else if (!command && (event.key === 'Delete' || event.key === 'Backspace')) {
      opts.onDelete();
      event.preventDefault();
    } else if (
      !command &&
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
    ) {
      const amount = event.shiftKey ? 10 : 1;
      const delta =
        event.key === 'ArrowLeft'
          ? { x: -amount, y: 0 }
          : event.key === 'ArrowRight'
            ? { x: amount, y: 0 }
            : event.key === 'ArrowUp'
              ? { x: 0, y: -amount }
              : { x: 0, y: amount };
      opts.onNudge(delta);
      event.preventDefault();
    } else if (!command && !event.altKey && event.key.length === 1 && event.key !== ' '
      && opts.onTypeToEdit(event.key)) {
      event.preventDefault();
    } else if (!command && !event.shiftKey && !event.altKey && key === 'v') {
      opts.onToolChange('select');
    } else if (!command && !event.shiftKey && !event.altKey && key === 'h') {
      opts.onToolChange('hand');
    } else if (!command && !event.shiftKey && !event.altKey && key === 'r') {
      opts.onToolChange('rectangle');
    } else if (!command && !event.shiftKey && !event.altKey && key === 'o') {
      opts.onToolChange('ellipse');
    } else if (!command && !event.shiftKey && !event.altKey && key === 'a') {
      opts.onToolChange('connector');
    } else if (!command && !event.shiftKey && !event.altKey && key === 't') {
      opts.onToolChange('text');
    } else if (!command && key === 'l') {
      opts.onToggleTree();
    } else if (event.key === 'F2') {
      opts.onEditPrimary();
      event.preventDefault();
    } else if (event.key === 'Enter') {
      opts.onEditPrimary();
      event.preventDefault();
    } else if (event.key === 'Escape') {
      if (opts.onCancelGesture()) {
        /* gesture dropped */
      } else if (opts.toolRef.current !== 'select') {
        opts.onToolChange('select');
      } else {
        opts.onClearSelection();
      }
      event.preventDefault();
    }
  }, []);
}
