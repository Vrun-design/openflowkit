import { useCallback, useEffect, useRef, type KeyboardEvent, type RefObject } from 'react';
import { isEditableTarget } from './pointerOperations';
import type { V2Tool } from './V2CreationToolbar';
import type { AlignMode, DistributeAxis } from '../../domain/transforms/arrangement';

interface V2KeyboardOptions {
  readonly toolRef: RefObject<V2Tool>;
  readonly editingRef: RefObject<boolean>;
  readonly onToolChange: (tool: V2Tool) => void;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onDelete: () => void;
  readonly onDuplicate: () => void;
  readonly onReorder: (direction: 'front' | 'back' | 'forward' | 'backward') => void;
  readonly onToggleLock: () => void;
  readonly onGroup: () => void;
  readonly onUngroup: () => void;
  readonly onWrapInSection: () => void;
  readonly onCut: () => void;
  readonly onCopy: () => void;
  readonly onPaste: () => void;
  readonly onCopyStyle: () => void;
  readonly onPasteStyle: () => void;
  readonly onAlign: (mode: AlignMode) => void;
  readonly onDistribute: (axis: DistributeAxis) => void;
  readonly onFlip: (axis: 'horizontal' | 'vertical') => void;
  readonly onZoomToSelection: () => void;
  /** ⌘B / ⌘I / ⌘U on a selection (not while editing). */
  readonly onTextStyle: (toggle: 'bold' | 'italic' | 'underline') => void;
  /** Enter drills into a model view when there is one; F2/⌘Enter always rename. */
  readonly onEditPrimary: (source: 'enter' | 'f2') => void;
  /** ⌘⇧⌫ on a C4 element: remove it from the model and every view. */
  readonly onRemoveFromModel: () => void;
  readonly onNudge: (delta: { x: number; y: number }) => void;
  readonly onCancelGesture: () => boolean;
  /** Enter: finish a click-by-click path; false falls through to label editing. */
  readonly onCommitGesture: () => boolean;
  readonly onClearSelection: () => void;
  readonly onSelectAll: () => void;
  readonly onFitView: () => void;
  readonly onZoomStep: (factor: number) => void;
  readonly onResetZoom: () => void;
  readonly onToggleTree: () => void;
  readonly onToggleIcons: () => void;
  /** E opens the emoji picker; ⇧I picks an image file. */
  readonly onToggleEmoji: () => void;
  readonly onInsertImage: () => void;
  readonly onToggleAgent: () => void;
  readonly onToggleCode: () => void;
  readonly onToggleModel: () => void;
  readonly onSpacePan: (active: boolean) => void;
  /** Type-to-edit: return true when the key opened an editor, false to fall through to shortcuts. */
  readonly onTypeToEdit: (key: string) => boolean;
}

// ⌥ shortcuts read event.code: on macOS ⌥A produces "å" in event.key.
const ALT_ALIGN: Readonly<Record<string, AlignMode>> = {
  KeyA: 'left', KeyD: 'right', KeyW: 'top', KeyS: 'bottom', KeyH: 'center-x', KeyV: 'center-y',
};

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
    } else if (command && event.altKey && (key === 'c' || event.code === 'KeyC')) {
      opts.onCopyStyle();
      event.preventDefault();
    } else if (command && event.altKey && (key === 'v' || event.code === 'KeyV')) {
      opts.onPasteStyle();
      event.preventDefault();
    } else if (command && (key === 'g' || event.code === 'KeyG')) {
      if (event.shiftKey) opts.onUngroup(); else if (event.altKey) opts.onWrapInSection(); else opts.onGroup();
      event.preventDefault();
    } else if (command && key === 'x') {
      opts.onCut();
      event.preventDefault();
    } else if (command && key === 'c') {
      opts.onCopy();
      event.preventDefault();
    } else if (command && key === 'v') {
      opts.onPaste();
      event.preventDefault();
    } else if (command && (key === 'b' || key === 'i' || key === 'u')) {
      opts.onTextStyle(key === 'b' ? 'bold' : key === 'i' ? 'italic' : 'underline');
      event.preventDefault();
    } else if (command && (event.code === 'BracketRight' || event.code === 'BracketLeft')) {
      const front = event.code === 'BracketRight';
      opts.onReorder(event.altKey ? (front ? 'front' : 'back') : (front ? 'forward' : 'backward'));
      event.preventDefault();
    } else if (!command && (event.key === ']' || event.key === '[')) {
      opts.onReorder(event.key === ']' ? 'front' : 'back');
      event.preventDefault();
    } else if (!command && event.altKey && event.shiftKey && (event.code === 'KeyH' || event.code === 'KeyV')) {
      opts.onDistribute(event.code === 'KeyH' ? 'horizontal' : 'vertical');
      event.preventDefault();
    } else if (!command && event.altKey && !event.shiftKey && ALT_ALIGN[event.code]) {
      opts.onAlign(ALT_ALIGN[event.code]);
      event.preventDefault();
    } else if (!command && event.altKey && event.code === 'KeyD') {
      opts.onToggleCode();
      event.preventDefault();
    } else if (!command && event.altKey && event.code === 'KeyM') {
      opts.onToggleModel();
      event.preventDefault();
    } else if (command && key === 'j') {
      opts.onToggleAgent();
      event.preventDefault();
    } else if (command && event.shiftKey && (event.key === 'Delete' || event.key === 'Backspace')) {
      opts.onRemoveFromModel();
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
    // ⇧H/V and ⇧1/⇧2 sit below type-to-edit: a capital letter on one selected
    // shape starts its label; flips need none or several selected.
    } else if (!command && !event.altKey && event.shiftKey && event.code === 'KeyI') {
      opts.onInsertImage();
      event.preventDefault();
    } else if (!command && !event.altKey && event.shiftKey && event.code === 'KeyP') {
      opts.onToolChange('highlighter');
      event.preventDefault();
    } else if (!command && !event.altKey && event.shiftKey && (event.code === 'KeyH' || event.code === 'KeyV')) {
      opts.onFlip(event.code === 'KeyH' ? 'horizontal' : 'vertical');
      event.preventDefault();
    } else if (!command && !event.altKey && event.shiftKey && (event.code === 'Digit1' || event.code === 'Digit2')) {
      if (event.code === 'Digit1') opts.onFitView(); else opts.onZoomToSelection();
      event.preventDefault();
    } else if (!command && !event.shiftKey && !event.altKey && key === 'v') {
      opts.onToolChange('select');
    } else if (!command && !event.shiftKey && !event.altKey && key === 'h') {
      opts.onToolChange('hand');
    } else if (!command && !event.shiftKey && !event.altKey && key === 'r') {
      opts.onToolChange('rectangle');
    } else if (!command && !event.shiftKey && !event.altKey && key === 'o') {
      opts.onToolChange('ellipse');
    } else if (!command && !event.shiftKey && !event.altKey && key === 's') {
      opts.onToolChange('shape');
    } else if (!command && !event.shiftKey && !event.altKey && key === 'a') {
      opts.onToolChange('connector');
    } else if (!command && !event.shiftKey && !event.altKey && key === 't') {
      opts.onToolChange('text');
    } else if (!command && !event.shiftKey && !event.altKey && key === 'p') {
      opts.onToolChange('pen');
    } else if (!command && !event.shiftKey && !event.altKey && key === 'x') {
      opts.onToolChange('eraser');
    } else if (!command && !event.shiftKey && !event.altKey && key === 'q') {
      opts.onToolChange('lasso');
    } else if (!command && key === 'l') {
      opts.onToggleTree();
    } else if (!command && !event.shiftKey && !event.altKey && key === 'i') {
      opts.onToggleIcons();
    } else if (!command && !event.shiftKey && !event.altKey && key === 'e') {
      opts.onToggleEmoji();
    } else if (event.key === 'F2') {
      opts.onEditPrimary('f2');
      event.preventDefault();
    } else if (event.key === 'Enter') {
      if (!opts.onCommitGesture()) opts.onEditPrimary(event.metaKey || event.shiftKey ? 'f2' : 'enter');
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
