import { describe, expect, it } from 'vitest';
import {
  createTestConnector,
  createTestDocument,
  createTestNode,
} from '../../testing/builders/documentBuilder';
import type { JsonObject } from '../document/json';
import { intersectsBounds } from '../geometry/bounds';
import { nodeWorldBounds, buildNodeWorldMatrices } from '../scene/worldGeometry';
import { connectorLabelPlate } from './labelStyle';
import { clearLabelPoint, projectConnector, projectPageConnectors } from './routeProjection';

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

// A lane 100 wide at x, so its centre sits at x + 50, with activation events.
function barLane(id: string, x: number, bars: JsonObject[] = []) {
  return createTestNode(id, {
    kind: 'sequence_participant', transform: { translation: { x, y: 0 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
    content: { label: id, seqParticipantKind: 'participant', ...(bars.length ? { seqActivations: bars } : {}) },
  });
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

  it('reroutes automatic orthogonal connectors around blocking nodes', () => {
    const page = createTestDocument({
      nodes: [
        createTestNode('source', {
          transform: { translation: { x: 0, y: 0 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
          ports: [{ id: 'right', anchor: { kind: 'side', side: 'right', ratio: 0.5 }, accepts: [], metadata: {} }],
        }),
        createTestNode('target', {
          transform: { translation: { x: 400, y: 0 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
          ports: [{ id: 'left', anchor: { kind: 'side', side: 'left', ratio: 0.5 }, accepts: [], metadata: {} }],
        }),
        createTestNode('blocker', {
          size: { width: 100, height: 70 },
          transform: { translation: { x: 200, y: -10 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
        }),
      ],
    }).pages[0];
    const connector = createTestConnector('edge', 'source', 'target', {
      source: { nodeId: 'source', portId: 'right', anchor: null, point: null },
      target: { nodeId: 'target', portId: 'left', anchor: null, point: null },
      route: { kind: 'orthogonal', ownership: 'automatic' },
    });
    const projected = projectConnector({ ...page, connectors: [connector] }, connector)!;
    expect(projected.samples[0]).toEqual({ x: 100, y: 25 });
    expect(projected.samples.at(-1)).toEqual({ x: 400, y: 25 });
    expect(projected.samples.length).toBeGreaterThan(2);
    for (let index = 1; index < projected.samples.length; index += 1) {
      const a = projected.samples[index - 1];
      const b = projected.samples[index];
      // Blocker padded by 12: (188,-22)-(312,72). No segment may cross it.
      const crosses = a.y === b.y
        ? a.y > -22 && a.y < 72 && Math.max(a.x, b.x) > 188 && Math.min(a.x, b.x) < 312
        : a.x > 188 && a.x < 312 && Math.max(a.y, b.y) > -22 && Math.min(a.y, b.y) < 72;
      expect(crosses).toBe(false);
    }
  });

  it.each(['manual', 'hybrid'] as const)('preserves %s waypoints instead of rerouting', (ownership) => {
    const page = connectorFixture();
    const connector = createTestConnector('edge', 'source', 'target', {
      source: { nodeId: 'source', portId: 'right', anchor: null, point: null },
      target: { nodeId: 'target', portId: 'left', anchor: null, point: null },
      route: { kind: 'orthogonal', ownership },
      waypoints: [{ x: 200, y: 200 }],
    });
    const projected = projectConnector({ ...page, connectors: [connector] }, connector)!;
    expect(projected.samples).toContainEqual({ x: 200, y: 200 });
    // Re-linked orthogonally: every hop is axis-aligned, ends leave their sides.
    for (let index = 1; index < projected.samples.length; index += 1) {
      const a = projected.samples[index - 1];
      const b = projected.samples[index];
      expect(a.x === b.x || a.y === b.y).toBe(true);
    }
  });

  it('fans parallel and reverse edges 12 px apart with endpoints pinned', () => {
    const page = connectorFixture();
    const edges = ['e1', 'e2', 'e3'].map((id) => createTestConnector(id, 'source', 'target', {
      source: { nodeId: 'source', portId: 'right', anchor: null, point: null },
      target: { nodeId: 'target', portId: 'left', anchor: null, point: null },
      route: { kind: 'direct', ownership: 'automatic' },
    }));
    const reversed = createTestConnector('e4', 'target', 'source', {
      source: { nodeId: 'target', portId: 'left', anchor: null, point: null },
      target: { nodeId: 'source', portId: 'right', anchor: null, point: null },
      route: { kind: 'direct', ownership: 'automatic' },
    });
    const projected = projectPageConnectors({ ...page, connectors: [...edges, reversed] });
    expect(projected).toHaveLength(4);
    // Straight lanes gain a midpoint; endpoints stay glued to their ports.
    for (const lane of projected.slice(0, 3)) {
      expect(lane.samples.length).toBe(3);
      expect(lane.samples[0]).toEqual({ x: 100, y: 25 });
      expect(lane.samples.at(-1)).toEqual({ x: 300, y: 125 });
    }
    expect(projected[3].samples[0]).toEqual({ x: 300, y: 125 });
    expect(projected[3].samples.at(-1)).toEqual({ x: 100, y: 25 });
    // Neighbours in document order ride 12 px apart.
    const middles = projected.map((lane) => lane.samples[1]);
    for (let index = 1; index < middles.length; index += 1) {
      const dx = middles[index].x - middles[index - 1].x;
      const dy = middles[index].y - middles[index - 1].y;
      expect(Math.hypot(dx, dy)).toBeCloseTo(12, 5);
    }
  });

  // The owner's report, 2026-10-07: edges into one side met at its midpoint and shared their
  // last run, drawing a bracket; an icon node's edges stopped 38 px short of its plate.
  const at = (x: number, y: number) => ({ translation: { x, y }, rotationRadians: 0, scale: { x: 1, y: 1 } });
  const fanIn = (targetContent: Record<string, unknown> = {}) => {
    const nodes = [
      createTestNode('left', { transform: at(0, 0) }),
      createTestNode('middle', { transform: at(200, 0) }),
      createTestNode('right', { transform: at(400, 0) }),
      createTestNode('target', { transform: at(200, 200), content: { label: 'Target', ...targetContent } }),
    ];
    const connectors = ['right', 'left', 'middle'].map((id) => createTestConnector(`e-${id}`, id, 'target', {
      route: { kind: 'orthogonal', ownership: 'automatic' },
    }));
    const page = { ...createTestDocument({ nodes }).pages[0], connectors };
    return Object.fromEntries(projectPageConnectors(page).map((edge) => [edge.id, edge.samples.at(-1)!]));
  };

  it('spreads edges that meet one flat side, in the order their other ends sit', () => {
    const ends = fanIn();
    expect(ends['e-left']!.y).toBe(200);
    expect(ends['e-left']!.x).toBeLessThan(ends['e-middle']!.x);
    expect(ends['e-middle']!.x).toBe(250);
    expect(ends['e-right']!.x).toBeGreaterThan(ends['e-middle']!.x);
    expect(ends['e-right']!.x - ends['e-middle']!.x).toBe(ends['e-middle']!.x - ends['e-left']!.x);
  });

  it('spreads ends across a diamond and lands each on its outline, not the box around it', () => {
    // The 100×50 diamond's tip is (250, 200); 24 px either side its upper edges sit 12 px lower.
    const ends = fanIn({ shape: 'diamond' });
    expect([ends['e-left'], ends['e-middle'], ends['e-right']]).toEqual([{ x: 226, y: 212 }, { x: 250, y: 200 }, { x: 274, y: 212 }]);
  });

  it('meets an icon node at its plate, not the caption box around it', () => {
    const nodes = [
      createTestNode('source', { transform: at(0, 0), size: { width: 100, height: 80 } }),
      createTestNode('icon', {
        kind: 'architecture', transform: at(300, 0), size: { width: 148, height: 116 },
        content: { label: 'Stripe', assetPresentation: 'icon', icon: 'stripe' },
      }),
    ];
    const connector = createTestConnector('edge', 'source', 'icon', { route: { kind: 'orthogonal', ownership: 'automatic' } });
    const page = { ...createTestDocument({ nodes }).pages[0], connectors: [connector] };
    // The plate is 72 px wide, centred, 4 px down: its left side is at x 300 + 38, its middle at y 40.
    expect(projectConnector(page, connector)!.samples.at(-1)).toEqual({ x: 338, y: 40 });
  });

  it('staggers where a fan-out turns so its edges neither share a run nor cross', () => {
    const nodes = [
      createTestNode('hub', { transform: at(0, 0) }),
      createTestNode('near', { transform: at(300, 100) }),
      createTestNode('far', { transform: at(300, 250) }),
    ];
    const connectors = ['near', 'far'].map((id) => createTestConnector(`e-${id}`, 'hub', id, { route: { kind: 'orthogonal', ownership: 'automatic' } }));
    const page = { ...createTestDocument({ nodes }).pages[0], connectors };
    const routes = projectPageConnectors(page).map((edge) => edge.samples);
    type P = { x: number; y: number };
    const segments = (route: readonly P[]) => route.slice(1).map((point, index) => [route[index]!, point] as const);
    const vertical = (route: readonly P[]) => segments(route).filter(([a, b]) => a.x === b.x).map(([a]) => a.x);
    // Each turns on its own vertical run…
    expect(new Set([...vertical(routes[0]!), ...vertical(routes[1]!)]).size).toBe(vertical(routes[0]!).length + vertical(routes[1]!).length);
    // …and no segment of one crosses a segment of the other.
    const crosses = ([a, b]: readonly [P, P], [c, d]: readonly [P, P]) => {
      const [h, v] = a.y === b.y ? [[a, b], [c, d]] : [[c, d], [a, b]];
      if (h[0]!.y !== h[1]!.y || v[0]!.x !== v[1]!.x) return false;
      const x = v[0]!.x;
      const y = h[0]!.y;
      return x > Math.min(h[0]!.x, h[1]!.x) && x < Math.max(h[0]!.x, h[1]!.x) && y > Math.min(v[0]!.y, v[1]!.y) && y < Math.max(v[0]!.y, v[1]!.y);
    };
    for (const one of segments(routes[0]!)) for (const other of segments(routes[1]!)) expect(crosses(one, other)).toBe(false);
  });

  it('moves a label off a node to the longest run where it sits clear', () => {
    const route = [{ x: 0, y: 0 }, { x: 0, y: 100 }, { x: 200, y: 100 }, { x: 200, y: 200 }];
    const plate = (text: string, point: { x: number; y: number }) => ({ x: point.x - 20, y: point.y - 10, width: 40, height: 20 });
    // The middle run's midpoint is under a node: the first run is the next longest that is clear.
    expect(clearLabelPoint('yes', 0.5, route, [{ x: 60, y: 80, width: 80, height: 40 }], plate)).toEqual({ x: 0, y: 50 });
    // Clear where it was asked for: it stays.
    expect(clearLabelPoint('yes', 0.5, route, [], plate)).toEqual({ x: 100, y: 100 });
    // Nowhere clear: the asked-for point, not a guess.
    expect(clearLabelPoint('yes', 0.5, route, [{ x: -50, y: -50, width: 300, height: 300 }], plate)).toEqual({ x: 100, y: 100 });
  });

  it('steps a label off the line when no point along the route is clear', () => {
    const route = [{ x: 0, y: 0 }, { x: 200, y: 0 }];
    const plate = (_text: string, point: { x: number; y: number }) => ({ x: point.x - 20, y: point.y - 10, width: 40, height: 20 });
    const band = [{ x: -50, y: -12, width: 300, height: 24 }];
    // A plate 20 tall plus a 4 px gap, off the middle, to the side the route's normal points.
    expect(clearLabelPoint('yes', 0.5, route, band, plate)).toEqual({ x: 100, y: 24 });
    // That side taken too: the other one.
    expect(clearLabelPoint('yes', 0.5, route, [...band, { x: 80, y: 14, width: 40, height: 20 }], plate)).toEqual({ x: 100, y: -24 });
  });

  it('keeps a label on a route with no length instead of losing it', () => {
    const dot = [{ x: 5, y: 5 }, { x: 5, y: 5 }];
    const plate = (_text: string, point: { x: number; y: number }) => ({ x: point.x - 20, y: point.y - 10, width: 40, height: 20 });
    expect(clearLabelPoint('yes', 0.5, dot, [], plate)).toEqual({ x: 5, y: 5 });
    expect(clearLabelPoint('yes', 0.5, dot, [{ x: -500, y: -500, width: 1000, height: 1000 }], plate)).toEqual({ x: 5, y: 5 });
  });

  describe('label placement across a page', () => {
    const at = (x: number, y: number) => ({ translation: { x, y }, rotationRadians: 0, scale: { x: 1, y: 1 } });
    const label = (id: string, text: string, offset = { x: 0, y: 0 }) => ({ id, text, pathRatio: 0.5, offset, metadata: {} });
    const orthogonal = { route: { kind: 'orthogonal', ownership: 'automatic' } } as const;
    const plates = (page: ReturnType<typeof createTestDocument>['pages'][number]) => projectPageConnectors(page)
      .flatMap((edge) => edge.labels.map((entry) => ({ id: `${edge.id}:${entry.id}`, point: entry.point, plate: connectorLabelPlate(entry.text, edge.presentation.label, entry.point) })));
    const noneIntersect = (boxes: readonly { plate: ReturnType<typeof connectorLabelPlate> }[]) =>
      boxes.every((one, index) => boxes.slice(index + 1).every((other) => !intersectsBounds(one.plate, other.plate)));

    const pair = () => [createTestNode('a', { transform: at(0, 0) }), createTestNode('b', { transform: at(400, 0) })];
    const without = (connector: ReturnType<typeof createTestConnector>) => ({ ...connector, labels: [] });

    it('keeps the labels of parallel and reverse edges off each other and off the nodes', () => {
      const nodes = pair();
      const connectors = ['reads', 'writes', 'acks', 'locks'].map((text, index) =>
        createTestConnector(text, index === 2 ? 'b' : 'a', index === 2 ? 'a' : 'b', { ...orthogonal, labels: [label('l', text)] }));
      const page = { ...createTestDocument({ nodes }).pages[0]!, connectors };
      const placed = plates(page);
      expect(placed).toHaveLength(4);
      expect(noneIntersect(placed)).toBe(true);
      const matrices = buildNodeWorldMatrices(page);
      for (const { plate } of placed) {
        for (const node of nodes) expect(intersectsBounds(nodeWorldBounds(node, matrices.get(node.id)!), plate)).toBe(false);
      }
    });

    it('never moves a label the user placed, and steps the others off it', () => {
      const moved = createTestConnector('moved', 'a', 'b', { ...orthogonal, labels: [label('l', 'moved', { x: 0, y: 1 })] });
      const free = createTestConnector('free', 'a', 'b', { ...orthogonal, labels: [label('l', 'moved')] });
      const base = { ...createTestDocument({ nodes: pair() }).pages[0]!, connectors: [moved, free] };
      for (const connectors of [[moved, free], [free, moved]]) {
        const placed = plates({ ...base, connectors });
        // Where the placed label sits when the other edge has no label to compete with.
        const alone = plates({ ...base, connectors: connectors.map((connector) => connector === free ? without(free) : connector) })
          .find((entry) => entry.id === 'moved:l')!.point;
        expect(placed.find((entry) => entry.id === 'moved:l')!.point).toEqual(alone);
        expect(noneIntersect(placed)).toBe(true);
      }
    });

    it('places labels in connector order: the first keeps its own spot, the rest give way', () => {
      const connectors = ['x', 'y', 'z'].map((id) => createTestConnector(id, 'a', 'b', { ...orthogonal, labels: [label('l', 'same label')] }));
      const page = { ...createTestDocument({ nodes: pair() }).pages[0]!, connectors };
      const first = plates({ ...page, connectors: [connectors[0]!, without(connectors[1]!), without(connectors[2]!)] })[0]!.point;
      expect(plates(page)[0]!.point).toEqual(first);
      expect(plates(page).map((entry) => entry.point)).toEqual(plates(page).map((entry) => entry.point));
      expect(noneIntersect(plates(page))).toBe(true);
    });

    it('places a hundred labelled edges, every label somewhere and the same twice over', () => {
      const nodes = Array.from({ length: 40 }, (_, index) => createTestNode(`n${index}`, { transform: at((index % 8) * 220, Math.floor(index / 8) * 140) }));
      const connectors = Array.from({ length: 120 }, (_, index) => createTestConnector(`e${index}`, `n${index % 40}`, `n${(index * 7 + 3) % 40}`, { ...orthogonal, labels: [label('l', `edge ${index}`)] }));
      const page = { ...createTestDocument({ nodes }).pages[0]!, connectors };
      const once = projectPageConnectors(page).flatMap((edge) => edge.labels.map((entry) => entry.point));
      expect(once).toHaveLength(120);
      expect(once.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true);
      expect(projectPageConnectors(page).flatMap((edge) => edge.labels.map((entry) => entry.point))).toEqual(once);
    });

    it('keeps a label that is longer than its edge', () => {
      const nodes = [createTestNode('a', { transform: at(0, 0) }), createTestNode('b', { transform: at(130, 0) })];
      const edge = createTestConnector('short', 'a', 'b', { ...orthogonal, labels: [label('l', 'a label far longer than the thirty pixels between these two nodes')] });
      const page = { ...createTestDocument({ nodes }).pages[0]!, connectors: [edge] };
      const [projected] = projectPageConnectors(page);
      expect(projected!.labels).toHaveLength(1);
      expect(Number.isFinite(projected!.labels[0]!.point.x)).toBe(true);
    });

    it('leaves a self-loop label where it is drawn and still counts it as taken', () => {
      const nodes = [createTestNode('a', { transform: at(0, 0) })];
      const loop = createTestConnector('loop', 'a', 'a', { ...orthogonal, labels: [label('l', 'retry')] });
      const other = createTestConnector('other', 'a', 'a', { ...orthogonal, labels: [label('l', 'again')] });
      const page = { ...createTestDocument({ nodes }).pages[0]!, connectors: [loop, other] };
      expect(plates(page)).toHaveLength(2);
    });
  });

  it('routes a self-loop as a bump out of the right side', () => {
    const page = connectorFixture();
    const connector = createTestConnector('loop', 'source', 'source', {
      route: { kind: 'orthogonal', ownership: 'automatic' },
    });
    const projected = projectConnector({ ...page, connectors: [connector] }, connector)!;
    expect(projected.samples[0].x).toBe(100);
    expect(projected.samples.at(-1)!.x).toBe(100);
    expect(Math.max(...projected.samples.map((point) => point.x))).toBeGreaterThan(140);
  });

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

  // The owner's report, 2026-10-07: messages between the same two lanes bent into V shapes, the
  // first up into the header row, because the parallel-edge fan treated them as parallel edges.
  it('keeps every sequence message between the same two lanes straight', () => {
    const lanes = ['a', 'b'].map((id, index) => createTestNode(id, {
      kind: 'sequence_participant', content: { label: id, seqParticipantKind: 'participant' }, transform: at(index * 300, 0),
    }));
    const messages = [0, 1, 2].map((order) => createTestConnector(`m${order}`, order % 2 ? 'b' : 'a', order % 2 ? 'a' : 'b', {
      route: { kind: 'direct', ownership: 'automatic' }, semantics: { seqMessageKind: 'sync', seqMessageOrder: order },
    }));
    const page = { ...createTestDocument({ nodes: lanes }).pages[0], connectors: messages };
    for (const projected of projectPageConnectors(page)) {
      expect(projected.samples).toHaveLength(2);
      expect(projected.samples[0]!.y).toBe(projected.samples[1]!.y);
    }
  });

  // Found 2026-10-07: the bar is drawn over the lane, so a head ending on the lane's centre was half under it.
  it('ends a sequence message on the edge of an activation bar, not under it', () => {
    // b is active from message 1 to message 3; a never is: centres sit at 50 and 350.
    const nodes = [barLane('a', 0), barLane('b', 300, [{ order: 1, activate: true }, { order: 3, activate: false }])];
    const message = (id: string, from: string, to: string, order: number) => createTestConnector(id, from, to, {
      route: { kind: 'direct', ownership: 'automatic' }, semantics: { seqMessageKind: 'sync', seqMessageOrder: order },
    });
    const page = {
      ...createTestDocument({ nodes }).pages[0],
      connectors: [message('before', 'a', 'b', 0), message('in', 'a', 'b', 1), message('back', 'b', 'a', 3), message('after', 'a', 'b', 4)],
    };
    const xs = Object.fromEntries(projectPageConnectors(page).map((entry) => [entry.id, [entry.samples[0]!.x, entry.samples.at(-1)!.x]]));
    expect(xs.before).toEqual([50, 350]);
    expect(xs.in).toEqual([50, 344]);
    expect(xs.back).toEqual([344, 50]);
    expect(xs.after).toEqual([50, 350]);
  });

  it('ends a message from the right on the right edge of the bar it lands on', () => {
    const nodes = [barLane('a', 0, [{ order: 0, activate: true }, { order: 2, activate: false }]), barLane('b', 300)];
    const reply = createTestConnector('reply', 'b', 'a', {
      route: { kind: 'direct', ownership: 'automatic' }, semantics: { seqMessageKind: 'return', seqMessageOrder: 1 },
    });
    const page = { ...createTestDocument({ nodes }).pages[0], connectors: [reply] };
    expect(projectConnector(page, reply)!.samples.at(-1)!.x).toBe(56);
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
    // Out of the right side and back into it: it never crosses the node it loops on.
    expect(projected.samples).toEqual([
      { x: 100, y: 15 }, { x: 148, y: 15 }, { x: 148, y: 35 }, { x: 100, y: 35 },
    ]);
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
