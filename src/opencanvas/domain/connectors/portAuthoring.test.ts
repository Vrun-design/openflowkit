import { describe, expect, it } from 'vitest';
import {
  createTestConnector,
  createTestDocument,
  createTestNode,
} from '../../testing/builders/documentBuilder';
import {
  BIND_HYSTERESIS_PX,
  createSidePort,
  ensureConnectorEndpointPorts,
  ensureNodeSidePort,
  nearestAcceptedPortEndpoint,
  portAcceptsRole,
} from './portAuthoring';

describe('connector port authoring', () => {
  it('adds stable side ports and reuses them without mutation', () => {
    const node = createTestNode('node');
    const added = ensureNodeSidePort(node, 'right', 'source');
    expect(added.changed).toBe(true);
    expect(added.port).toEqual(createSidePort('right'));
    const reused = ensureNodeSidePort(added.node, 'right', 'target');
    expect(reused.changed).toBe(false);
    expect(reused.node).toBe(added.node);
  });

  it('treats empty legacy constraints as unrestricted and rejects incompatible roles', () => {
    expect(portAcceptsRole({ ...createSidePort('left'), accepts: [] }, 'target')).toBe(true);
    const node = {
      ...createTestNode('node'),
      ports: [{ ...createSidePort('left'), accepts: ['target'] }],
    };
    expect(() => ensureNodeSidePort(node, 'left', 'source')).toThrow(/does not accept source/);
  });

  it('chooses the nearest role-compatible port in world space', () => {
    const node = {
      ...createTestNode('node'),
      ports: [createSidePort('left'), { ...createSidePort('right'), accepts: ['target'] }],
    };
    const page = createTestDocument({ nodes: [node] }).pages[0];
    expect(nearestAcceptedPortEndpoint(page, 'node', 'source', { x: 100, y: 25 })).toMatchObject({
      nodeId: 'node', portId: 'left',
    });
    expect(nearestAcceptedPortEndpoint(page, 'node', 'target', { x: 100, y: 25 })).toMatchObject({
      nodeId: 'node', portId: 'right',
    });
  });

  it('keeps the bound side across a corner until another port is 10 px closer', () => {
    // 100×50 node: right anchor (100,25), bottom anchor (50,50).
    const node = {
      ...createTestNode('node'),
      ports: [createSidePort('right'), createSidePort('bottom')],
    };
    const page = createTestDocument({ nodes: [node] }).pages[0];
    // Past the corner bisector toward bottom, but under 10 px nearer: sticks.
    const near = { x: 80, y: 55 };
    expect(nearestAcceptedPortEndpoint(page, 'node', 'source', near, null).portId).toBe('bottom');
    expect(nearestAcceptedPortEndpoint(page, 'node', 'source', near, 'right').portId).toBe('right');
    // A full step past: switches.
    const far = { x: 60, y: 90 };
    expect(nearestAcceptedPortEndpoint(page, 'node', 'source', far, 'right').portId).toBe('bottom');
    expect(BIND_HYSTERESIS_PX).toBe(10);
  });

  it('materialises missing side ports and leaves custom ids dangling', () => {
    const page = createTestDocument({
      nodes: [createTestNode('a'), createTestNode('b')],
      connectors: [
        createTestConnector('edge', 'a', 'b', {
          source: { nodeId: 'a', portId: 'right', anchor: null, point: null },
          target: { nodeId: 'b', portId: 'left', anchor: null, point: null },
        }),
        createTestConnector('custom', 'a', 'b', {
          source: { nodeId: 'a', portId: 'midi', anchor: null, point: null },
          target: { nodeId: 'b', portId: null, anchor: null, point: null },
        }),
      ],
    }).pages[0];
    const fixings = ensureConnectorEndpointPorts(page, page.connectors[0]);
    expect(fixings.map((fixing) => [fixing.before.id, fixing.after.ports.map((port) => port.id)])).toEqual([
      ['a', ['right']],
      ['b', ['left']],
    ]);
    expect(ensureConnectorEndpointPorts(page, page.connectors[1])).toHaveLength(0);
    const primed = createTestDocument({
      nodes: [fixings[0].after, fixings[1].after],
    }).pages[0];
    expect(ensureConnectorEndpointPorts(primed, page.connectors[0])).toHaveLength(0);
  });
});
