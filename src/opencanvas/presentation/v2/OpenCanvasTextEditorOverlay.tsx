import { useEffect, useRef } from 'react';
import type { Bounds2d } from '../../domain/geometry/types';
import { DEFAULT_NODE_CONTENT_LAYOUT } from '../../domain/node-layout/model';
import './openCanvasTextEditorOverlay.css';

// The placeholder a fresh text node carries; only this is select-all on open.
const PLACEHOLDER_LABEL = 'Text';

interface OpenCanvasTextEditorOverlayProps {
  readonly bounds: Bounds2d;
  readonly value: string;
  readonly label?: string;
  readonly onCommit: (value: string) => void;
  readonly onCancel: () => void;
}

export function OpenCanvasTextEditorOverlay({
  bounds,
  value,
  label = 'Edit node label',
  onCommit,
  onCancel,
}: OpenCanvasTextEditorOverlayProps): React.JSX.Element {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const finishedRef = useRef(false);
  const pad = DEFAULT_NODE_CONTENT_LAYOUT.padding;

  // Grow with the text and keep it vertically centred like the rendered label.
  const fit = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const height = Math.max(bounds.height, el.scrollHeight);
    el.style.height = `${height}px`;
    el.style.paddingTop = `${Math.max(pad.top, (height - (el.scrollHeight - pad.top - pad.bottom)) / 2)}px`;
  };

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    if (value === PLACEHOLDER_LABEL) el.select();
    else el.setSelectionRange(value.length, value.length);
    fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  const commit = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onCommit(inputRef.current?.value ?? value);
  };

  const blur = () => {
    // Window deactivation (alt-tab, devtools) must not wipe a label the user
    // did not mean to clear; treat it as a cancel and keep the old text.
    if (!finishedRef.current && !document.hasFocus() && inputRef.current?.value === '' && value !== '') {
      finishedRef.current = true;
      onCancel();
      return;
    }
    commit();
  };

  return (
    <textarea
      ref={inputRef}
      className="pixi-spike__text-editor"
      aria-label={label}
      defaultValue={value}
      style={{
        left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height,
        padding: `${pad.top}px ${pad.right}px ${pad.bottom}px ${pad.left}px`,
      }}
      onInput={fit}
      onBlur={blur}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          finishedRef.current = true;
          onCancel();
          event.preventDefault();
          event.stopPropagation();
        } else if (event.key === 'Tab' || (event.key === 'Enter' && !event.shiftKey)) {
          commit();
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    />
  );
}
