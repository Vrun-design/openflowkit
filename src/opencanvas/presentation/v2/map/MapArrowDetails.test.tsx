import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ArchModel } from '../../../../dsl/model/types';
import { MapArrowDetails } from './MapArrowDetails';

const el = (id: string, name: string) => ({ id, name, kind: 'container', tags: [], links: [] });
const rel = (id: string, from: string, to: string, label?: string, tech?: string) => ({ id, from, to, label, tech, tags: [] });
const model = {
  elements: [el('web', 'Web'), el('api', 'API'), el('db', 'DB')],
  relations: [rel('r1', 'web', 'api', 'submits orders', 'HTTPS'), rel('r2', 'web', 'db', 'reads'), rel('r3', 'api', 'db')],
  views: [], flows: [],
} as unknown as ArchModel;

const show = (relationIds: string[], onSelect = vi.fn()) => {
  render(<MapArrowDetails model={model} arrow={{ from: 'web', to: 'api', relationIds }} onSelectElement={onSelect} />);
  return onSelect;
};

describe('MapArrowDetails', () => {
  it('shows the heading, count and one row per relation', () => {
    show(['r1', 'r2']);
    expect(screen.getByText('Web → API')).toBeTruthy();
    expect(screen.getByText('2 relations')).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('submits orders · HTTPS')).toBeTruthy();
  });

  it('reads Web ⇄ API when the arrow goes both ways, even if its relations are deeper ones', () => {
    render(<MapArrowDetails model={model} arrow={{ from: 'web', to: 'api', relationIds: ['r1'], both: true }} onSelectElement={vi.fn()} />);
    expect(screen.getByText('Web ⇄ API')).toBeTruthy();
  });

  it('skips unknown ids and singularises the count', () => {
    show(['nope', 'r3']);
    expect(screen.getByText('1 relation')).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Unlabelled relationship')).toBeTruthy();
  });

  it('says so when no relation is known', () => {
    show(['nope']);
    expect(screen.getByText('No relations found for this arrow.')).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('selects the element behind a clicked name', () => {
    const onSelect = show(['r1']);
    fireEvent.click(screen.getByRole('button', { name: 'Inspect API' }));
    expect(onSelect).toHaveBeenCalledWith('api');
  });
});
