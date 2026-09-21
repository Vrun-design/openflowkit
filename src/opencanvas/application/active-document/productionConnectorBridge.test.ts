import { describe, expect, it } from 'vitest';
import { reconnectConnector } from '../../domain/connectors/editing';
import { applyDocumentCommand } from '../../domain/commands/execute';
import { projectLegacyDocument } from '../../domain/document/legacyProjection';
import {
  buildProductionInsertConnectorCommand,
  buildProductionPortConnectorCommand,
  buildProductionRemoveConnectorCommand,
  createProductionConnector,
  buildProductionConnectorCommand,
} from './productionConnectorBridge';

function document() {
  return projectLegacyDocument({
    name: 'Connectors',
    nodes: [
      { id: 'a', type: 'process', position: { x: 0, y: 0 }, data: { label: 'A' } },
      { id: 'b', type: 'process', position: { x: 200, y: 0 }, data: { label: 'B' } },
      { id: 'c', type: 'process', position: { x: 400, y: 0 }, data: { label: 'C' } },
    ],
    edges: [{
      id: 'edge-1', source: 'a', target: 'b', label: 'calls',
      data: { routingMode: 'manual', waypoints: [{ x: 100, y: 50 }], opaque: 'keep' },
      style: { stroke: '#123456' }, selected: true,
    }],
  }, { documentId: 'doc', pageId: 'page', now: '2026-08-13T00:00:00.000Z' });
}

describe('production connector bridge', () => {
  it('reconnects canonically while preserving opaque legacy fields', () => {
    const source = document();
    const before = source.pages[0].connectors[0];
    const after = reconnectConnector(before, 'target', { nodeId: 'c', portId: null, anchor: null, point: null });
    const command = buildProductionConnectorCommand(source, 'page', before, after);
    expect(command).not.toBeNull();
    const applied = applyDocumentCommand(source, command!).document.pages[0].connectors[0];
    expect(applied).toMatchObject({
      id: 'edge-1', source: { nodeId: 'a' }, target: { nodeId: 'c' },
      route: { ownership: 'automatic' }, appearance: { stroke: '#123456' },
    });
    expect(applied.labels[0]?.text).toBe('calls');
  });

  it('does not write no-op edits', () => {
    const source = document();
    const connector = source.pages[0].connectors[0];
    expect(buildProductionConnectorCommand(source, 'page', connector, connector)).toBeNull();
  });

  it('rejects stale edits, changed ids, and unknown endpoints', () => {
    const source = document();
    const before = source.pages[0].connectors[0];
    expect(() => buildProductionConnectorCommand(
      source, 'page', { ...before, labels: [] }, before
    )).toThrow(/changed before/);
    expect(() => buildProductionConnectorCommand(
      source, 'page', before, { ...before, id: 'other' }
    )).toThrow(/cannot change connector id/);
    expect(() => buildProductionConnectorCommand(
      source, 'page', before,
      reconnectConnector(before, 'target', { nodeId: 'missing', portId: null, anchor: null, point: null })
    )).toThrow(/unknown node/);
  });

  it('builds validated connector create and delete commands', () => {
    const source = document();
    const connector = createProductionConnector('new-edge', 'b', 'c');
    expect(buildProductionInsertConnectorCommand(source, 'page', connector)).toMatchObject({
      kind: 'insert-connector', index: 1, connector,
    });
    expect(buildProductionRemoveConnectorCommand(source, 'page', 'edge-1')).toMatchObject({
      kind: 'remove-connector', index: 0,
    });
    expect(() => buildProductionInsertConnectorCommand(
      source, 'page', { ...connector, id: 'edge-1' }
    )).toThrow(/already exists/);
    expect(() => buildProductionInsertConnectorCommand(
      source, 'page', createProductionConnector('bad', 'b', 'missing')
    )).toThrow(/unknown node/);
  });

  it('atomically adds constrained side ports with a new connector', () => {
    const source = document();
    const command = buildProductionPortConnectorCommand(
      source, 'page', 'ported',
      { nodeId: 'a', side: 'right' },
      { nodeId: 'c', side: 'left' }
    );
    const applied = applyDocumentCommand(source, command).document.pages[0];
    expect(applied.nodes.find(({ id }) => id === 'a')?.ports).toContainEqual(expect.objectContaining({
      id: 'right', accepts: ['source', 'target'],
    }));
    expect(applied.nodes.find(({ id }) => id === 'c')?.ports).toContainEqual(expect.objectContaining({
      id: 'left', accepts: ['source', 'target'],
    }));
    expect(applied.connectors.at(-1)).toMatchObject({
      id: 'ported', source: { nodeId: 'a', portId: 'right' },
      target: { nodeId: 'c', portId: 'left' },
    });
  });

  it('atomically authors distinct ports and a self-loop on one node', () => {
    const source = document();
    const command = buildProductionPortConnectorCommand(
      source, 'page', 'loop',
      { nodeId: 'a', side: 'right' },
      { nodeId: 'a', side: 'top' }
    );
    const page = applyDocumentCommand(source, command).document.pages[0];
    expect(page.nodes[0].ports.map(({ id }) => id)).toEqual(['right', 'top']);
    expect(page.connectors.at(-1)).toMatchObject({
      source: { nodeId: 'a', portId: 'right' },
      target: { nodeId: 'a', portId: 'top' },
    });
  });
});
