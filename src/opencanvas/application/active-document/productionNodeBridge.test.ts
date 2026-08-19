import { describe, expect, it } from 'vitest';
import { projectLegacyDocument } from '../../domain/document/legacyProjection';
import { applyProductionNodeMutation, createProductionProcessNode } from './productionNodeBridge';

function document() {
  return projectLegacyDocument({
    name: 'Nodes',
    nodes: [
      { id: 'parent', type: 'group', position: { x: 0, y: 0 }, data: { label: 'Parent', opaque: 'keep' }, style: { width: 300, height: 200 } },
      { id: 'child', type: 'process', parentId: 'parent', position: { x: 20, y: 30 }, data: { label: 'Child' }, selected: true },
      { id: 'other', type: 'process', position: { x: 500, y: 0 }, data: { label: 'Other' } },
    ],
    edges: [
      { id: 'attached', source: 'child', target: 'other', data: { opaque: 'edge' } },
      { id: 'kept', source: 'other', target: 'other' },
    ],
  }, { documentId: 'doc', pageId: 'page', now: '2026-08-13T00:00:00.000Z' });
}

describe('production node bridge', () => {
  it('renames while preserving opaque legacy fields and treats equal labels as no-op', () => {
    const source = document();
    const renamed = applyProductionNodeMutation(source, 'page', {
      kind: 'rename', nodeId: 'parent', label: '  Platform  ',
    }, source.updatedAt);
    expect(renamed.changed).toBe(true);
    expect(renamed.projection.nodes[0]).toMatchObject({ data: { label: 'Platform', opaque: 'keep' } });
    expect(applyProductionNodeMutation(source, 'page', {
      kind: 'rename', nodeId: 'parent', label: 'Parent',
    }, source.updatedAt).changed).toBe(false);
    expect(() => applyProductionNodeMutation(source, 'page', {
      kind: 'rename', nodeId: 'parent', label: '   ',
    }, source.updatedAt)).toThrow(/must not be empty/);
  });

  it('duplicates with a unique id and offset without changing the source', () => {
    const source = document();
    const result = applyProductionNodeMutation(source, 'page', {
      kind: 'duplicate', nodeId: 'other', newNodeId: 'copy', offset: { x: 40, y: 50 },
    }, source.updatedAt);
    expect(result.selectedNodeId).toBe('copy');
    expect(result.projection.nodes.find(({ id }) => id === 'copy')).toMatchObject({
      position: { x: 540, y: 50 }, data: { label: 'Other' },
    });
    expect(source.pages[0].nodes).toHaveLength(3);
  });

  it('cascade-deletes descendants and attached connectors but preserves unrelated graph', () => {
    const result = applyProductionNodeMutation(document(), 'page', {
      kind: 'delete', nodeId: 'parent',
    }, '2026-08-13T00:01:00.000Z');
    expect(result.projection.nodes.map(({ id }) => id)).toEqual(['other']);
    expect(result.projection.edges.map(({ id }) => id)).toEqual(['kept']);
  });

  it('inserts a canonical process and rejects duplicate ids', () => {
    const source = document();
    const node = createProductionProcessNode('new', { x: 40, y: 80 }, 'default', 'New process');
    const result = applyProductionNodeMutation(source, 'page', { kind: 'insert', node }, source.updatedAt);
    expect(result.projection.nodes.at(-1)).toMatchObject({
      id: 'new', type: 'process', position: { x: 40, y: 80 }, data: { label: 'New process' },
    });
    expect(() => applyProductionNodeMutation(source, 'page', {
      kind: 'insert', node: { ...node, id: 'other' },
    }, source.updatedAt)).toThrow(/already exists/);
  });
});
