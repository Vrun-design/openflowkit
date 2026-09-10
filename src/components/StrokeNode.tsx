import React, { memo } from 'react';
import type { LegacyNodeProps } from '@/lib/reactflowCompat';
import type { NodeData } from '@/lib/types';

interface StrokePoint {
  readonly x: number;
  readonly y: number;
}

function strokePoints(value: unknown): StrokePoint[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (point): point is StrokePoint =>
      typeof point === 'object' && point !== null
      && Number.isFinite((point as StrokePoint).x) && Number.isFinite((point as StrokePoint).y)
  );
}

/**
 * React Flow fallback for freeform strokes drawn on the OpenCanvas surface:
 * pen, highlighter, line, and arrow nodes keep their geometry as a plain SVG
 * path, so a document with ink still opens without the WebGL renderer.
 */
function StrokeNode({ type, data, selected }: LegacyNodeProps<NodeData>): React.ReactElement {
  const record = data as unknown as Record<string, unknown>;
  const points = strokePoints(record.points);
  const color = typeof record.strokeColor === 'string' ? record.strokeColor : '#334155';
  const width = typeof record.strokeWidth === 'number' ? record.strokeWidth : 3;
  const opacity = typeof record.transparency === 'number' ? record.transparency : 1;
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ');
  const markerId = `stroke-arrow-${color.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <svg
      role="img"
      aria-label={type ?? 'stroke'}
      className="pointer-events-none h-full w-full overflow-visible"
      style={{ opacity }}
    >
      {type === 'arrow' ? (
        <defs>
          <marker
            id={markerId}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="4"
            markerHeight="4"
            orient="auto-start-reverse"
          >
            <path d="M0 0 L10 5 L0 10 z" fill={color} />
          </marker>
        </defs>
      ) : null}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd={type === 'arrow' ? `url(#${markerId})` : undefined}
        // Selection is visible without hover, matching other nodes.
        style={selected ? { filter: 'drop-shadow(0 0 2px var(--brand-primary))' } : undefined}
      />
    </svg>
  );
}

export default memo(StrokeNode);
