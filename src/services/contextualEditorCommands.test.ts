import { describe, expect, it } from 'vitest';
import type { FlowEdge, FlowNode } from '@/lib/types';
import {
  applyContextualEditorCommand,
  listAvailableContextualCommands,
} from './contextualEditorCommands';

function node(id: string, x: number, y: number, selected = true): FlowNode {
  return { id, type: 'process', position: { x, y }, data: { label: id }, selected };
}

describe('contextualEditorCommands', () => {
  it('exposes commands only when current selection satisfies their preconditions', () => {
    const twoNodes = {
      nodes: [node('a', 0, 0), node('b', 100, 100)],
      edges: [],
      selectedNodeId: 'a',
      selectedEdgeId: null,
    };
    const ids = listAvailableContextualCommands(twoNodes).map((definition) => definition.id);

    expect(ids).toContain('context-align-left');
    expect(ids).not.toContain('context-distribute-horizontal');
    expect(ids).not.toContain('context-reverse-connectors');
  });

  it('aligns only selected nodes and rejects a geometric no-op', () => {
    const graph = {
      nodes: [node('a', 10, 0), node('b', 50, 100), node('c', 200, 200, false)],
      edges: [],
      selectedNodeId: 'a',
      selectedEdgeId: null,
    };
    const aligned = applyContextualEditorCommand(graph, {
      kind: 'align',
      direction: 'left',
    });

    expect(aligned?.nodes.map((entry) => entry.position.x)).toEqual([10, 10, 200]);
    expect(
      applyContextualEditorCommand(
        { ...graph, nodes: aligned?.nodes ?? [] },
        { kind: 'align', direction: 'left' }
      )
    ).toBeNull();
  });

  it('reverses selected connector endpoints and architecture direction only', () => {
    const edges: FlowEdge[] = [
      {
        id: 'selected-edge',
        source: 'a',
        target: 'b',
        selected: true,
        data: { archDirection: '-->', archSourceSide: 'R', archTargetSide: 'L' },
      },
      { id: 'other-edge', source: 'b', target: 'c' },
    ];
    const result = applyContextualEditorCommand(
      { nodes: [], edges, selectedNodeId: null, selectedEdgeId: 'selected-edge' },
      { kind: 'reverse-connectors' }
    );

    expect(result?.edges[0]).toMatchObject({
      source: 'b',
      target: 'a',
      data: { archSourceSide: 'L', archTargetSide: 'R' },
    });
    expect(result?.edges[1]).toBe(edges[1]);
  });
});
