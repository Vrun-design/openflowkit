import { describe, expect, it } from 'vitest';
import type { ScenePage } from '../document/types';
import {
  FRAME_PRESETS, FRAME_PRESET_SPECS, createPresetFrame, frameChromeInset, frameChromePrimitives, framePresetOf, nextFrameSlot,
  enclosingPresetFrame,
} from './framePreset';

const page: ScenePage = {
  id: 'p', name: 'p', diagramKind: 'flowchart',
  layers: [{ id: 'default', name: 'Layer 1', visible: true, locked: false }],
  nodes: [], connectors: [], metadata: {}, extensions: {},
};

describe('frame presets', () => {
  it.each(FRAME_PRESETS)('%s is a named frame container at its default size', (preset) => {
    const node = createPresetFrame(page, { id: 'f', preset, at: { x: 10, y: 20 } });
    expect(node.kind).toBe('frame');
    expect(framePresetOf(node)).toBe(preset);
    expect(node.content.label).toBe(FRAME_PRESET_SPECS[preset].name);
    expect(node.size).toEqual(FRAME_PRESET_SPECS[preset].size);
  });

  it.each(FRAME_PRESETS)('%s chrome stays inside the frame', (preset) => {
    const size = FRAME_PRESET_SPECS[preset].size;
    for (const primitive of frameChromePrimitives(preset, size)) {
      const points = primitive.kind === 'path' ? primitive.points
        : primitive.kind === 'text' ? [{ x: primitive.x, y: primitive.y }]
          : primitive.kind === 'circle' ? [{ x: primitive.x - primitive.radius, y: primitive.y - primitive.radius }, { x: primitive.x + primitive.radius, y: primitive.y + primitive.radius }]
            : [{ x: primitive.x, y: primitive.y }, { x: primitive.x + primitive.width, y: primitive.y + primitive.height }];
      for (const point of points) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(size.width);
        expect(point.y).toBeLessThanOrEqual(size.height);
      }
    }
    expect(frameChromeInset(preset)).toBeLessThan(size.height);
  });

  it('a plain frame and DSL frames carry no preset', () => {
    const dslFrame = { ...createPresetFrame(page, { id: 'f', preset: 'frame', at: { x: 0, y: 0 } }), content: { label: 'Diagram' } };
    expect(framePresetOf(dslFrame)).toBeNull();
  });

  it('stacks the next widget under the chrome, then under the lowest child, clamped to the frame width', () => {
    const phone = createPresetFrame(page, { id: 'f', preset: 'phone', at: { x: 500, y: 500 } });
    const empty = { ...page, nodes: [phone] };
    expect(nextFrameSlot(empty, phone, { width: 120, height: 40 })).toEqual({ at: { x: 16, y: 56 }, size: { width: 120, height: 40 }, frameHeight: 740 });
    expect(nextFrameSlot(empty, phone, { width: 900, height: 40 }).size.width).toBe(328);
    const child = { ...phone, id: 'c', kind: 'widget', parentId: 'f', size: { width: 100, height: 40 },
      transform: { ...phone.transform, translation: { x: 16, y: 56 } } };
    const stranger = { ...child, id: 's', parentId: null, transform: { ...child.transform, translation: { x: 0, y: 900 } } };
    expect(nextFrameSlot({ ...page, nodes: [phone, child, stranger] }, phone, { width: 100, height: 24 }).at).toEqual({ x: 16, y: 108 });
    expect(nextFrameSlot(empty, phone, { width: 100, height: 24 }, true).size.width).toBe(328);
  });

  it('grows a full frame to hold the next widget, keeping the device’s bottom inset', () => {
    const phone = createPresetFrame(page, { id: 'f', preset: 'phone', at: { x: 0, y: 0 } });
    const low = { ...phone, id: 'c', kind: 'widget', parentId: 'f', size: { width: 100, height: 40 },
      transform: { ...phone.transform, translation: { x: 16, y: 680 } } };
    // Under the child (680 + 40 + 12), then its 200 px, the 16 px padding and the 28 px home bar.
    expect(nextFrameSlot({ ...page, nodes: [phone, low] }, phone, { width: 100, height: 200 }).frameHeight).toBe(732 + 200 + 16 + 28);
  });

  it('finds the preset frame a node sits in, however deep, and survives a parent cycle', () => {
    const phone = createPresetFrame(page, { id: 'f', preset: 'phone', at: { x: 0, y: 0 } });
    const card = { ...phone, id: 'card', kind: 'widget', parentId: 'f', content: {} };
    const inner = { ...card, id: 'inner', parentId: 'card' };
    const loopA = { ...card, id: 'a', parentId: 'b' };
    const loopB = { ...card, id: 'b', parentId: 'a' };
    const scene = { ...page, nodes: [phone, card, inner, loopA, loopB] };
    expect(enclosingPresetFrame(scene, 'inner')?.id).toBe('f');
    expect(enclosingPresetFrame(scene, 'f')?.id).toBe('f');
    expect(enclosingPresetFrame(scene, 'a')).toBeNull();
    expect(enclosingPresetFrame(scene, null)).toBeNull();
  });
});
