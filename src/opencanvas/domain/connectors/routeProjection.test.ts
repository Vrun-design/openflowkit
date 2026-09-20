import { describe, expect, it } from 'vitest';
import {
  createTestConnector,
  createTestDocument,
  createTestNode,
} from '../../testing/builders/documentBuilder';
import { projectConnector } from './routeProjection';

function connectorFixture() {
  const source = createTestNode('source', {
    transform: { translation: { x: 0, y: 0 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
    ports: [
      {
        id: 'right',
        anchor: { kind: 'side', side: 'right', ratio: 0.5 },
        accepts: [],
        metadata: {},
      },
    ],
  });
  const target = createTestNode('target', {
    transform: { translation: { x: 300, y: 100 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
    ports: [
      { id: 'left', anchor: { kind: 'side', side: 'left', ratio: 0.5 }, accepts: [], metadata: {} },
    ],
  });
  return createTestDocument({ nodes: [source, target] }).pages[0];
}

describe('connector route projection', () => {
  it('resolves ports and boundary anchors instead of node centers', () => {
    const page = connectorFixture();
    const connector = createTestConnector('edge', 'source', 'target', {
      source: { nodeId: 'source', portId: 'right', anchor: null, point: null },
      target: { nodeId: 'target', portId: 'left', anchor: null, point: null },
      route: { kind: 'direct', ownership: 'automatic' },
    });
    const projected = projectConnector({ ...page, connectors: [connector] }, connector)!;
    expect(projected.samples).toEqual([
      { x: 100, y: 25 },
      { x: 300, y: 125 },
    ]);
  });

  it.each(['direct', 'polyline', 'orthogonal', 'bezier'] as const)(
    'projects the %s route kind',
    (kind) => {
      const page = connectorFixture();
      const connector = createTestConnector('edge', 'source', 'target', {
        route: { kind, ownership: 'manual' },
        waypoints: kind === 'polyline' ? [{ x: 180, y: 20 }] : [],
      });
      const projected = projectConnector({ ...page, connectors: [connector] }, connector)!;
      expect(projected.commands[0].kind).toBe('move');
      expect(projected.samples.length).toBeGreaterThanOrEqual(2);
      if (kind === 'bezier') expect(projected.commands[1].kind).toBe('cubic');
      if (kind === 'orthogonal') {
        for (let index = 1; index < projected.samples.length; index += 1) {
          const previous = projected.samples[index - 1];
          const current = projected.samples[index];
          expect(current.x === previous.x || current.y === previous.y).toBe(true);
        }
      }
    }
  );

  it('projects labels, appearance, conditions, and class relation markers', () => {
    const page = connectorFixture();
    const connector = createTestConnector('edge', 'source', 'target', {
      labels: [
        { id: 'label', text: 'HTTP', pathRatio: 0.5, offset: { x: 4, y: -8 }, metadata: {} },
      ],
      appearance: { strokeWidth: 3, opacity: 0.7, dashPattern: 'dotted', markerEnd: 'arrow' },
      semantics: { condition: 'error', classRelation: 'o--|>' },
    });
    const projected = projectConnector({ ...page, connectors: [connector] }, connector)!;
    expect(projected.labels[0]).toMatchObject({ text: 'HTTP' });
    expect(projected.presentation.stroke).toEqual({
      color: '#b91c1c',
      width: 3,
      opacity: 0.7,
      dash: [2, 5],
    });
    expect(projected.presentation.sourceMarkers).toEqual(['diamond-open']);
    expect(projected.presentation.targetMarkers).toEqual(['triangle-open']);
  });

  it('projects ER cardinality markers and dashed relations', () => {
    const page = connectorFixture();
    const connector = createTestConnector('edge', 'source', 'target', {
      semantics: { erRelation: '}o..|{' },
    });
    const projected = projectConnector({ ...page, connectors: [connector] }, connector)!;
    expect(projected.presentation.sourceMarkers).toEqual(['crow-foot', 'circle']);
    expect(projected.presentation.targetMarkers).toEqual(['crow-foot', 'bar']);
    expect(projected.presentation.stroke.dash).toEqual([10, 6]);
  });

  it('aligns sequence messages to their authored timeline order', () => {
    const source = createTestNode('actor', {
      kind: 'sequence_participant',
      content: { label: 'Buyer', seqParticipantKind: 'actor' },
      transform: { translation: { x: 0, y: 0 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
    });
    const target = createTestNode('api', {
      kind: 'sequence_participant',
      content: { label: 'API', seqParticipantKind: 'participant' },
      transform: { translation: { x: 300, y: 40 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
    });
    const page = createTestDocument({ nodes: [source, target] }).pages[0];
    const connector = createTestConnector('response', 'api', 'actor', {
      route: { kind: 'direct', ownership: 'automatic' },
      semantics: { seqMessageKind: 'return', seqMessageOrder: 2 },
    });
    const projected = projectConnector({ ...page, connectors: [connector] }, connector)!;

    expect(projected.samples).toEqual([
      { x: 350, y: 212 },
      { x: 50, y: 212 },
    ]);
    expect(projected.presentation.targetMarkers).toEqual(['arrow']);
    expect(projected.presentation.stroke.dash).toEqual([10, 6]);
  });

  it('projects sequence self messages as a readable right-side loop', () => {
    const participant = createTestNode('api', {
      kind: 'sequence_participant',
      content: { label: 'API', seqParticipantKind: 'participant' },
      transform: {
        translation: { x: 100, y: 40 },
        rotationRadians: 0,
        scale: { x: 1, y: 1 },
      },
    });
    const page = createTestDocument({ nodes: [participant] }).pages[0];
    const connector = createTestConnector('self', 'api', 'api', {
      route: { kind: 'direct', ownership: 'automatic' },
      semantics: { seqMessageKind: 'sync', seqMessageOrder: 1 },
    });
    const projected = projectConnector({ ...page, connectors: [connector] }, connector)!;

    expect(projected.samples).toEqual([
      { x: 150, y: 160 },
      { x: 206, y: 160 },
      { x: 206, y: 188 },
      { x: 150, y: 188 },
    ]);
    expect(projected.presentation.targetMarkers).toEqual(['triangle-filled']);
  });

  it('projects a generic automatic self-loop outside the node bounds', () => {
    const node = createTestNode('node');
    const page = createTestDocument({ nodes: [node] }).pages[0];
    const connector = createTestConnector('self', 'node', 'node', {
      route: { kind: 'orthogonal', ownership: 'automatic' },
    });
    const projected = projectConnector({ ...page, connectors: [connector] }, connector)!;
    expect(projected.samples).toEqual([
      { x: 100, y: 15 }, { x: 148, y: 15 }, { x: 148, y: -48 },
      { x: -48, y: -48 }, { x: -48, y: 35 }, { x: 100, y: 35 },
    ]);
    expect(Math.min(...projected.samples.map(({ y }) => y))).toBeLessThan(0);
  });

  it('projects free endpoints at their page-space points', () => {
    const page = connectorFixture();
    const connector = createTestConnector('edge', 'source', 'target', {
      source: { nodeId: null, portId: null, anchor: null, point: { x: 10, y: 10 } },
      target: { nodeId: null, portId: null, anchor: null, point: { x: 400, y: 200 } },
      route: { kind: 'direct', ownership: 'automatic' },
    });
    const projected = projectConnector({ ...page, connectors: [connector] }, connector)!;
    expect(projected.samples).toEqual([
      { x: 10, y: 10 },
      { x: 400, y: 200 },
    ]);
  });

  it('resolves the bound end of a half-free connector against its outline', () => {
    const page = connectorFixture();
    const connector = createTestConnector('edge', 'source', 'target', {
      target: { nodeId: null, portId: null, anchor: null, point: { x: 400, y: 200 } },
      route: { kind: 'direct', ownership: 'automatic' },
    });
    const projected = projectConnector({ ...page, connectors: [connector] }, connector)!;
    expect(projected.samples[1]).toEqual({ x: 400, y: 200 });
    expect(projected.samples[0]).not.toEqual({ x: 50, y: 25 });
  });

  it('returns null when a bound end references a missing node', () => {
    const page = connectorFixture();
    const connector = createTestConnector('edge', 'ghost', 'target', {
      source: { nodeId: 'ghost', portId: null, anchor: null, point: null },
      route: { kind: 'direct', ownership: 'automatic' },
    });
    expect(projectConnector({ ...page, connectors: [connector] }, connector)).toBeNull();
  });

  it('binds the automatic boundary to the true rotated outline', () => {
    const source = createTestNode('source', {
      transform: {
        translation: { x: 200, y: 50 },
        rotationRadians: Math.PI / 2,
        scale: { x: 1, y: 1 },
      },
    });
    const page = createTestDocument({ nodes: [source] }).pages[0];
    const connector = createTestConnector('edge', 'source', 'free', {
      target: { nodeId: null, portId: null, anchor: null, point: { x: 400, y: 100 } },
      route: { kind: 'direct', ownership: 'automatic' },
    });
    const projected = projectConnector({ ...page, connectors: [connector] }, connector)!;
    // Local top-edge midpoint maps onto the world right edge: an
    // axis-aligned-box shortcut would exit at x=300 instead of x=200.
    expect(projected.samples[0].x).toBeCloseTo(200, 4);
    expect(projected.samples[0].y).toBeCloseTo(100, 4);
    expect(projected.samples[1]).toEqual({ x: 400, y: 100 });
  });
});
