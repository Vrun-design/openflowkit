import { describe, expect, it } from 'vitest';
import { applyDocumentCommand } from '../../domain/commands/execute';
import { projectLegacyDocument } from '../../domain/document/legacyProjection';
import type { ScenePage } from '../../domain/document/types';
import {
  buildProductionNodeMutationCommand,
  createProductionProcessNode,
  type ProductionNodeMutation,
} from './productionNodeBridge';

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

function apply(mutation: ProductionNodeMutation): { page: ScenePage; selectedNodeId: string | null; changed: boolean } {
  const source = document();
  const { command, selectedNodeId } = buildProductionNodeMutationCommand(source.pages[0], mutation);
  if (!command) return { page: source.pages[0], selectedNodeId, changed: false };
  return { page: applyDocumentCommand(source, command).document.pages[0], selectedNodeId, changed: true };
}

describe('production node bridge', () => {
  it('renames while preserving opaque legacy fields and treats equal labels as no-op', () => {
    const renamed = apply({ kind: 'rename', nodeId: 'parent', label: '  Platform  ' });
    expect(renamed.changed).toBe(true);
    expect(renamed.page.nodes[0]).toMatchObject({ content: { label: 'Platform', opaque: 'keep' } });
    expect(apply({ kind: 'rename', nodeId: 'parent', label: 'Parent' }).changed).toBe(false);
    expect(() => apply({ kind: 'rename', nodeId: 'parent', label: '   ' })).toThrow(/must not be empty/);
  });

  it('duplicates with a unique id and offset without changing the source', () => {
    const source = document();
    const result = apply({ kind: 'duplicate', nodeId: 'other', newNodeId: 'copy', offset: { x: 40, y: 50 } });
    expect(result.selectedNodeId).toBe('copy');
    expect(result.page.nodes.find(({ id }) => id === 'copy')).toMatchObject({
      content: { label: 'Other' }, transform: { translation: { x: 540, y: 50 } },
    });
    expect(source.pages[0].nodes).toHaveLength(3);
  });

  it('cascade-deletes descendants and attached connectors but preserves unrelated graph', () => {
    const result = apply({ kind: 'delete', nodeId: 'parent' });
    expect(result.page.nodes.map(({ id }) => id)).toEqual(['other']);
    expect(result.page.connectors.map(({ id }) => id)).toEqual(['kept']);
  });

  it('inserts a canonical process and rejects duplicate ids', () => {
    const node = createProductionProcessNode('new', { x: 40, y: 80 }, 'default', 'New process');
    const result = apply({ kind: 'insert', node });
    expect(result.page.nodes.at(-1)).toMatchObject({
      id: 'new', content: { label: 'New process' }, transform: { translation: { x: 40, y: 80 } },
    });
    expect(() => apply({ kind: 'insert', node: { ...node, id: 'other' } })).toThrow(/already exists/);
  });
});
