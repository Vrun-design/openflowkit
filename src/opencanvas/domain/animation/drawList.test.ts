import { describe, expect, it } from 'vitest';
import { createTestConnector, createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import type { ScenePage } from '../document/types';
import type { FrameState } from './types';
import { frameDrawList, type DrawOp, type DrawPathOp, type DrawTextOp } from './drawList';

const VIEW_BOX = { x: -24, y: -24, width: 400, height: 300 };

function frameOf(
  nodes: FrameState['nodes'] = {}, connectors: FrameState['connectors'] = {},
  camera: FrameState['camera'] = null,
): FrameState {
  return { timeMs: 0, durationMs: 1000, activeStepIndex: 0, nodes, connectors, camera };
}

function pageOf(options: Parameters<typeof createTestDocument>[0]): ScenePage {
  return createTestDocument(options).pages[0]!;
}

const kinds = (ops: readonly DrawOp[]): readonly string[] => ops.map((op) => op.kind);
const paths = (ops: readonly DrawOp[]): readonly DrawPathOp[] =>
  ops.filter((op): op is DrawPathOp => op.kind === 'path');
const texts = (ops: readonly DrawOp[]): readonly DrawTextOp[] =>
  ops.filter((op): op is DrawTextOp => op.kind === 'text');

describe('frame draw list', () => {
  it('paints the themed background first and nothing else on an empty page', () => {
    const ops = frameDrawList(pageOf({}), frameOf(), 'light', VIEW_BOX);
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({ kind: 'rect', fill: { color: '#ffffff' }, transform: { tx: 0, ty: 0 } });
    expect(frameDrawList(pageOf({}), frameOf(), 'dark', VIEW_BOX)[0]).toMatchObject({ fill: { color: '#020617' } });
  });

  it('draws a node as its outline then its label, in node-local coordinates', () => {
    const node = createTestNode('a', { size: { width: 100, height: 50 }, content: { label: 'Alpha', shape: 'rectangle' } });
    const ops = frameDrawList(pageOf({ nodes: [node] }), frameOf(), 'light', VIEW_BOX);
    expect(kinds(ops)).toEqual(['rect', 'path', 'text']);
    const [outline] = paths(ops);
    expect(outline!.commands[0]).toEqual({ kind: 'move', point: { x: 0, y: 0 } });
    expect(outline!.closed).toBe(true);
    const [label] = texts(ops);
    expect(label).toMatchObject({ text: 'Alpha', x: 50, y: 25, align: 'center', baseline: 'middle' });
  });

  it('bakes the frame opacity, the pop scale about the node centre and the camera', () => {
    const node = createTestNode('a', { size: { width: 100, height: 50 } });
    const frame = frameOf({ a: { opacity: 0.5, scale: 0.92, drawProgress: 1 } }, {}, { x: 0, y: 0, width: 100, height: 50 });
    const ops = frameDrawList(pageOf({ nodes: [node] }), frame, 'light', VIEW_BOX);
    const [outline] = paths(ops);
    // pop about (50, 25), then the camera fit (scale 4, tx -24, ty 26).
    expect(outline!.opacity).toBe(0.5);
    expect(outline!.transform.a).toBeCloseTo(3.68);
    expect(outline!.transform.tx).toBeCloseTo(-8);
    expect(outline!.transform.ty).toBeCloseTo(34);
    expect(ops[0]).toMatchObject({ kind: 'rect', transform: { a: 1, tx: 0, ty: 0 } });
  });

  it('marks a chart page as a fallback frame', () => {
    const chart = createTestNode('chart-1', { kind: 'chart', content: { chart: 'bar' } });
    expect(frameDrawList(pageOf({ nodes: [chart] }), frameOf(), 'light', VIEW_BOX)).toEqual([{ kind: 'fallback' }]);
  });

  it('marks an ink page as a fallback frame but not a hidden one', () => {
    const pen = createTestNode('pen-1', {
      kind: 'pen', content: { points: [{ x: 0, y: 0 }, { x: 10, y: 10 }] },
    });
    expect(frameDrawList(pageOf({ nodes: [pen] }), frameOf(), 'light', VIEW_BOX)).toEqual([{ kind: 'fallback' }]);
    const hidden = createTestNode('pen-2', {
      kind: 'pen', content: { points: [{ x: 0, y: 0 }, { x: 10, y: 10 }], sectionHidden: true },
    });
    expect(kinds(frameDrawList(pageOf({ nodes: [hidden] }), frameOf(), 'light', VIEW_BOX))).toEqual(['rect']);
  });

  it('draws containers as a plain rectangle with their title', () => {
    const group = createTestNode('g', {
      kind: 'section', size: { width: 200, height: 120 }, content: { label: 'Boundary' },
    });
    const ops = frameDrawList(pageOf({ nodes: [group] }), frameOf(), 'light', VIEW_BOX);
    expect(kinds(ops)).toEqual(['rect', 'path', 'text']);
    expect(paths(ops)[0]!.commands).toHaveLength(4);
    expect(texts(ops)[0]).toMatchObject({ text: 'Boundary', align: 'start', x: 0 });
  });

  it('marks a text node page as a fallback frame', () => {
    const text = createTestNode('t', { kind: 'text', content: { label: 'note' } });
    expect(frameDrawList(pageOf({ nodes: [text] }), frameOf(), 'light', VIEW_BOX)).toEqual([{ kind: 'fallback' }]);
  });

  it('draws connectors before nodes, with draw-on as a unit dash', () => {
    const a = createTestNode('a', { transform: { ...createTestNode('x').transform, translation: { x: 0, y: 0 } } });
    const b = createTestNode('b', { size: { width: 100, height: 50 }, transform: { ...createTestNode('x').transform, translation: { x: 0, y: 200 } } });
    const edge = createTestConnector('a->b', 'a', 'b', {
      labels: [{ id: 'l', text: 'POST', pathRatio: 0.5, offset: { x: 0, y: 0 }, metadata: {} }],
    });
    const page = pageOf({ nodes: [a, b], connectors: [edge] });
    const ops = frameDrawList(page, frameOf({}, { 'a->b': { opacity: 1, scale: 1, drawProgress: 0.25 } }), 'light', VIEW_BOX);
    expect(ops.slice(1, 3).map((op) => op.kind)).toEqual(['path', 'text']);
    const [path] = paths(ops);
    // The route runs from a's bottom (50, 50) to b's top (50, 200): length 150.
    expect(path!.dash).toEqual([150, 150]);
    expect(path!.dashOffset).toBeCloseTo((1 - 0.25) * 150);
    expect(path!.stroke).toMatchObject({ color: '#64748b', alpha: 1 });
    expect(texts(ops)[0]).toMatchObject({ text: 'POST', fontSize: 11, color: '#0f172a' });
  });

  it('carries the pulse phase as a travelling dash', () => {
    const a = createTestNode('a', { transform: { ...createTestNode('x').transform, translation: { x: 0, y: 0 } } });
    const b = createTestNode('b', { transform: { ...createTestNode('x').transform, translation: { x: 0, y: 200 } } });
    const edge = createTestConnector('a->b', 'a', 'b');
    const ops = frameDrawList(pageOf({ nodes: [a, b], connectors: [edge] }),
      frameOf({}, { 'a->b': { opacity: 1, scale: 1, drawProgress: 1, pulsePhase: 0.5 } }), 'light', VIEW_BOX);
    const [path] = paths(ops);
    expect(path!.dash[0]! / path!.dash[1]!).toBeCloseTo(3 / 7);
    expect(path!.dashOffset).toBeCloseTo(-75);
  });

  it('draws markers with the shared glyph geometry', () => {
    const a = createTestNode('a', { transform: { ...createTestNode('x').transform, translation: { x: 0, y: 0 } } });
    const b = createTestNode('b', { transform: { ...createTestNode('x').transform, translation: { x: 0, y: 200 } } });
    const edge = createTestConnector('a->b', 'a', 'b', { appearance: { markerEnd: 'arrow' } });
    const ops = frameDrawList(pageOf({ nodes: [a, b], connectors: [edge] }), frameOf(), 'light', VIEW_BOX);
    const markers = paths(ops).slice(1, 2);
    expect(markers).toHaveLength(1);
    expect(markers[0]!.commands).toHaveLength(3);
    expect(markers[0]!.lineJoin).toBe('round');
  });

  it('skips hidden nodes and their connectors', () => {
    const visible = createTestNode('visible');
    const hidden = createTestNode('hidden', { content: { label: 'hidden', sectionHidden: true } });
    const page = pageOf({ nodes: [visible, hidden], connectors: [createTestConnector('e', 'hidden', 'visible')] });
    const ops = frameDrawList(page, frameOf(), 'light', VIEW_BOX);
    expect(paths(ops)).toHaveLength(1);
    expect(texts(ops).map((op) => op.text)).toEqual(['visible']);
  });
});
