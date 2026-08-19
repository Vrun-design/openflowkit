import { describe, expect, it } from 'vitest';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { arrowSpatialDirection, spatialNeighborId } from './spatialNavigation';

describe('semantic scene spatial navigation', () => {
  const page = createTestDocument({ nodes: [
    createTestNode('center', { transform: { translation: { x: 100, y: 100 }, rotationRadians: 0, scale: { x: 1, y: 1 } } }),
    createTestNode('left', { transform: { translation: { x: 0, y: 100 }, rotationRadians: 0, scale: { x: 1, y: 1 } } }),
    createTestNode('right', { transform: { translation: { x: 220, y: 100 }, rotationRadians: 0, scale: { x: 1, y: 1 } } }),
    createTestNode('up', { transform: { translation: { x: 100, y: 0 }, rotationRadians: 0, scale: { x: 1, y: 1 } } }),
    createTestNode('down', { transform: { translation: { x: 100, y: 240 }, rotationRadians: 0, scale: { x: 1, y: 1 } } }),
  ] }).pages[0];

  it('chooses the nearest directional node deterministically', () => {
    expect(spatialNeighborId(page, 'center', 'left')).toBe('left');
    expect(spatialNeighborId(page, 'center', 'right')).toBe('right');
    expect(spatialNeighborId(page, 'center', 'up')).toBe('up');
    expect(spatialNeighborId(page, 'center', 'down')).toBe('down');
  });

  it('retains the current node at a boundary and starts at first node', () => {
    expect(spatialNeighborId(page, 'left', 'left')).toBe('left');
    expect(spatialNeighborId(page, null, 'right')).toBe('center');
  });

  it('maps only arrow keys', () => {
    expect(arrowSpatialDirection('ArrowLeft')).toBe('left');
    expect(arrowSpatialDirection('Enter')).toBeNull();
  });
});
