import { describe, expect, it } from 'vitest';
import type { FlowNode } from '@/lib/types';
import { clearSelection, replaceSelection } from '../selection/selection';
import { projectSelectionToNodes } from './productionSelectionBridge';

function nodes(): FlowNode[] {
  return [
    { id: 'a', type: 'process', position: { x: 0, y: 0 }, data: { label: 'A' } },
    { id: 'b', type: 'process', position: { x: 0, y: 0 }, data: { label: 'B' }, selected: true },
    { id: 'c', type: 'process', position: { x: 0, y: 0 }, data: { label: 'C' } },
  ] as FlowNode[];
}

describe('production selection bridge', () => {
  it('marks exactly the selected nodes and reports the primary id', () => {
    const result = projectSelectionToNodes(nodes(), replaceSelection(['a', 'c']));
    expect(result.nodes?.map((node) => Boolean(node.selected))).toEqual([true, false, true]);
    expect(result.selectedNodeId).toBe('c');
  });

  it('reports no node write when the flags already match, but still reports the primary', () => {
    expect(projectSelectionToNodes(nodes(), replaceSelection(['b']))).toEqual({
      nodes: null, selectedNodeId: 'b',
    });
    expect(projectSelectionToNodes([], clearSelection())).toEqual({
      nodes: null, selectedNodeId: null,
    });
  });

  it('clears every selected flag and the primary id on an empty selection', () => {
    const result = projectSelectionToNodes(nodes(), clearSelection());
    expect(result.nodes?.every((node) => !node.selected)).toBe(true);
    expect(result.selectedNodeId).toBeNull();
  });

  it('keeps unchanged nodes referentially identical', () => {
    const source = nodes();
    const result = projectSelectionToNodes(source, replaceSelection(['a', 'b']));
    expect(result.nodes?.[1]).toBe(source[1]);
    expect(result.nodes?.[0]).not.toBe(source[0]);
  });

  it('ignores selected ids that are not on the page', () => {
    expect(projectSelectionToNodes(nodes(), replaceSelection(['b', 'ghost'])).nodes)
      .toBeNull();
  });
});
