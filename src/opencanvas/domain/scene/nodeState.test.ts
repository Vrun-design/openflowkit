import { describe, expect, it } from 'vitest';
import { buildNodeStateMap } from './nodeState';
import { createProductionSceneNode } from '../../application/active-document/productionNodeCatalog';
import type { ScenePage } from '../document/types';

function page(): ScenePage {
  const section = createProductionSceneNode('section', 'sec', { x: 0, y: 0 }, 'default');
  const child = { ...createProductionSceneNode('process', 'child', { x: 0, y: 0 }, 'default'), parentId: 'sec' };
  const grandchild = { ...createProductionSceneNode('process', 'gc', { x: 0, y: 0 }, 'default'), parentId: 'child' };
  const onLocked = createProductionSceneNode('process', 'locked-layer', { x: 0, y: 0 }, 'locked');
  return {
    id: 'p', name: 'p', diagramKind: 'flowchart',
    layers: [
      { id: 'default', name: 'Default', visible: true, locked: false },
      { id: 'locked', name: 'Locked', visible: true, locked: true },
    ],
    nodes: [
      { ...section, content: { ...section.content, sectionHidden: true, sectionLocked: true } },
      child, grandchild, onLocked,
    ],
    connectors: [], metadata: {}, extensions: {},
  };
}

describe('buildNodeStateMap', () => {
  it('inherits hidden and locked from section ancestors and layers', () => {
    const states = buildNodeStateMap(page());
    expect(states.get('sec')).toEqual({ visible: false, locked: true });
    expect(states.get('child')).toEqual({ visible: false, locked: true });
    expect(states.get('gc')).toEqual({ visible: false, locked: true });
    expect(states.get('locked-layer')).toEqual({ visible: true, locked: true });
  });

  it('leaves ordinary nodes visible and editable', () => {
    const p = page();
    const plain = createProductionSceneNode('process', 'plain', { x: 0, y: 0 }, 'default');
    expect(buildNodeStateMap({ ...p, nodes: [...p.nodes, plain] }).get('plain'))
      .toEqual({ visible: true, locked: false });
  });
});
