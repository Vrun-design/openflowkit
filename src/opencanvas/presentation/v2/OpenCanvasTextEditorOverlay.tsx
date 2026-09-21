import { useEffect, useRef, useState } from 'react';
import type { Bounds2d } from '../../domain/geometry/types';
import { DEFAULT_NODE_CONTENT_LAYOUT } from '../../domain/node-layout/model';
import './openCanvasTextEditorOverlay.css';

interface OpenCanvasTextEditorOverlayProps {
  readonly bounds: Bounds2d;
  readonly value: string;
  readonly label?: string;
  /** Screen scale: the editor's type matches the rendered label at any zoom. */
  readonly zoom?: number;
  /** Rendered font size and weight of the label being replaced. */
  readonly font?: { readonly size: number; readonly weight: 400 | 600 };
  /** Select the existing text on open (default); false puts the caret at the end. */
  readonly selectAll?: boolean;
  readonly onCommit: (value: string) => void;
  readonly onCancel: () => void;
}

// The editor is the label: no box, no border. The renderer hides the Pixi
// text underneath while this is open, so the user sees one piece of text
// that simply became editable.
export function OpenCanvasTextEditorOverlay({
  bounds,
  value,
  label = 'Edit node label',
  zoom = 1,
  font = { size: 14, weight: 600 },
  selectAll = true,
  onCommit,
  onCancel,
}: OpenCanvasTextEditorOverlayProps): React.JSX.Element {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const finishedRef = useRef(false);
  const pad = DEFAULT_NODE_CONTENT_LAYOUT.padding;
  const padTop = pad.top * zoom;
  const padBottom = pad.bottom * zoom;

  // Grow with the text and keep it vertically centred like the rendered
  // label. Goes through state: React owns the inline style, so a direct DOM
  // write would be undone by the next render (camera moves re-render this).
  const [metrics, setMetrics] = useState({ height: bounds.height, paddingTop: padTop });
  const fit = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const content = el.scrollHeight - padTop - padBottom;
    const height = Math.max(bounds.height, el.scrollHeight);
    el.style.height = `${height}px`;
    setMetrics({ height, paddingTop: Math.max(padTop, (height - content) / 2) });
  };

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    if (selectAll) el.select();
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
      rows={1}
      className="pixi-spike__text-editor"
      aria-label={label}
      defaultValue={value}
      placeholder="Text"
      style={{
        left: bounds.x, top: bounds.y, width: bounds.width, height: metrics.height,
        padding: `${metrics.paddingTop}px ${pad.right * zoom}px ${padBottom}px ${pad.left * zoom}px`,
        font: `${font.weight} ${font.size * zoom}px/1.2 Inter, ui-sans-serif, system-ui, sans-serif`,
      }}
      onInput={fit}
      onBlur={blur}
      onKeyDown={(event) => {
        // Escape keeps what was typed (tldraw, Excalidraw): leaving the editor
        // is never a way to lose text. A blank new node still disappears.
        if (event.key === 'Escape' || event.key === 'Tab' || (event.key === 'Enter' && !event.shiftKey)) {
          commit();
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    />
  );
}
