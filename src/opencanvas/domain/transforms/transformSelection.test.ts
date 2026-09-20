import { describe, expect, it } from 'vitest';
import { applyDocumentCommand } from '../commands/execute';
import {
  commitDocumentCommand,
  createDocumentHistory,
  undoDocumentCommand,
} from '../../application/history/history';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import {
  createTransformCommand,
  createTransformSnapshot,
  moveTransform,
  resizeTransform,
  rotateTransform,
} from './transformSelection';

describe('selection transforms', () => {
  it('moves multiple nodes on the grid without mutating the snapshot', () => {
    const a = createTestNode('a', {
      transform: { translation: { x: 3, y: 5 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
    });
    const b = createTestNode('b', {
      transform: { translation: { x: 103, y: 5 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
    });
    const page = createTestDocument({ nodes: [a, b] }).pages[0];
    const snapshot = createTransformSnapshot(page, ['a', 'b']);
    const result = moveTransform(snapshot, { x: 11, y: 12 }, { gridSize: 10 });
    expect(result.nodes.map((node) => node.transform.translation)).toEqual([
      { x: 10, y: 20 },
      { x: 110, y: 20 },
    ]);
    expect(a.transform.translation).toEqual({ x: 3, y: 5 });
  });

  it('snaps a move to other objects after the grid and reports guides', () => {
    const a = createTestNode('a', {
      transform: { translation: { x: 0, y: 0 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
    });
    const page = createTestDocument({ nodes: [a] }).pages[0];
    const snapshot = createTransformSnapshot(page, ['a']);
    // Node is 100×50 at (5,7) → right edge 105 snaps to the other's left edge 103.
    const other = { x: 103, y: 300, width: 40, height: 40 };
    const result = moveTransform(snapshot, { x: 5, y: 7 }, {
      snap: false, objects: [other], objectThreshold: 6,
    });
    expect(result.bounds.x).toBe(3);
    expect(result.bounds.y).toBe(7);
    expect(result.guideX).toBe(103);
    expect(result.guideY).toBeNull();
    expect(result.snappedX).toBe(true);
    // Grid on: grid first (5 → 0), then object snap (right edge 100 vs 103 → snaps to 3).
    const gridded = moveTransform(snapshot, { x: 5, y: 7 }, { objects: [other], objectThreshold: 6 });
    expect(gridded.bounds.x).toBe(3);
    expect(gridded.guideX).toBe(103);
    // No objects option → no guide fields at all (legacy callers unchanged).
    expect(moveTransform(snapshot, { x: 5, y: 7 }).guideX).toBeUndefined();
  });

  it('resizes around the opposite corner and enforces a minimum', () => {
    const node = createTestNode('a');
    const page = createTestDocument({ nodes: [node] }).pages[0];
    const snapshot = createTransformSnapshot(page, ['a']);
    const expanded = resizeTransform(snapshot, {
      handle: 'south-east',
      pointer: { x: 200, y: 100 },
      snap: false,
    });
    expect(expanded.nodes[0].transform.scale).toEqual({ x: 2, y: 2 });
    const clamped = resizeTransform(snapshot, {
      handle: 'north-west',
      pointer: { x: 99, y: 79 },
      snap: false,
    });
    expect(clamped.bounds).toMatchObject({ width: 24, height: 24 });
  });

  it('rotates a node around its center and snaps to 15 degrees', () => {
    const node = createTestNode('a');
    const page = createTestDocument({ nodes: [node] }).pages[0];
    const snapshot = createTransformSnapshot(page, ['a']);
    const result = rotateTransform(page, snapshot, { x: 100, y: 40 }, { x: 90, y: 80 });
    expect(result.nodes[0].transform.rotationRadians).toBeCloseTo(Math.PI / 6);
    expect(result.nodes[0].transform.translation.x).not.toBe(0);
  });

  it('commits a multi-node transform as one reversible batch', () => {
    const document = createTestDocument({ nodes: [createTestNode('a'), createTestNode('b')] });
    const page = document.pages[0];
    const snapshot = createTransformSnapshot(page, ['a', 'b']);
    const moved = moveTransform(snapshot, { x: 16, y: 16 }, { snap: false });
    const command = createTransformCommand(page.id, snapshot.nodes, moved.nodes, 'Move', 'move');
    const applied = applyDocumentCommand(document, command);
    expect(command.kind).toBe('batch');
    expect(applyDocumentCommand(applied.document, applied.inverse).document).toEqual(document);
    const history = commitDocumentCommand(createDocumentHistory(document), command);
    expect(history.past).toHaveLength(1);
    expect(undoDocumentCommand(history).present).toEqual(document);
  });
});
