import { describe, expect, it } from 'vitest';
import type { SceneNode } from '../document/types';
import { resolveBasicNodePresentation } from './basicNodePresentation';

function node(kind: string, content: SceneNode['content'] = {}): SceneNode {
  return {
    id: kind,
    kind,
    parentId: null,
    layerId: 'default',
    zIndex: 0,
    transform: {
      translation: { x: 0, y: 0 },
      rotationRadians: 0,
      scale: { x: 1, y: 1 },
    },
    size: { width: 160, height: 80 },
    content,
    appearance: {},
    ports: [],
    metadata: {},
    extensions: {},
  };
}

describe('basic node presentation', () => {
  it.each([
    ['process', 'rounded', 'white'],
    ['start', 'capsule', 'emerald'],
    ['decision', 'diamond', 'amber'],
    ['end', 'capsule', 'red'],
    ['custom', 'rounded', 'white'],
  ])('resolves %s defaults', (kind, shape, colorKey) => {
    expect(resolveBasicNodePresentation(node(kind))).toMatchObject({ kind, shape, colorKey });
  });

  it('preserves supported authored shape and color fields', () => {
    expect(
      resolveBasicNodePresentation(
        node('custom', {
          shape: 'rectangle',
          color: 'custom',
          colorMode: 'filled',
          customColor: '#0f766e',
        })
      )
    ).toEqual({
      kind: 'custom',
      shape: 'rectangle',
      colorKey: 'custom',
      colorMode: 'filled',
      customColor: '#0f766e',
    });
  });

  it.each(['circle', 'ellipse', 'hexagon', 'parallelogram', 'cylinder', 'cloud',
    'document', 'queue', 'database', 'actor', 'custom-path'] as const)('accepts built-in %s', (shape) => {
    expect(resolveBasicNodePresentation(node('custom', { shape }))?.shape).toBe(shape);
  });

  it('leaves later node families outside this registry', () => {
    expect(resolveBasicNodePresentation(node('architecture'))).toBeNull();
    expect(resolveBasicNodePresentation(node('toString'))).toBeNull();
  });
});
