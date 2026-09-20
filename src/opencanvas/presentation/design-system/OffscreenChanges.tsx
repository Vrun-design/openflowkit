import { Button } from './Button';
import { foundation } from './tokens';
export interface OffscreenItem {
  id: string;
  kind: 'addition' | 'modification' | 'removal';
  /** Screen-space center of the change in CSS pixels, may be outside the viewport. */
  x: number;
  y: number;
}
/** Edge indicators for changes outside the viewport plus one explicit Show changes action. No automatic camera motion. */
export function OffscreenChanges({
  items,
  viewport,
  onShow,
  label = 'Show changes',
}: {
  items: readonly OffscreenItem[];
  viewport: { width: number; height: number };
  onShow: () => void;
  label?: string;
}) {
  const inset = foundation.layout.edgeInset + foundation.control.regular;
  const offscreen = items.filter(
    (i) => i.x < 0 || i.y < 0 || i.x > viewport.width || i.y > viewport.height
  );
  if (offscreen.length === 0) return null;
  const buckets = new Map<string, { x: number; y: number; angle: number; count: number }>();
  for (const item of offscreen) {
    const cx = viewport.width / 2,
      cy = viewport.height / 2;
    const dx = item.x - cx,
      dy = item.y - cy;
    const scale = Math.min(
      (viewport.width / 2 - inset) / Math.abs(dx || 1e-9),
      (viewport.height / 2 - inset) / Math.abs(dy || 1e-9)
    );
    const x = cx + dx * scale,
      y = cy + dy * scale;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const key = `${Math.round(x / 48)}:${Math.round(y / 48)}`;
    const existing = buckets.get(key);
    if (existing) existing.count += 1;
    else buckets.set(key, { x, y, angle, count: 1 });
  }
  return (
    <div className="ofk-offscreen">
      {[...buckets.entries()].map(([key, b]) => (
        <span
          key={key}
          className="ofk-offscreen-arrow"
          aria-hidden="true"
          style={{ left: b.x, top: b.y, '--ofk-angle': `${b.angle}deg` } as React.CSSProperties}
        >
          <span className="ofk-offscreen-count">{b.count}</span>
        </span>
      ))}
      <Button
        variant="secondary"
        className="ofk-offscreen-show"
        onClick={onShow}
        aria-label={`${label} (${offscreen.length})`}
      >
        {label} ({offscreen.length})
      </Button>
    </div>
  );
}
