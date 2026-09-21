import { describe, expect, it } from 'vitest';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { applyDocumentCommand } from './execute';
import { createEmptyV2Document } from '../../presentation/v2/v2Document';
import {
  buildAlignCommand, buildDistributeCommand, buildFlipCommand, buildSetTransformCommand, buildStepOrderCommand,
} from './arrangeNodes';
import type { ScenePage } from '../document/types';

function page(): ScenePage {
  return createTestDocument({ nodes: [
    createTestNode('a', { transform: { translation: { x: 0, y: 0 }, rotationRadians: 0, scale: { x: 1, y: 1 } }, size: { width: 100, height: 50 }, zIndex: 0 }),
    createTestNode('b', { transform: { translation: { x: 300, y: 40 }, rotationRadians: 0, scale: { x: 1, y: 1 } }, size: { width: 100, height: 50 }, zIndex: 1 }),
    createTestNode('c', { transform: { translation: { x: 500, y: 80 }, rotationRadians: 0, scale: { x: 1, y: 1 } }, size: { width: 100, height: 50 }, zIndex: 2 }),
  ] }).pages[0];
}

function run(p: ScenePage, command: ReturnType<typeof buildAlignCommand>): ScenePage {
  return applyDocumentCommand({ ...createEmptyV2Document('d'), pages: [p] }, command!).document.pages[0];
}
const at = (p: ScenePage, id: string) => p.nodes.find((n) => n.id === id)!.transform.translation;

describe('arrange commands', () => {
  it('aligns and distributes as one batch; no-ops return null', () => {
    const aligned = run(page(), buildAlignCommand(page(), ['a', 'b', 'c'], 'top'));
    expect([at(aligned, 'a').y, at(aligned, 'b').y, at(aligned, 'c').y]).toEqual([0, 0, 0]);
    expect(buildAlignCommand(aligned, ['a', 'b', 'c'], 'top')).toBeNull();
    expect(buildAlignCommand(page(), ['a'], 'top')).toBeNull();
    const spread = run(page(), buildDistributeCommand(page(), ['a', 'b', 'c'], 'horizontal'));
    expect(at(spread, 'b').x).toBe(250);
    expect(buildDistributeCommand(page(), ['a', 'b'], 'horizontal')).toBeNull();
  });

  it('flips positions about the selection centre and negates rotation', () => {
    const p = page();
    const flipped = run(p, buildFlipCommand(p, ['a', 'c'], 'horizontal'));
    expect(at(flipped, 'a').x).toBe(500);
    expect(at(flipped, 'c').x).toBe(0);
    expect(buildFlipCommand(p, ['a'], 'horizontal')).toBeNull();
  });

  it('sets absolute transform fields, clamped to 1px', () => {
    const p = run(page(), buildSetTransformCommand(page(), 'a', { x: 10, width: 0, rotation: 90 }));
    const a = p.nodes.find((n) => n.id === 'a')!;
    expect(a.transform.translation).toEqual({ x: 10, y: 0 });
    expect(a.size.width).toBe(1);
    expect(a.transform.rotationRadians).toBeCloseTo(Math.PI / 2);
    expect(buildSetTransformCommand(p, 'a', {})).toBeNull();
  });

  it('steps z-order by one, moving a contiguous block together', () => {
    const forward = run(page(), buildStepOrderCommand(page(), ['a'], 'forward'));
    expect(forward.nodes.map((n) => [n.id, n.zIndex])).toEqual([['a', 1], ['b', 0], ['c', 2]]);
    const block = run(page(), buildStepOrderCommand(page(), ['a', 'b'], 'forward'));
    expect(block.nodes.map((n) => [n.id, n.zIndex])).toEqual([['a', 1], ['b', 2], ['c', 0]]);
    expect(buildStepOrderCommand(page(), ['c'], 'forward')).toBeNull();
    const back = run(page(), buildStepOrderCommand(page(), ['c'], 'backward'));
    expect(back.nodes.map((n) => [n.id, n.zIndex])).toEqual([['a', 0], ['b', 2], ['c', 1]]);
  });
});
