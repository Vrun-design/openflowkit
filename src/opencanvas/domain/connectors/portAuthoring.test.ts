import { describe, expect, it } from 'vitest';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import {
  createSidePort,
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
});
