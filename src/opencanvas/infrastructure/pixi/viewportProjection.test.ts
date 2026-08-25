import { describe, expect, it } from 'vitest';
import { createSceneIndex } from '../../domain/scene/spatialIndex';
import {
  createTestConnector,
  createTestDocument,
  createTestNode,
} from '../../testing/builders/documentBuilder';
import { projectSceneViewport, semanticDetailLevel, viewportProjectionEquals } from './viewportProjection';
import { PixiConnectorRenderer } from './PixiConnectorRenderer';
import { PixiNodeRenderer } from './PixiNodeRenderer';

function createLargeIndex() {
  const nodes = Array.from({ length: 260 }, (_, index) =>
    createTestNode(`node-${index}`, {
      transform: {
        translation: { x: index * 200, y: 0 },
        rotationRadians: 0,
        scale: { x: 1, y: 1 },
      },
    })
  );
  const connectors = [createTestConnector('near-edge', 'node-0', 'node-1')];
  return createSceneIndex(createTestDocument({ nodes, connectors }).pages[0]);
}

describe('viewport scene projection', () => {
  it('keeps small scenes uncropped', () => {
    const document = createTestDocument({ nodes: [createTestNode('node-1')] });
    const result = projectSceneViewport(
      createSceneIndex(document.pages[0]),
      { x: 0, y: 0, zoom: 1 },
      { width: 800, height: 600 }
    );

    expect(result.nodeIds).toBeNull();
    expect(result.connectorIds).toBeNull();
    expect(result.detailLevel).toBe('full');
  });

  it('limits consolidated Pixi geometry to projected identities', () => {
    const page = createTestDocument({
      nodes: [
        createTestNode('visible'),
        createTestNode('culled', {
          transform: {
            translation: { x: 1_000, y: 0 },
            rotationRadians: 0,
            scale: { x: 1, y: 1 },
          },
        }),
      ],
      connectors: [createTestConnector('edge', 'visible', 'culled')],
    }).pages[0];
    const nodeRenderer = new PixiNodeRenderer();
    nodeRenderer.draw(
      page,
      createSceneIndex(page),
      false,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      new Set(['visible']),
      'overview'
    );
    const connectorRenderer = new PixiConnectorRenderer();
    connectorRenderer.draw(page, false, new Set());

    expect(nodeRenderer.getDebugSnapshot().map((record) => record.id)).toEqual(['visible']);
    expect(connectorRenderer.getDebugSnapshot().connectors).toBe(0);
  });

  it('culls large scenes with screen-space overscan and retains active nodes', () => {
    const result = projectSceneViewport(
      createLargeIndex(),
      { x: 0, y: 0, zoom: 1 },
      { width: 400, height: 300 },
      { overscanScreenPixels: 0, retainedNodeIds: ['node-20'] }
    );

    expect([...result.nodeIds!]).toEqual(['node-0', 'node-1', 'node-2', 'node-20']);
    expect([...result.connectorIds!]).toEqual(['near-edge']);
    expect(result.bounds).toEqual({ x: 0, y: 0, width: 400, height: 300 });
  });

  it('uses stable semantic zoom tiers', () => {
    expect(semanticDetailLevel(0.34)).toBe('overview');
    expect(semanticDetailLevel(0.35)).toBe('compact');
    expect(semanticDetailLevel(0.65)).toBe('full');
  });

  it('compares projections by visible identity rather than set instance', () => {
    const first = projectSceneViewport(
      createLargeIndex(), { x: 0, y: 0, zoom: 1 }, { width: 400, height: 300 },
      { overscanScreenPixels: 0 }
    );
    const same = projectSceneViewport(
      createLargeIndex(), { x: 0, y: 0, zoom: 1 }, { width: 400, height: 300 },
      { overscanScreenPixels: 0 }
    );
    const moved = projectSceneViewport(
      createLargeIndex(), { x: -2_000, y: 0, zoom: 1 }, { width: 400, height: 300 },
      { overscanScreenPixels: 0 }
    );

    expect(viewportProjectionEquals(first, same)).toBe(true);
    expect(viewportProjectionEquals(first, moved)).toBe(false);
  });
});
