import { describe, expect, it } from 'vitest';
import type { FlowEdge } from '@/lib/types';
import { releaseStaleElkRoutesForNodeIds } from './releaseStaleElkRoutes';

function createEdge(overrides: Partial<FlowEdge> = {}): FlowEdge {
  return {
    id: 'edge-1',
    source: 'a',
    target: 'b',
    data: {},
    ...overrides,
  } as FlowEdge;
}

describe('releaseStaleElkRoutesForNodeIds', () => {
  it('releases elk-routed edges connected to moved nodes back to auto mode', () => {
    const edges = [
      createEdge({
        data: {
          routingMode: 'elk',
          elkPoints: [{ x: 10, y: 10 }],
        },
      }),
    ];

    const result = releaseStaleElkRoutesForNodeIds(edges, new Set(['a']));

    expect(result).not.toBe(edges);
    expect(result[0].data?.routingMode).toBe('auto');
    expect(result[0].data?.elkPoints).toBeUndefined();
  });

  it('preserves manual routes even when a connected node moves', () => {
    const edges = [
      createEdge({
        data: {
          routingMode: 'manual',
          elkPoints: [{ x: 10, y: 10 }],
          waypoints: [{ x: 20, y: 20 }],
        },
      }),
    ];

    const result = releaseStaleElkRoutesForNodeIds(edges, new Set(['a']));

    expect(result).toBe(edges);
  });

  it('does nothing when no connected nodes moved', () => {
    const edges = [
      createEdge({
        data: {
          routingMode: 'elk',
          elkPoints: [{ x: 10, y: 10 }],
        },
      }),
    ];

    const result = releaseStaleElkRoutesForNodeIds(edges, new Set(['z']));

    expect(result).toBe(edges);
  });
});

