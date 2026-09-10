import { describe, expect, it } from 'vitest';
import type { FlowNode } from '@/lib/types';
import { ungroupSection, wrapNodesInSection } from './groupOperations';

const nodes: FlowNode[] = [
  { id: 'a', type: 'process', position: { x: 100, y: 100 }, width: 100, height: 50, data: { label: 'a' }, selected: true },
  { id: 'b', type: 'process', position: { x: 300, y: 200 }, width: 100, height: 50, data: { label: 'b' }, selected: true },
  { id: 'c', type: 'process', position: { x: 900, y: 900 }, width: 100, height: 50, data: { label: 'c' } },
];

describe('group operations', () => {
  it('wraps the selection in a section and keeps absolute positions', () => {
    const wrapped = wrapNodesInSection(nodes, ['a', 'b'], 'sec', 'Group');
    const section = wrapped.find((n) => n.id === 'sec')!;
    const a = wrapped.find((n) => n.id === 'a')!;
    expect(wrapped[0].id).toBe('sec');
    expect(section.selected).toBe(true);
    expect(a.parentId).toBe('sec');
    expect(a.selected).toBe(false);
    expect(section.position.x + a.position.x).toBe(100);
    expect(section.position.y + a.position.y).toBe(100);
    expect(wrapped.find((n) => n.id === 'c')!.parentId).toBeUndefined();

    const restored = ungroupSection(wrapped, 'sec');
    expect(restored.find((n) => n.id === 'sec')).toBeUndefined();
    expect(restored.find((n) => n.id === 'a')).toMatchObject({ position: { x: 100, y: 100 }, selected: true });
    expect(restored.find((n) => n.id === 'a')!.parentId).toBeUndefined();
  });

  it('is a no-op without wrappable nodes or a section', () => {
    expect(wrapNodesInSection(nodes, ['missing'], 'sec', 'G')).toBe(nodes);
    expect(ungroupSection(nodes, 'a')).toBe(nodes);
  });
});
