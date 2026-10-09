import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MapModel } from '../../../../dsl/map/types';
import type { ArchModel } from '../../../../dsl/model/types';
import { MapOverview } from './MapOverview';

const node = (id: string, name: string, kind: string, parent: string | null, loc = 0) =>
  ({ id, name, kind, parent, children: [], loc, files: kind === 'file' ? 1 : 0, path: id });
const model = {
  root: 'root',
  nodes: { root: node('root', 'repo', 'dir', null), 'a.ts': node('a.ts', 'a.ts', 'file', 'root', 1200), 'b.ts': node('b.ts', 'b.ts', 'file', 'root', 10) },
  links: [{ from: 'a.ts', to: 'b.ts', kind: 'import', line: 1, text: '' }],
  source: {}, stats: {},
} as unknown as MapModel;
const arch = (flows: unknown[]) => ({ flows }) as unknown as ArchModel;

describe('MapOverview', () => {
  it('counts boxes (not the root) and connections', () => {
    render(<MapOverview model={model} arch={null} onSelect={vi.fn()} />);
    expect(screen.getByText('2 boxes · 1 connection')).toBeTruthy();
  });

  it('insight rows select the box they name', () => {
    const onSelect = vi.fn();
    render(<MapOverview model={model} arch={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('a.ts is among the largest'));
    expect(onSelect).toHaveBeenCalledWith('a.ts');
  });

  it('lists flows only when the model has them', () => {
    const { unmount } = render(<MapOverview model={model} arch={arch([])} onSelect={vi.fn()} />);
    expect(screen.queryByLabelText('Flows in this map')).toBeNull();
    unmount();
    render(<MapOverview model={model} arch={arch([{ id: 'f', name: 'Checkout', steps: [1, 2, 3] }])} onSelect={vi.fn()} />);
    expect(screen.getByText('Checkout')).toBeTruthy();
    expect(screen.getByText('3 steps')).toBeTruthy();
  });

  it('renders nothing for an empty map', () => {
    const empty = { ...model, nodes: { root: model.nodes.root }, links: [] } as MapModel;
    const { container } = render(<MapOverview model={empty} arch={null} onSelect={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });
});
