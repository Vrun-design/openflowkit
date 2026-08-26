import { useEffect, useRef } from 'react';
import type { Bounds2d } from '../domain/geometry/types';
import './openCanvasTextEditorOverlay.css';

interface OpenCanvasTextEditorOverlayProps {
  readonly bounds: Bounds2d;
  readonly value: string;
  readonly onCommit: (value: string) => void;
  readonly onCancel: () => void;
}

export function OpenCanvasTextEditorOverlay({
  bounds,
  value,
  onCommit,
  onCancel,
}: OpenCanvasTextEditorOverlayProps): React.JSX.Element {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const commit = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onCommit(inputRef.current?.value ?? value);
  };

  return (
    <textarea
      ref={inputRef}
      className="pixi-spike__text-editor"
      aria-label="Edit node label"
      defaultValue={value}
      style={{ left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height }}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          finishedRef.current = true;
          onCancel();
          event.preventDefault();
          event.stopPropagation();
        } else if (event.key === 'Enter' && !event.shiftKey) {
          commit();
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    />
  );
}
