import React from 'react';
import type { NodeData } from '@/lib/types';

type NodeShape = NonNullable<NodeData['shape']>;

interface NodeShapeSVGProps {
  shape: NodeShape;
  fill: string;
  stroke: string;
  strokeWidth: number | string;
}

/** Pure SVG geometry for complex node shapes. Rendered inside a 100×100 viewBox. */
export function NodeShapeSVG({
  shape,
  fill,
  stroke,
  strokeWidth,
}: NodeShapeSVGProps): React.ReactElement | null {
  const commonProps = { stroke, strokeWidth, vectorEffect: 'non-scaling-stroke' as const, fill };
  switch (shape) {
    case 'diamond':
      return <polygon points="50,0 100,50 50,100 0,50" {...commonProps} />;
    case 'hexagon':
      return <polygon points="15,0 85,0 100,50 85,100 15,100 0,50" {...commonProps} />;
    case 'parallelogram':
      return <polygon points="15,0 100,0 85,100 0,100" {...commonProps} />;
    case 'cylinder':
      return (
        <>
          <path
            d="M0,15 L0,85 Q0,100 50,100 Q100,100 100,85 L100,15 Q100,0 50,0 Q0,0 0,15 Z"
            {...commonProps}
          />
          <ellipse
            cx="50"
            cy="15"
            rx="50"
            ry="15"
            stroke={stroke}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            fill={fill}
            fillOpacity={0.5}
          />
        </>
      );
    case 'circle':
      return <circle cx="50" cy="50" r="48" {...commonProps} />;
    case 'ellipse':
      return <ellipse cx="50" cy="50" rx="48" ry="48" {...commonProps} />;
    default:
      return null;
  }
}
