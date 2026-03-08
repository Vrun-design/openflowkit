import { describe, expect, it } from 'vitest';
import { Position } from '@/lib/reactflowCompat';
import { buildEdgePath } from './pathUtils';
import { setEdgeInteractionLowDetailMode } from './edgeRenderMode';

const NODE_A = { id: 'a', position: { x: 100, y: 100 }, width: 0, height: 0 };
const NODE_B = { id: 'b', position: { x: 260, y: 40 }, width: 0, height: 0 };
const NODE_C = { id: 'c', position: { x: 260, y: 100 }, width: 0, height: 0 };
const NODE_D = { id: 'd', position: { x: 260, y: 160 }, width: 0, height: 0 };
const NODE_E = { id: 'e', position: { x: 260, y: 220 }, width: 0, height: 0 };
const NODE_F = { id: 'f', position: { x: 260, y: 280 }, width: 0, height: 0 };
const TOP_NODE = { id: 'top', position: { x: 100, y: 100 }, width: 0, height: 0 };
const LEFT_TARGET = { id: 'left-target', position: { x: 40, y: 260 }, width: 0, height: 0 };
const CENTER_TARGET = { id: 'center-target', position: { x: 100, y: 260 }, width: 0, height: 0 };
const RIGHT_TARGET = { id: 'right-target', position: { x: 160, y: 260 }, width: 0, height: 0 };
const EXTRA_TARGET_A = { id: 'extra-a', position: { x: 220, y: 260 }, width: 0, height: 0 };
const EXTRA_TARGET_B = { id: 'extra-b', position: { x: 280, y: 260 }, width: 0, height: 0 };
const THREE_TARGET_NODES = [NODE_A, NODE_B, NODE_C, NODE_D];
const FIVE_TARGET_NODES = [NODE_A, NODE_B, NODE_C, NODE_D, NODE_E, NODE_F];
const TOP_BOTTOM_TARGET_NODES = [TOP_NODE, LEFT_TARGET, CENTER_TARGET, RIGHT_TARGET, EXTRA_TARGET_A, EXTRA_TARGET_B];

function getMovePoint(path: string): string {
  const match = path.match(/^M\s*([0-9.-]+)\s+([0-9.-]+)/);
  if (!match) {
    throw new Error(`Missing move point in path: ${path}`);
  }

  return `${match[1]},${match[2]}`;
}

function getMoveY(path: string): number {
  const [, y] = getMovePoint(path).split(',');
  return Number(y);
}

function getLastPoint(path: string): string {
  const matches = [...path.matchAll(/L\s*([0-9.-]+)\s+([0-9.-]+)/g)];
  const lastMatch = matches.at(-1);
  if (!lastMatch) {
    throw new Error(`Missing line point in path: ${path}`);
  }

  return `${lastMatch[1]},${lastMatch[2]}`;
}

describe('buildEdgePath', () => {
  it('skips sibling fanout offsets while edge interaction low-detail mode is active', () => {
    const allEdges = [
      { id: 'edge-1', source: 'a', target: 'b', sourceHandle: 'right', targetHandle: 'left' },
      { id: 'edge-2', source: 'a', target: 'c', sourceHandle: 'right', targetHandle: 'left' },
      { id: 'edge-3', source: 'a', target: 'd', sourceHandle: 'right', targetHandle: 'left' },
    ];

    setEdgeInteractionLowDetailMode(true);
    try {
      const result = buildEdgePath(
        {
          id: 'edge-1',
          source: 'a',
          target: 'b',
          sourceX: 100,
          sourceY: 100,
          targetX: 260,
          targetY: 40,
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          sourceHandleId: 'right',
          targetHandleId: 'left',
        },
        allEdges,
        THREE_TARGET_NODES,
        'smoothstep'
      );

      expect(getMovePoint(result.edgePath)).toBe('100,100');
    } finally {
      setEdgeInteractionLowDetailMode(false);
    }
  });

  it('routes edge through explicit waypoint when provided', () => {
    const result = buildEdgePath(
      {
        id: 'edge-1',
        source: 'a',
        target: 'b',
        sourceX: 0,
        sourceY: 0,
        targetX: 100,
        targetY: 100,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      },
      [],
      [NODE_A, NODE_B],
      'smoothstep',
      {
        waypoint: { x: 40, y: 60 },
      }
    );

    expect(result.edgePath).toContain('Q 40 60');
    expect(result.edgePath.startsWith('M ')).toBe(true);
    expect(Number.isFinite(result.labelX)).toBe(true);
    expect(Number.isFinite(result.labelY)).toBe(true);
  });

  it('routes edge through multiple manual waypoints when provided', () => {
    const result = buildEdgePath(
      {
        id: 'edge-1',
        source: 'a',
        target: 'b',
        sourceX: 0,
        sourceY: 0,
        targetX: 100,
        targetY: 100,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      },
      [],
      [NODE_A, NODE_B],
      'smoothstep',
      {
        routingMode: 'manual',
        waypoints: [
          { x: 20, y: 20 },
          { x: 70, y: 20 },
        ],
        elkPoints: [
          { x: 10, y: 60 },
          { x: 80, y: 60 },
        ],
      }
    );

    expect(result.edgePath).toContain('Q 20 20');
    expect(result.edgePath).toContain('Q 70 20');
    expect(result.edgePath).not.toContain('Q 10 60');
    expect(Number.isFinite(result.labelX)).toBe(true);
    expect(Number.isFinite(result.labelY)).toBe(true);
  });

  it('builds straight auto-routed paths when the straight renderer is used', () => {
    const result = buildEdgePath(
      {
        id: 'edge-straight',
        source: 'a',
        target: 'b',
        sourceX: 0,
        sourceY: 0,
        targetX: 100,
        targetY: 100,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      },
      [],
      [NODE_A, NODE_B],
      'straight'
    );

    expect(result.edgePath).toBe('M 0,0L 100,100');
    expect(result.labelX).toBe(50);
    expect(result.labelY).toBe(50);
  });

  it('fans out edges that share the same node side by default', () => {
    const allEdges = [
      { id: 'edge-1', source: 'a', target: 'b', sourceHandle: 'right', targetHandle: 'left' },
      { id: 'edge-2', source: 'a', target: 'c', sourceHandle: 'right', targetHandle: 'left' },
      { id: 'edge-3', source: 'a', target: 'd', sourceHandle: 'right', targetHandle: 'left' },
    ];

    const first = buildEdgePath(
      {
        id: 'edge-1',
        source: 'a',
        target: 'b',
        sourceX: 100,
        sourceY: 100,
        targetX: 260,
        targetY: 40,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        sourceHandleId: 'right',
        targetHandleId: 'left',
      },
      allEdges,
      THREE_TARGET_NODES,
      'smoothstep'
    );

    const second = buildEdgePath(
      {
        id: 'edge-2',
        source: 'a',
        target: 'c',
        sourceX: 100,
        sourceY: 100,
        targetX: 260,
        targetY: 100,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        sourceHandleId: 'right',
        targetHandleId: 'left',
      },
      allEdges,
      THREE_TARGET_NODES,
      'smoothstep'
    );

    const third = buildEdgePath(
      {
        id: 'edge-3',
        source: 'a',
        target: 'd',
        sourceX: 100,
        sourceY: 100,
        targetX: 260,
        targetY: 160,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        sourceHandleId: 'right',
        targetHandleId: 'left',
      },
      allEdges,
      THREE_TARGET_NODES,
      'smoothstep'
    );

    expect(getMovePoint(first.edgePath)).not.toBe('100,100');
    expect(getMovePoint(second.edgePath)).toBe('100,100');
    expect(getMovePoint(third.edgePath)).not.toBe('100,100');
  });

  it('nudges bundle labels further for denser side bundles', () => {
    const sparseEdges = [
      { id: 's1', source: 'a', target: 'b', sourceHandle: 'right', targetHandle: 'left' },
      { id: 's2', source: 'a', target: 'c', sourceHandle: 'right', targetHandle: 'left' },
      { id: 's3', source: 'a', target: 'd', sourceHandle: 'right', targetHandle: 'left' },
    ];
    const denseEdges = [
      { id: 'd1', source: 'a', target: 'b', sourceHandle: 'right', targetHandle: 'left' },
      { id: 'd2', source: 'a', target: 'c', sourceHandle: 'right', targetHandle: 'left' },
      { id: 'd3', source: 'a', target: 'd', sourceHandle: 'right', targetHandle: 'left' },
      { id: 'd4', source: 'a', target: 'e', sourceHandle: 'right', targetHandle: 'left' },
      { id: 'd5', source: 'a', target: 'f', sourceHandle: 'right', targetHandle: 'left' },
    ];

    const sparseOuter = buildEdgePath(
      {
        id: 's1',
        source: 'a',
        target: 'b',
        sourceX: 100,
        sourceY: 100,
        targetX: 260,
        targetY: 40,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        sourceHandleId: 'right',
        targetHandleId: 'left',
      },
      sparseEdges,
      THREE_TARGET_NODES,
      'smoothstep'
    );

    const denseOuter = buildEdgePath(
      {
        id: 'd1',
        source: 'a',
        target: 'b',
        sourceX: 100,
        sourceY: 100,
        targetX: 260,
        targetY: 40,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        sourceHandleId: 'right',
        targetHandleId: 'left',
      },
      denseEdges,
      FIVE_TARGET_NODES,
      'smoothstep'
    );

    expect(Math.abs(denseOuter.labelY - 100)).toBeGreaterThan(Math.abs(sparseOuter.labelY - 100));
  });

  it('uses a shared source trunk for dense orthogonal bundles', () => {
    const denseEdges = [
      { id: 'd1', source: 'a', target: 'b', sourceHandle: 'right', targetHandle: 'left' },
      { id: 'd2', source: 'a', target: 'c', sourceHandle: 'right', targetHandle: 'left' },
      { id: 'd3', source: 'a', target: 'd', sourceHandle: 'right', targetHandle: 'left' },
      { id: 'd4', source: 'a', target: 'e', sourceHandle: 'right', targetHandle: 'left' },
      { id: 'd5', source: 'a', target: 'f', sourceHandle: 'right', targetHandle: 'left' },
    ];

    const outer = buildEdgePath(
      {
        id: 'd1',
        source: 'a',
        target: 'b',
        sourceX: 100,
        sourceY: 100,
        targetX: 260,
        targetY: 40,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        sourceHandleId: 'right',
        targetHandleId: 'left',
      },
      denseEdges,
      FIVE_TARGET_NODES,
      'smoothstep'
    );

    const center = buildEdgePath(
      {
        id: 'd3',
        source: 'a',
        target: 'd',
        sourceX: 100,
        sourceY: 100,
        targetX: 260,
        targetY: 100,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        sourceHandleId: 'right',
        targetHandleId: 'left',
      },
      denseEdges,
      FIVE_TARGET_NODES,
      'smoothstep'
    );

    expect(getMovePoint(outer.edgePath)).toBe('100,100');
    expect(getMovePoint(center.edgePath)).toBe('100,100');
  });

  it('does not use a shared source trunk for 3-edge bundles by default', () => {
    const threeEdges = [
      { id: 'edge-1', source: 'a', target: 'b', sourceHandle: 'right', targetHandle: 'left' },
      { id: 'edge-2', source: 'a', target: 'c', sourceHandle: 'right', targetHandle: 'left' },
      { id: 'edge-3', source: 'a', target: 'd', sourceHandle: 'right', targetHandle: 'left' },
    ];

    const outer = buildEdgePath(
      {
        id: 'edge-1',
        source: 'a',
        target: 'b',
        sourceX: 100,
        sourceY: 100,
        targetX: 260,
        targetY: 40,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        sourceHandleId: 'right',
        targetHandleId: 'left',
      },
      threeEdges,
      THREE_TARGET_NODES,
      'smoothstep'
    );

    const center = buildEdgePath(
      {
        id: 'edge-2',
        source: 'a',
        target: 'c',
        sourceX: 100,
        sourceY: 100,
        targetX: 260,
        targetY: 100,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        sourceHandleId: 'right',
        targetHandleId: 'left',
      },
      threeEdges,
      THREE_TARGET_NODES,
      'smoothstep'
    );

    expect(getMovePoint(outer.edgePath)).not.toBe('100,100');
    expect(getMovePoint(center.edgePath)).toBe('100,100');
  });

  it('nudges labels away from the center line for same-side bundles', () => {
    const allEdges = [
      { id: 'edge-1', source: 'a', target: 'b', sourceHandle: 'right', targetHandle: 'left' },
      { id: 'edge-2', source: 'a', target: 'c', sourceHandle: 'right', targetHandle: 'left' },
      { id: 'edge-3', source: 'a', target: 'd', sourceHandle: 'right', targetHandle: 'left' },
    ];

    const first = buildEdgePath(
      {
        id: 'edge-1',
        source: 'a',
        target: 'b',
        sourceX: 100,
        sourceY: 100,
        targetX: 260,
        targetY: 40,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        sourceHandleId: 'right',
        targetHandleId: 'left',
      },
      allEdges,
      THREE_TARGET_NODES,
      'smoothstep'
    );

    const second = buildEdgePath(
      {
        id: 'edge-2',
        source: 'a',
        target: 'c',
        sourceX: 100,
        sourceY: 100,
        targetX: 260,
        targetY: 100,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        sourceHandleId: 'right',
        targetHandleId: 'left',
      },
      allEdges,
      THREE_TARGET_NODES,
      'smoothstep'
    );

    expect(first.labelY).not.toBe(second.labelY);
    expect(Math.abs(first.labelY - second.labelY)).toBeGreaterThan(2);
  });

  it('orders same-side bundle labels by remote node position instead of edge array order', () => {
    const shuffledEdges = [
      { id: 'edge-3', source: 'a', target: 'd', sourceHandle: 'right', targetHandle: 'left' },
      { id: 'edge-1', source: 'a', target: 'b', sourceHandle: 'right', targetHandle: 'left' },
      { id: 'edge-2', source: 'a', target: 'c', sourceHandle: 'right', targetHandle: 'left' },
    ];

    const top = buildEdgePath(
      {
        id: 'edge-1',
        source: 'a',
        target: 'b',
        sourceX: 100,
        sourceY: 100,
        targetX: 260,
        targetY: 40,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        sourceHandleId: 'right',
        targetHandleId: 'left',
      },
      shuffledEdges,
      THREE_TARGET_NODES,
      'smoothstep'
    );

    const middle = buildEdgePath(
      {
        id: 'edge-2',
        source: 'a',
        target: 'c',
        sourceX: 100,
        sourceY: 100,
        targetX: 260,
        targetY: 100,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        sourceHandleId: 'right',
        targetHandleId: 'left',
      },
      shuffledEdges,
      THREE_TARGET_NODES,
      'smoothstep'
    );

    const bottom = buildEdgePath(
      {
        id: 'edge-3',
        source: 'a',
        target: 'd',
        sourceX: 100,
        sourceY: 100,
        targetX: 260,
        targetY: 160,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        sourceHandleId: 'right',
        targetHandleId: 'left',
      },
      shuffledEdges,
      THREE_TARGET_NODES,
      'smoothstep'
    );

    expect(top.labelY).toBeLessThan(middle.labelY);
    expect(bottom.labelY).toBeGreaterThan(middle.labelY);
  });

  it('uses a shared source trunk for dense top-to-bottom bundles', () => {
    const denseEdges = [
      { id: 't1', source: 'top', target: 'left-target', sourceHandle: 'bottom', targetHandle: 'top' },
      { id: 't2', source: 'top', target: 'center-target', sourceHandle: 'bottom', targetHandle: 'top' },
      { id: 't3', source: 'top', target: 'right-target', sourceHandle: 'bottom', targetHandle: 'top' },
      { id: 't4', source: 'top', target: 'extra-a', sourceHandle: 'bottom', targetHandle: 'top' },
      { id: 't5', source: 'top', target: 'extra-b', sourceHandle: 'bottom', targetHandle: 'top' },
    ];

    const left = buildEdgePath(
      {
        id: 't1',
        source: 'top',
        target: 'left-target',
        sourceX: 100,
        sourceY: 100,
        targetX: 40,
        targetY: 260,
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        sourceHandleId: 'bottom',
        targetHandleId: 'top',
      },
      denseEdges,
      TOP_BOTTOM_TARGET_NODES,
      'smoothstep'
    );

    const center = buildEdgePath(
      {
        id: 't2',
        source: 'top',
        target: 'center-target',
        sourceX: 100,
        sourceY: 100,
        targetX: 100,
        targetY: 260,
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        sourceHandleId: 'bottom',
        targetHandleId: 'top',
      },
      denseEdges,
      TOP_BOTTOM_TARGET_NODES,
      'smoothstep'
    );

    expect(getMovePoint(left.edgePath)).toBe('100,100');
    expect(getMovePoint(center.edgePath)).toBe('100,100');
    expect(left.labelX).toBeLessThan(center.labelX);
  });

  it('prefers manual waypoint routing over elk bend points', () => {
    const result = buildEdgePath(
      {
        id: 'edge-1',
        source: 'a',
        target: 'b',
        sourceX: 0,
        sourceY: 0,
        targetX: 100,
        targetY: 100,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      },
      [],
      [NODE_A, NODE_B],
      'smoothstep',
      {
        routingMode: 'manual',
        elkPoints: [{ x: 20, y: 20 }, { x: 50, y: 80 }],
        waypoint: { x: 40, y: 60 },
      }
    );

    expect(result.edgePath).toContain('Q 40 60');
    expect(result.edgePath).not.toContain('Q 20 20');
  });

  it('adds shape-aware ELK boundary clearance for non-rectangular nodes', () => {
    const result = buildEdgePath(
      {
        id: 'edge-diamond',
        source: 'a',
        target: 'diamond',
        sourceX: 0,
        sourceY: 60,
        targetX: 100,
        targetY: 100,
        sourcePosition: Position.Right,
        targetPosition: Position.Top,
      },
      [],
      [
        { ...NODE_A, data: { shape: 'rounded' } },
        { id: 'diamond', position: { x: 60, y: 60 }, width: 80, height: 80, data: { shape: 'diamond' } },
      ],
      'smoothstep',
      {
        routingMode: 'elk',
        elkPoints: [{ x: 60, y: 60 }],
      }
    );

    expect(getMovePoint(result.edgePath)).toBe('0,60');
    expect(getLastPoint(result.edgePath)).toBe('100,88');
  });

  it('extends too-short ELK endpoint lead segments to reduce immediate stair-steps', () => {
    const result = buildEdgePath(
      {
        id: 'edge-elk-lead',
        source: 'a',
        target: 'b',
        sourceX: 0,
        sourceY: 0,
        targetX: 80,
        targetY: 80,
        sourcePosition: Position.Right,
        targetPosition: Position.Top,
      },
      [],
      [NODE_A, NODE_B],
      'smoothstep',
      {
        routingMode: 'elk',
        elkPoints: [
          { x: 4, y: 0 },
          { x: 4, y: 40 },
          { x: 80, y: 40 },
        ],
      }
    );

    expect(result.edgePath).toContain('Q 12 0');
    expect(result.edgePath).not.toContain('L 4 0');
  });

  it('adds an orthogonal bridge from the current handle center into the ELK route', () => {
    const result = buildEdgePath(
      {
        id: 'edge-elk-bridge',
        source: 'a',
        target: 'b',
        sourceX: 0,
        sourceY: 0,
        targetX: 120,
        targetY: 100,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      },
      [],
      [NODE_A, NODE_B],
      'smoothstep',
      {
        routingMode: 'elk',
        elkPoints: [
          { x: 40, y: 30 },
          { x: 80, y: 30 },
        ],
      }
    );

    expect(result.edgePath).toContain('Q 12 0');
    expect(result.edgePath).toContain('Q 12 30 20 30');
  });

  it('still applies legacy renderer-side fanout to ELK endpoints by default', () => {
    const elkSiblingEdges = [
      { id: 'elk-1', source: 'a', target: 'b', sourceHandle: 'right', targetHandle: 'left' },
      { id: 'elk-2', source: 'a', target: 'c', sourceHandle: 'right', targetHandle: 'left' },
      { id: 'elk-3', source: 'a', target: 'd', sourceHandle: 'right', targetHandle: 'left' },
    ];

    const first = buildEdgePath(
      {
        id: 'elk-1',
        source: 'a',
        target: 'b',
        sourceX: 100,
        sourceY: 100,
        targetX: 260,
        targetY: 40,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        sourceHandleId: 'right',
        targetHandleId: 'left',
      },
      elkSiblingEdges,
      THREE_TARGET_NODES,
      'smoothstep',
      {
        routingMode: 'elk',
        elkPoints: [
          { x: 160, y: 100 },
          { x: 160, y: 40 },
        ],
      }
    );

    expect(getMovePoint(first.edgePath)).not.toBe('100,100');
    expect(first.labelX).toBe(160);
    expect(first.labelY).toBeLessThan(70);
  });
});
