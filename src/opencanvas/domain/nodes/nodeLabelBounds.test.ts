import { describe, expect, it } from 'vitest';
import { createTestNode } from '../../testing/builders/documentBuilder';
import { nodeLabelBounds } from './nodeLabelBounds';

describe('nodeLabelBounds', () => {
  it('is the whole node for basic shapes', () => {
    const node = createTestNode('a', { size: { width: 160, height: 72 } });
    expect(nodeLabelBounds(node)).toEqual({ x: 0, y: 0, width: 160, height: 72 });
  });

  it('is the title band for containers', () => {
    const group = createTestNode('g', { kind: 'group', size: { width: 300, height: 200 } });
    expect(nodeLabelBounds(group)).toEqual({ x: 37, y: 0, width: 159, height: 40 });
    const frame = createTestNode('f', { kind: 'frame', size: { width: 300, height: 200 } });
    expect(nodeLabelBounds(frame)).toEqual({ x: 16, y: 0, width: 268, height: 40 });
  });

  it('sits under the plate for icon nodes', () => {
    const icon = createTestNode('i', {
      kind: 'architecture', size: { width: 120, height: 110 }, content: { assetPresentation: 'icon', label: 'S3' },
    });
    expect(nodeLabelBounds(icon)).toEqual({ x: 0, y: 84, width: 120, height: 26 });
  });
});
