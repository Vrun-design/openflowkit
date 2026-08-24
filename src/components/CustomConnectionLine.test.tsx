import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CustomConnectionLine from './CustomConnectionLine';
import { ConnectionLineType, Position } from '@/lib/reactflowCompat';

vi.mock('@/lib/reactflowCompat', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/reactflowCompat')>();
  return {
    ...actual,
    getBezierPath: vi.fn(() => ['M0,0 C10,0 10,20 20,20']),
    useNodes: vi.fn(() => [
      {
        id: 'node-1',
        position: { x: 80, y: 80 },
        width: 120,
        height: 80,
        data: {},
      },
    ]),
  };
});

describe('CustomConnectionLine', () => {
  it('renders animated snap feedback when the pointer is near a node target', () => {
    const { container } = render(
      <svg>
        <CustomConnectionLine
          connectionLineType={ConnectionLineType.Bezier}
          connectionStatus="valid"
          fromNode={null}
          fromHandle={null}
          fromX={0}
          fromY={0}
          fromPosition={Position.Right}
          pointer={{ x: 110, y: 110 }}
          toNode={null}
          toHandle={null}
          toX={110}
          toY={110}
          toPosition={Position.Left}
        />
      </svg>
    );

    const path = container.querySelector('path');
    const pulsingCircle = container.querySelector('circle.animate-ping');

    expect(path?.getAttribute('stroke-dasharray')).toBe('8 6');
    expect(pulsingCircle).not.toBeNull();
  });

  it('publishes one dash period per cycle so the dash loop has no snap-back', () => {
    function renderAt(pointer: { x: number; y: number }): SVGPathElement {
      const { container } = render(
        <svg>
          <CustomConnectionLine
            connectionLineType={ConnectionLineType.Bezier}
            connectionStatus="valid"
            fromNode={null}
            fromHandle={null}
            fromX={0}
            fromY={0}
            fromPosition={Position.Right}
            pointer={pointer}
            toNode={null}
            toHandle={null}
            toX={pointer.x}
            toY={pointer.y}
            toPosition={Position.Left}
          />
        </svg>
      );
      return container.querySelector('path') as SVGPathElement;
    }

    // Both patterns are 8 + 6 in some order, so both loop over 14 units.
    const near = renderAt({ x: 110, y: 110 });
    expect(near.getAttribute('stroke-dasharray')).toBe('8 6');
    expect(near.style.getPropertyValue('--flow-connection-dash-period')).toBe('14');

    const far = renderAt({ x: 900, y: 900 });
    expect(far.getAttribute('stroke-dasharray')).toBe('6 8');
    expect(far.style.getPropertyValue('--flow-connection-dash-period')).toBe('14');
  });
});
