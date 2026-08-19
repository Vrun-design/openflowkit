import { describe, expect, it } from 'vitest';
import {
  createTestConnector,
  createTestDocument,
  createTestNode,
} from '../testing/builders/documentBuilder';
import { createSidePort } from '../domain/connectors/portAuthoring';
import { beginConnectorOperation, updateConnectorOperation } from './pixiConnectorOperations';

describe('Pixi connector operations', () => {
  it('reconnects an endpoint to the nearest compatible authored port', () => {
    const source = createTestNode('source');
    const target = {
      ...createTestNode('target'),
      transform: {
        ...createTestNode('target').transform,
        translation: { x: 300, y: 0 },
      },
      ports: [createSidePort('left'), createSidePort('right')],
    };
    const page = createTestDocument({
      nodes: [source, target],
      connectors: [createTestConnector('edge', 'source', 'source')],
    }).pages[0];
    const connector = page.connectors[0];
    const operation = beginConnectorOperation(1, page, connector, {
      kind: 'endpoint', role: 'target', point: { x: 100, y: 25 },
    });
    const next = updateConnectorOperation(operation, { x: 300, y: 25 }, 'target');
    expect(next.preview.target).toEqual({ nodeId: 'target', portId: 'left', anchor: null });
    expect(next.preview.route.ownership).toBe('automatic');
  });
});
