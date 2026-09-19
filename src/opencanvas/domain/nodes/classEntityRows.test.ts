import { describe, expect, it } from 'vitest';
import { createProductionSceneNode } from '../../application/active-document/productionNodeCatalog';
import { classEntityRowAt, classEntityRows } from './classEntityRows';

const classNode = createProductionSceneNode('class', 'c', { x: 0, y: 0 }, 'default', {
  classAttributes: ['+a', '+b'], classMethods: ['+run()'],
});

describe('classEntityRows', () => {
  it('lists attribute rows, an add row, then method rows in the lower half', () => {
    const rows = classEntityRows(classNode);
    expect(rows.map(({ list, index }) => `${list}:${index}`)).toEqual([
      'classAttributes:0', 'classAttributes:1', 'classAttributes:2', 'classMethods:0', 'classMethods:1',
    ]);
    expect(rows[0].bounds).toEqual({ x: 10, y: 54, width: 220, height: 18 });
    expect(rows[3].bounds.y).toBeGreaterThan(rows[2].bounds.y + 18);
  });

  it('lists entity fields with one add row and caps at the visible slots', () => {
    const entity = createProductionSceneNode('er_entity', 'e', { x: 0, y: 0 }, 'default', {
      erFields: Array.from({ length: 20 }, (_, i) => `f${i} string`),
    });
    const rows = classEntityRows(entity);
    expect(rows.every(({ list }) => list === 'erFields')).toBe(true);
    expect(rows.length).toBe(Math.floor((180 - 44 - 20) / 18));
  });

  it('hit-tests rows and returns null for the header, other kinds, and gaps', () => {
    expect(classEntityRowAt(classNode, { x: 20, y: 60 })).toMatchObject({ list: 'classAttributes', index: 0 });
    expect(classEntityRowAt(classNode, { x: 20, y: 20 })).toBeNull();
    expect(classEntityRowAt(createProductionSceneNode('process', 'p', { x: 0, y: 0 }, 'default'), { x: 20, y: 60 })).toBeNull();
  });
});
