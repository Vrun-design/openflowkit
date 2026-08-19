import { describe, expect, it } from 'vitest';
import { applyDocumentCommand } from '../../domain/commands/execute';
import { buildNodeWorldMatrices } from '../../domain/scene/worldGeometry';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import {
  buildProductionReparentCommand,
  buildProductionZOrderCommand,
  productionParentCandidates,
} from './productionOrganization';

describe('production organization commands', () => {
  it('reparents without moving the node in world space and reverses exactly', () => {
    const parent = createTestNode('parent', { transform: {
      translation: { x: 100, y: 50 }, rotationRadians: Math.PI / 2, scale: { x: 1, y: 1 },
    } });
    const child = createTestNode('child', { transform: {
      translation: { x: 140, y: 80 }, rotationRadians: Math.PI / 2, scale: { x: 1, y: 1 },
    } });
    const document = createTestDocument({ nodes: [parent, child] });
    const beforeWorld = buildNodeWorldMatrices(document.pages[0]).get('child');
    const command = buildProductionReparentCommand(document.pages[0], 'child', 'parent')!;
    const applied = applyDocumentCommand(document, command);
    expect(applied.document.pages[0].nodes[1].parentId).toBe('parent');
    expect(buildNodeWorldMatrices(applied.document.pages[0]).get('child')).toEqual(beforeWorld);
    expect(applyDocumentCommand(applied.document, applied.inverse).document).toEqual(document);
  });

  it('rejects cycles and unsupported skew', () => {
    const root = createTestNode('root');
    const child = createTestNode('child', { parentId: 'root' });
    expect(() => buildProductionReparentCommand(
      createTestDocument({ nodes: [root, child] }).pages[0], 'root', 'child'
    )).toThrow(/cycle/);
    const scaledParent = createTestNode('scaled', { transform: {
      translation: { x: 0, y: 0 }, rotationRadians: Math.PI / 4, scale: { x: 2, y: 1 },
    } });
    const rotated = createTestNode('rotated', { transform: {
      translation: { x: 0, y: 0 }, rotationRadians: Math.PI / 2, scale: { x: 1, y: 1 },
    } });
    expect(() => buildProductionReparentCommand(
      createTestDocument({ nodes: [scaledParent, rotated] }).pages[0], 'rotated', 'scaled'
    )).toThrow(/skew/);
    expect(productionParentCandidates(
      createTestDocument({ nodes: [root, child] }).pages[0], 'root'
    )).toEqual([]);
  });

  it('moves within the same parent and layer with deterministic reversible swaps', () => {
    const low = createTestNode('low', { zIndex: 1 });
    const middle = createTestNode('middle', { zIndex: 5 });
    const high = createTestNode('high', { zIndex: 9 });
    const document = createTestDocument({ nodes: [high, low, middle] });
    const command = buildProductionZOrderCommand(document.pages[0], 'middle', 'front')!;
    const applied = applyDocumentCommand(document, command);
    expect(applied.document.pages[0].nodes.find(({ id }) => id === 'middle')?.zIndex).toBe(2);
    expect(applied.document.pages[0].nodes.find(({ id }) => id === 'high')?.zIndex).toBe(1);
    expect(applyDocumentCommand(applied.document, applied.inverse).document).toEqual(document);
    expect(buildProductionZOrderCommand(document.pages[0], 'high', 'forward')).toBeNull();
  });
});
