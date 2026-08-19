import { describe, expect, it } from 'vitest';
import {
  createTestConnector,
  createTestDocument,
  createTestNode,
} from '../../testing/builders/documentBuilder';
import { applyDocumentCommand } from '../commands/execute';
import type { ScenePage } from '../document/types';
import { createDefaultSceneLayer } from '../document/defaults';
import { validateSceneDocumentV1 } from '../document/validation';
import {
  addConnectorWaypoint,
  connectorEditHandles,
  createConnectorEditCommand,
  moveConnectorHandle,
  pickConnectorAtPoint,
  pickConnectorEditHandle,
  reconnectConnector,
  removeConnectorWaypoint,
  resetConnectorRoute,
  setPrimaryConnectorLabel,
} from './editing';

function pageWith(connector = createTestConnector('edge', 'a', 'b')): ScenePage {
  return {
    id: 'page',
    name: 'Page',
    diagramKind: 'flowchart',
    layers: [createDefaultSceneLayer()],
    nodes: [
      createTestNode('a'),
      createTestNode('b', {
        transform: { translation: { x: 240, y: 120 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
      }),
      createTestNode('c', {
        transform: { translation: { x: 480, y: 0 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
      }),
    ],
    connectors: [connector],
    metadata: {},
    extensions: {},
  };
}

describe('connector editing', () => {
  it('exposes endpoint and route-specific anatomy', () => {
    const direct = pageWith();
    expect(connectorEditHandles(direct, direct.connectors[0]).map((handle) => handle.kind)).toEqual(
      ['endpoint', 'endpoint', 'segment']
    );
    const bezierConnector = createTestConnector('curve', 'a', 'b', {
      route: { kind: 'bezier', ownership: 'automatic' },
    });
    expect(
      connectorEditHandles(pageWith(bezierConnector), bezierConnector).map((handle) => handle.kind)
    ).toEqual(['endpoint', 'endpoint', 'control', 'control']);
  });

  it('converts a direct segment edit into a persistent manual polyline', () => {
    const page = pageWith();
    const connector = page.connectors[0];
    const segment = connectorEditHandles(page, connector).find(
      (handle) => handle.kind === 'segment'
    );
    const edited = moveConnectorHandle(page, connector, segment!, { x: 160, y: 20 });

    expect(edited.route).toEqual({ kind: 'polyline', ownership: 'manual' });
    expect(edited.waypoints.length).toBeGreaterThan(0);
  });

  it('adds, moves, removes, and resets waypoints without changing semantics', () => {
    const page = pageWith();
    const connector = page.connectors[0];
    const added = addConnectorWaypoint(page, connector, { x: 160, y: 40 });
    const handle = connectorEditHandles(pageWith(added), added).find(
      (candidate) => candidate.kind === 'waypoint'
    );
    const moved = moveConnectorHandle(pageWith(added), added, handle!, { x: 170, y: 60 });
    const removed = removeConnectorWaypoint(moved, 0);

    expect(moved.waypoints[0]).toEqual({ x: 170, y: 60 });
    expect(removed.route.ownership).toBe('automatic');
    expect(resetConnectorRoute(moved).waypoints).toEqual([]);
    expect(moved.semantics).toBe(connector.semantics);
  });

  it('stores authored bezier controls as manual waypoints', () => {
    const connector = createTestConnector('curve', 'a', 'b', {
      route: { kind: 'bezier', ownership: 'automatic' },
    });
    const page = pageWith(connector);
    const control = connectorEditHandles(page, connector).find(
      (handle) => handle.kind === 'control' && handle.index === 0
    );
    const edited = moveConnectorHandle(page, connector, control!, { x: 80, y: -50 });

    expect(edited.route).toEqual({ kind: 'bezier', ownership: 'manual' });
    expect(edited.waypoints[0]).toEqual({ x: 80, y: -50 });
    expect(edited.waypoints).toHaveLength(2);
  });

  it('reconnects one endpoint and clears stale route geometry', () => {
    const connector = createTestConnector('edge', 'a', 'b', {
      route: { kind: 'orthogonal', ownership: 'imported-fixed' },
      waypoints: [{ x: 120, y: 80 }],
    });
    const reconnected = reconnectConnector(connector, 'target', {
      nodeId: 'c',
      portId: null,
      anchor: { kind: 'side', side: 'left', ratio: 0.5 },
    });

    expect(reconnected.target.nodeId).toBe('c');
    expect(reconnected.waypoints).toEqual([]);
    expect(reconnected.route.ownership).toBe('automatic');
  });

  it('creates one reversible command only for a real edit', () => {
    const connector = pageWith().connectors[0];
    const after = { ...connector, waypoints: [{ x: 10, y: 20 }] };
    expect(createConnectorEditCommand('page', connector, connector, 'Edit')).toBeNull();
    expect(createConnectorEditCommand('page', connector, after, 'Edit')).toMatchObject({
      kind: 'set-connector',
      before: connector,
      after,
    });
  });

  it('round-trips an authored route through command history and JSON', () => {
    const nodes = [createTestNode('a'), createTestNode('b')];
    const before = createTestConnector('edge', 'a', 'b');
    const page = createTestDocument({ nodes, connectors: [before] }).pages[0];
    const after = addConnectorWaypoint(page, before, { x: 80, y: 60 });
    const command = createConnectorEditCommand(page.id, before, after, 'Add bend')!;
    const applied = applyDocumentCommand(
      createTestDocument({ nodes, connectors: [before] }),
      command
    );
    const restored = applyDocumentCommand(applied.document, applied.inverse).document;
    const parsed: unknown = JSON.parse(JSON.stringify(applied.document));

    expect(applied.document.pages[0].connectors[0]).toEqual(after);
    expect(restored.pages[0].connectors[0]).toEqual(before);
    expect(validateSceneDocumentV1(parsed)).toEqual({ success: true, document: applied.document });
  });

  it('picks forgiving connector paths and prioritizes endpoint handles', () => {
    const page = pageWith();
    const connector = page.connectors[0];
    const handles = connectorEditHandles(page, connector);
    const source = handles.find(
      (handle) => handle.kind === 'endpoint' && handle.role === 'source'
    )!;

    expect(pickConnectorAtPoint(page, { x: 150, y: 70 }, 12)).toBe('edge');
    expect(pickConnectorAtPoint(page, { x: 150, y: 0 }, 4)).toBeNull();
    expect(pickConnectorEditHandle(handles, source.point, 10)).toEqual(source);
  });

  it('creates, renames, and removes the primary label without disturbing secondary labels', () => {
    const connector = createTestConnector('edge', 'a', 'b');
    const created = setPrimaryConnectorLabel(connector, '  calls  ');
    expect(created.labels[0]).toMatchObject({
      id: 'edge:label', text: 'calls', pathRatio: 0.5, offset: { x: 0, y: -14 },
    });
    const renamed = setPrimaryConnectorLabel(created, 'returns');
    expect(renamed.labels[0].text).toBe('returns');
    expect(setPrimaryConnectorLabel(renamed, '   ').labels).toEqual([]);
  });
});
