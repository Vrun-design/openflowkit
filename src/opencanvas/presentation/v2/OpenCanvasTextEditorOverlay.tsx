import { useEffect, useRef, useState } from 'react';
import type { Bounds2d } from '../../domain/geometry/types';
import { nodeStyleFont, type NodeStyle } from '../../domain/nodes/nodeStyle';
import './openCanvasTextEditorOverlay.css';

interface OpenCanvasTextEditorOverlayProps {
  readonly bounds: Bounds2d;
  readonly value: string;
  readonly label?: string;
  /** Screen scale: the editor's type matches the rendered label at any zoom. */
  readonly zoom?: number;
  /** Resolved style of the label being replaced: typography, colour, padding. */
  readonly style: NodeStyle;
  /** Select the existing text on open (default); false puts the caret at the end. */
  readonly selectAll?: boolean;
  /** Connector labels sit on a white plate so the line underneath never reads through. */
  readonly plate?: boolean;
  readonly onCommit: (value: string) => void;
  readonly onCancel: () => void;
}

let measureContext: CanvasRenderingContext2D | null | undefined;
function measureWidth(text: string, font: string): number {
  measureContext ??= document.createElement('canvas').getContext('2d');
  if (!measureContext) return 0;
  measureContext.font = font;
  return Math.max(...text.split('\n').map((line) => measureContext!.measureText(line).width));
}

// The editor is the label: no box, no border. The renderer hides the Pixi
// text underneath while this is open, so the user sees one piece of text
// that simply became editable.
export function OpenCanvasTextEditorOverlay({
  bounds,
  value,
  label = 'Edit node label',
  zoom = 1,
  style,
  selectAll = true,
  plate = false,
  onCommit,
  onCancel,
}: OpenCanvasTextEditorOverlayProps): React.JSX.Element {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const finishedRef = useRef(false);
  // A plate is half as tall as it is wide in padding, like the Pixi label plate.
  const vertical = plate ? style.textPadding / 2 : style.textPadding;
  const pad = { top: vertical, right: style.textPadding, bottom: vertical, left: style.textPadding };
  const padTop = pad.top * zoom;
  const padBottom = pad.bottom * zoom;
  const cssFont = nodeStyleFont(style, zoom);

  // Grow with the text and keep it aligned like the rendered label
  // (centred by default). Goes through state: React owns the inline style, so a direct DOM
  // write would be undone by the next render (camera moves re-render this).
  const [metrics, setMetrics] = useState({ height: bounds.height, paddingTop: padTop, textWidth: 0 });
  const fit = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const content = el.scrollHeight - padTop - padBottom;
    const height = Math.max(bounds.height, el.scrollHeight);
    el.style.height = `${height}px`;
    const paddingTop = style.textVerticalAlign === 'top' ? padTop
      : style.textVerticalAlign === 'bottom' ? Math.max(padTop, height - content - padBottom)
        : Math.max(padTop, (height - content) / 2);
    setMetrics({
      height,
      paddingTop,
      textWidth: plate ? measureWidth(el.value || el.placeholder, cssFont) : 0,
    });
  };
  // A plate hugs its text like the Pixi label it replaces, centred on the same point.
  const width = plate ? Math.max(bounds.width, metrics.textWidth + (pad.left + pad.right) * zoom) : bounds.width;
  const left = bounds.x + (bounds.width - width) / 2;

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
      className={plate ? 'pixi-spike__text-editor pixi-spike__text-editor--plate' : 'pixi-spike__text-editor'}
      aria-label={label}
      defaultValue={value}
      placeholder="Text"
      style={{
        left, top: bounds.y, width, height: metrics.height,
        padding: `${metrics.paddingTop}px ${pad.right * zoom}px ${padBottom}px ${pad.left * zoom}px`,
        font: cssFont, color: style.textColor, textAlign: style.textAlign === 'start' ? 'left' : style.textAlign === 'end' ? 'right' : 'center',
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
