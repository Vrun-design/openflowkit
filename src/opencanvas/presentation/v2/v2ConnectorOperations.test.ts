import { describe, expect, it } from 'vitest';
import { createTestConnector, createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
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
});
