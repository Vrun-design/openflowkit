import { describe, expect, it } from 'vitest';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { applyDocumentCommand } from './execute';
import { createEmptyV2Document } from '../../presentation/v2/v2Document';
import { buildGroupCommand, buildUngroupCommand, descendantIds } from './groupNodes';
import { buildDeleteSelectionCommand, buildDuplicateSelectionCommand } from './sceneEdits';
import { buildNodeWorldMatrices, nodeWorldBounds } from '../scene/worldGeometry';
import type { ScenePage } from '../document/types';

function page(): ScenePage {
  return createTestDocument({ nodes: [
    createTestNode('a', { transform: { translation: { x: 100, y: 100 }, rotationRadians: 0, scale: { x: 1, y: 1 } }, size: { width: 100, height: 50 } }),
    createTestNode('b', { transform: { translation: { x: 300, y: 200 }, rotationRadians: 0, scale: { x: 1, y: 1 } }, size: { width: 100, height: 50 } }),
  ] }).pages[0];
}
const run = (p: ScenePage, command: ReturnType<typeof buildGroupCommand>) =>
  applyDocumentCommand({ ...createEmptyV2Document('d'), pages: [p] }, command!);

describe('group / ungroup', () => {
  it('wraps roots in a quiet group, keeps world positions, and ungroup inverts', () => {
    const grouped = run(page(), buildGroupCommand(page(), ['a', 'b'], 'g')).document.pages[0];
    const group = grouped.nodes.find((n) => n.id === 'g')!;
    expect(group).toMatchObject({ kind: 'group', content: { label: '' }, transform: { translation: { x: 84, y: 84 } }, size: { width: 332, height: 182 } });
    const matrices = buildNodeWorldMatrices(grouped);
    expect(nodeWorldBounds(grouped.nodes.find((n) => n.id === 'b')!, matrices.get('b')!)).toMatchObject({ x: 300, y: 200 });
    expect(descendantIds(grouped, ['g'])).toEqual(['a', 'b']);
    expect(buildGroupCommand(grouped, ['a', 'b'], 'g2')).toBeNull(); // nested: not supported
    const ungrouped = run(grouped, buildUngroupCommand(grouped, ['g'])).document.pages[0];
    expect(ungrouped.nodes.map((n) => [n.id, n.parentId])).toEqual([['a', null], ['b', null]]);
    expect(ungrouped.nodes.find((n) => n.id === 'b')!.transform.translation).toEqual({ x: 300, y: 200 });
  });
  it('duplicate and delete take the subtree; members keep their local transform', () => {
    const grouped = run(page(), buildGroupCommand(page(), ['a', 'b'], 'g')).document.pages[0];
    let n = 0;
    const duplicated = run(grouped, buildDuplicateSelectionCommand(grouped, ['g'], [], () => `copy${n++}`)).document.pages[0];
    expect(duplicated.nodes).toHaveLength(6);
    const copyGroup = duplicated.nodes.find((node) => node.kind === 'group' && node.id !== 'g')!;
    const copyChildren = duplicated.nodes.filter((node) => node.parentId === copyGroup.id);
    expect(copyChildren).toHaveLength(2);
    expect(copyGroup.transform.translation).toEqual({ x: 104, y: 104 });
    expect(copyChildren.map((node) => node.transform.translation)).toEqual([{ x: 16, y: 16 }, { x: 216, y: 116 }]);
    const deleted = run(grouped, buildDeleteSelectionCommand(grouped, ['g'], [])).document.pages[0];
    expect(deleted.nodes).toHaveLength(0);
  });

  it('needs two roots and refuses duplicate ids', () => {
    expect(buildGroupCommand(page(), ['a'], 'g')).toBeNull();
    expect(() => buildGroupCommand(page(), ['a', 'b'], 'a')).toThrow(RangeError);
    expect(buildUngroupCommand(page(), ['a'])).toBeNull();
  });
});
