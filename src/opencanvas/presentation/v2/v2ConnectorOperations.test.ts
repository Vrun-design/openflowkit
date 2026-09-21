import { describe, expect, it } from 'vitest';
import { createTestConnector, createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { createSidePort } from '../../domain/connectors/portAuthoring';
import { beginConnectorOperation, updateConnectorOperation } from './v2ConnectorOperations';

describe('V2 connector operations', () => {
  it('moves a selected endpoint to a free canvas point', () => {
    const page = createTestDocument({
      nodes: [createTestNode('source')],
      connectors: [createTestConnector('edge', 'source', 'source')],
    }).pages[0];
    const operation = beginConnectorOperation(1, page, page.connectors[0], {
      kind: 'endpoint', role: 'target', point: { x: 100, y: 25 },
    });
    const next = updateConnectorOperation(operation, { x: 420, y: 180 }, null);
    expect(next.preview.target).toEqual({
      nodeId: null, portId: null, anchor: null, point: { x: 420, y: 180 },
    });
  });

  it('rebinds an endpoint across a corner only past the hysteresis step', () => {
    // 100×50 node: right anchor (100,25), bottom anchor (50,50).
    const page = createTestDocument({
      nodes: [{
        ...createTestNode('node'),
        ports: [createSidePort('right'), createSidePort('bottom')],
      }],
      connectors: [createTestConnector('edge', 'node', 'node', {
        source: { nodeId: 'node', portId: 'right', anchor: null, point: null },
        target: { nodeId: 'node', portId: 'right', anchor: null, point: null },
      })],
    }).pages[0];
    const operation = beginConnectorOperation(1, page, page.connectors[0], {
      kind: 'endpoint', role: 'target', point: { x: 100, y: 25 },
    });
    const near = updateConnectorOperation(operation, { x: 80, y: 55 }, 'node');
    expect(near.preview.target.portId).toBe('right');
    const chained = { ...operation, preview: near.preview };
    const far = updateConnectorOperation(chained, { x: 60, y: 90 }, 'node');
    expect(far.preview.target.portId).toBe('bottom');
  });
});
