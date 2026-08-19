import { describe, expect, it } from 'vitest';
import type { SceneNode } from '../document/types';
import { resolveWireframeNodePresentation } from './wireframeNodePresentation';

function node(kind: string, content: SceneNode['content']): SceneNode {
  return {
    id: kind,
    kind,
    parentId: null,
    layerId: 'default',
    zIndex: 0,
    transform: { translation: { x: 0, y: 0 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
    size: { width: 400, height: 300 },
    appearance: {},
    content,
    ports: [],
    metadata: {},
    extensions: {},
  };
}

describe('wireframe node presentation', () => {
  it('preserves browser chrome, variant, color, and media semantics', () => {
    expect(
      resolveWireframeNodePresentation(
        node('browser', {
          label: 'Console',
          variant: 'dashboard',
          icon: 'lock',
          color: 'blue',
          imageAssetId: 'sha256:browser',
          imageUrl: 'data:image/png;base64,AA==',
        })
      )
    ).toEqual({
      kind: 'browser',
      label: 'Console',
      variant: 'dashboard',
      secure: true,
      colorKey: 'blue',
      colorMode: 'subtle',
      imageAssetId: 'sha256:browser',
      imageUrl: 'data:image/png;base64,AA==',
    });
  });

  it('normalizes unknown mobile variants without mutating authored content', () => {
    expect(resolveWireframeNodePresentation(node('mobile', { variant: 'future-layout' }))).toEqual({
      kind: 'mobile',
      label: 'Screen',
      variant: 'default',
      colorKey: 'slate',
      colorMode: 'subtle',
    });
  });

  it('does not claim unrelated nodes', () => {
    expect(resolveWireframeNodePresentation(node('process', { label: 'Task' }))).toBeNull();
  });
});
