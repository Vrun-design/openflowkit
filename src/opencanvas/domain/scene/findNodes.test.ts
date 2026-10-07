import { describe, expect, it } from 'vitest';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { findNodes, nodeSearchText } from './findNodes';

const at = (x: number, y: number) => ({ translation: { x, y }, rotationRadians: 0, scale: { x: 1, y: 1 } });
const labelled = (id: string, label: string, x: number, y: number, extra = {}) =>
  createTestNode(id, { transform: at(x, y), content: { label }, ...extra });
const pageOf = (...nodes: ReturnType<typeof createTestNode>[]) => createTestDocument({ nodes }).pages[0]!;

describe('find on canvas', () => {
  it('matches case-insensitively on a substring', () => {
    const page = pageOf(labelled('a', 'Payment Service', 0, 0), labelled('b', 'Database', 0, 100));
    expect(findNodes(page, 'PAYMENT')).toEqual(['a']);
    expect(findNodes(page, 'ase')).toEqual(['b']);
  });

  it('orders matches top to bottom, then left to right', () => {
    const page = pageOf(
      labelled('low', 'api', 0, 200), labelled('right', 'api', 300, 0), labelled('left', 'api', 0, 0),
    );
    expect(findNodes(page, 'api')).toEqual(['left', 'right', 'low']);
  });

  it('orders by world position, not the parent-relative translation', () => {
    const page = pageOf(
      labelled('frame', 'frame', 0, 500),
      labelled('inside', 'api', 0, 0, { parentId: 'frame' }),
      labelled('outside', 'api', 0, 100),
    );
    expect(findNodes(page, 'api')).toEqual(['outside', 'inside']);
  });

  it('skips nodes without text and searches the description and chart title', () => {
    const page = pageOf(
      createTestNode('empty', { content: {} }),
      createTestNode('desc', { content: { label: 'Cache', subLabel: 'Redis cluster' } }),
      createTestNode('chart', { content: { title: 'Redis hit rate' }, transform: at(0, 50) }),
    );
    expect(findNodes(page, 'redis')).toEqual(['desc', 'chart']);
    expect(nodeSearchText(page.nodes[0]!)).toBe('');
  });

  it('folds unicode case', () => {
    const page = pageOf(labelled('a', 'Café', 0, 0));
    expect(findNodes(page, 'CAFÉ')).toEqual(['a']);
    expect(findNodes(pageOf(labelled('b', 'CAFÉ', 0, 0)), 'café')).toEqual(['b']);
  });

  it('returns nothing for an empty or blank query', () => {
    const page = pageOf(labelled('a', 'x', 0, 0), createTestNode('e', { content: {} }));
    expect(findNodes(page, '')).toEqual([]);
    expect(findNodes(page, '   ')).toEqual([]);
  });

  it('orders by centre, so a tall node does not outrank a shorter one beside it', () => {
    const page = pageOf(
      labelled('tall', 'api', 0, 0, { size: { width: 10, height: 400 } }),
      labelled('short', 'api', 100, 50, { size: { width: 10, height: 10 } }),
    );
    expect(findNodes(page, 'api')).toEqual(['short', 'tall']);
  });

  it('skips nodes on a hidden layer or inside a hidden section', () => {
    const doc = createTestDocument({ nodes: [
      labelled('shown', 'api', 0, 0),
      labelled('section', 'group', 0, 100, { content: { label: 'group', sectionHidden: true } }),
      labelled('inside', 'api', 0, 0, { parentId: 'section' }),
    ] });
    expect(findNodes(doc.pages[0]!, 'api')).toEqual(['shown']);
    const page = doc.pages[0]!;
    const hiddenLayer = { ...page, layers: page.layers.map((layer) => ({ ...layer, visible: false })) };
    expect(findNodes(hiddenLayer, 'api')).toEqual([]);
  });

  it('searches class members, ER fields, journey cards and chart categories', () => {
    const page = pageOf(
      createTestNode('class', { content: { label: 'Order', classAttributes: ['-total: number'], classMethods: ['+ship(): void'] } }),
      createTestNode('er', { content: { label: 'users', erFields: ['email: text UNIQUE', { name: 'created_at', dataType: 'timestamp' }] }, transform: at(0, 10) }),
      createTestNode('journey', { content: { journeyTask: 'Confirm order', journeyActor: 'Buyer' }, transform: at(0, 20) }),
      createTestNode('chart', { content: { categories: ['Q1', 'Q2'] }, transform: at(0, 30) }),
    );
    expect(findNodes(page, 'total')).toEqual(['class']);
    expect(findNodes(page, 'ship')).toEqual(['class']);
    expect(findNodes(page, 'email')).toEqual(['er']);
    expect(findNodes(page, 'TIMESTAMP')).toEqual(['er']);
    expect(findNodes(page, 'buyer')).toEqual(['journey']);
    expect(findNodes(page, 'confirm')).toEqual(['journey']);
    expect(findNodes(page, 'q2')).toEqual(['chart']);
  });

  it('searches a C4 element description but not its [Kind · tech] line', () => {
    const page = pageOf(createTestNode('c4', {
      kind: 'architecture', content: { label: 'Billing', subLabel: '[Container · Node.js]\nTakes payments' },
    }));
    expect(findNodes(page, 'payments')).toEqual(['c4']);
    expect(findNodes(page, 'container')).toEqual([]);
    expect(findNodes(page, 'node.js')).toEqual([]);
  });
});
