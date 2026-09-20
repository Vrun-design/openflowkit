import { canvasFeedback, type CanvasFeedbackKind } from './canvasFeedback';
import type { Appearance } from './tokens';
export interface FeedbackBounds {
  id: string;
  kind: CanvasFeedbackKind;
  /** Projected CSS screen coordinates, already culled to the viewport by the host. */
  x: number;
  y: number;
  width: number;
  height: number;
}
/** DOM adapter for feedback only. It never captures input or edits scene records. */
export function CanvasFeedbackOverlay({
  items,
  appearance,
}: {
  items: readonly FeedbackBounds[];
  appearance: Appearance;
}) {
  return (
    <svg aria-hidden="true" focusable="false" className="ofk-canvas-feedback">
      {items.map((item) => {
        if (
          ![item.x, item.y, item.width, item.height].every(Number.isFinite) ||
          item.width < 0 ||
          item.height < 0
        )
          return null;
        const feedback = canvasFeedback(item.kind, appearance);
        const color = `#${feedback.color.toString(16).padStart(6, '0')}`;
        const markerX = item.x + item.width;
        return (
          <g key={item.id} stroke={color} fill="none" strokeWidth={feedback.strokePx}>
            <rect
              x={item.x}
              y={item.y}
              width={item.width}
              height={item.height}
              strokeDasharray={feedback.dashPx.join(' ')}
            />
            {feedback.marker === 'handles' &&
              [
                [item.x, item.y],
                [item.x + item.width, item.y],
                [item.x, item.y + item.height],
                [item.x + item.width, item.y + item.height],
              ].map(([x, y], index) => (
                <rect
                  key={index}
                  x={x - feedback.handlePx / 2}
                  y={y - feedback.handlePx / 2}
                  width={feedback.handlePx}
                  height={feedback.handlePx}
                  fill="var(--ofk-surface)"
                />
              ))}
            {feedback.marker !== 'handles' && feedback.marker !== 'none' && (
              <text
                x={markerX}
                y={item.y - 8}
                textAnchor="end"
                stroke="none"
                fill={color}
                fontSize="14"
              >
                {{ plus: '+', minus: '−', delta: 'Δ', port: '◇', lock: '⊠' }[feedback.marker]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
