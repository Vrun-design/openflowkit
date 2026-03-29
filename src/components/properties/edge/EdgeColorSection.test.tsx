import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FlowEdge } from '@/lib/types';
import { EdgeColorSection } from './EdgeColorSection';
import { EdgeConditionSection } from './EdgeConditionSection';

function createEdge(overrides?: Partial<FlowEdge>): FlowEdge {
  return {
    id: 'edge-1',
    source: 'a',
    target: 'b',
    type: 'smoothstep',
    style: { stroke: '#94a3b8', strokeWidth: 2 },
    markerEnd: { type: 'arrowclosed', color: '#94a3b8' } as FlowEdge['markerEnd'],
    data: {},
    ...overrides,
  } as FlowEdge;
}

describe('Edge color controls', () => {
  it('updates edge stroke and marker colors from the shared swatch picker', () => {
    const onChange = vi.fn();
    render(<EdgeColorSection selectedEdge={createEdge()} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Blue' }));

    expect(onChange).toHaveBeenCalledWith(
      'edge-1',
      expect.objectContaining({
        style: expect.objectContaining({ stroke: expect.stringMatching(/^#/) }),
        markerEnd: expect.objectContaining({ color: expect.stringMatching(/^#/) }),
      })
    );
  });

  it('applies semantic edge conditions through the shared color resolver', () => {
    const onChange = vi.fn();
    render(<EdgeConditionSection selectedEdge={createEdge()} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));

    expect(onChange).toHaveBeenCalledWith(
      'edge-1',
      expect.objectContaining({
        data: expect.objectContaining({ condition: 'yes' }),
        style: expect.objectContaining({ stroke: expect.stringMatching(/^#/) }),
        label: 'Yes',
      })
    );
  });
});
