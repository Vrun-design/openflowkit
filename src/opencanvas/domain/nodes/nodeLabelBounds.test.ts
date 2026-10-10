import { describe, expect, it } from 'vitest';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { createSceneIndex } from '../scene/spatialIndex';
import { frameNameAt, nodeLabelBounds } from './nodeLabelBounds';

describe('nodeLabelBounds', () => {
  it('is the whole node for basic shapes', () => {
    const node = createTestNode('a', { size: { width: 160, height: 72 } });
    expect(nodeLabelBounds(node)).toEqual({ x: 0, y: 0, width: 160, height: 72 });
  });

  it('is the title band for containers', () => {
    const group = createTestNode('g', { kind: 'group', size: { width: 300, height: 200 } });
    expect(nodeLabelBounds(group)).toEqual({ x: 16, y: 0, width: 268, height: 40 });
    const frame = createTestNode('f', { kind: 'frame', size: { width: 300, height: 200 } });
    expect(nodeLabelBounds(frame)).toEqual({ x: 16, y: 0, width: 268, height: 40 });
  });

  it('finds the preset frame whose name sits under a point above its top edge', () => {
    const at = { translation: { x: 100, y: 100 }, rotationRadians: 0, scale: { x: 1, y: 1 } };
    const frame = createTestNode('f', { kind: 'frame', size: { width: 300, height: 200 }, transform: at, content: { preset: 'frame', label: 'VPC' } });
    const section = createTestNode('s', { kind: 'section', size: { width: 300, height: 200 }, transform: { ...at, translation: { x: 600, y: 100 } } });
    const index = createSceneIndex(createTestDocument({ nodes: [frame, section] }).pages[0]!);
    expect(frameNameAt(index, { x: 115, y: 90 })).toBe('f');
    expect(frameNameAt(index, { x: 115, y: 150 })).toBeNull();
    expect(frameNameAt(index, { x: 615, y: 90 })).toBeNull();
    // Only the name's own width: the rest of the strip above the frame stays canvas (marquee, connectors).
    expect(frameNameAt(index, { x: 300, y: 90 })).toBeNull();
  });

  it('sits under the plate for icon nodes', () => {
    const icon = createTestNode('i', {
      kind: 'architecture', size: { width: 120, height: 110 }, content: { assetPresentation: 'icon', label: 'S3' },
    });
    expect(nodeLabelBounds(icon)).toEqual({ x: 0, y: 84, width: 120, height: 26 });
  });
});
