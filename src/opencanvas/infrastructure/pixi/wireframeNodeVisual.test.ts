import { describe, expect, it } from 'vitest';
import type { SceneNode } from '../../domain/document/types';
import { projectWireframeNodeVisual } from './wireframeNodeVisual';

const base: SceneNode = {
  id: 'browser',
  kind: 'browser',
  parentId: null,
  layerId: 'default',
  zIndex: 0,
  transform: { translation: { x: 0, y: 0 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
  size: { width: 400, height: 300 },
  appearance: {},
  content: { label: 'Console', variant: 'dashboard', color: 'slate' },
  ports: [],
  metadata: {},
  extensions: {},
};

describe('wireframe Pixi visual', () => {
  it('uses shared theme colors for browser and mobile frames', () => {
    const browser = projectWireframeNodeVisual(base);
    const mobile = projectWireframeNodeVisual({ ...base, id: 'mobile', kind: 'mobile' });
    expect(browser?.presentation.kind).toBe('browser');
    expect(mobile?.presentation.kind).toBe('mobile');
    expect(browser?.stroke).toBe(mobile?.stroke);
    expect(browser?.fill).toBe(mobile?.fill);
  });
});
