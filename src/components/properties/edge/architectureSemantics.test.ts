import { describe, expect, it } from 'vitest';
import { MarkerType, type Edge } from '@/lib/reactflowCompat';
import {
  applyArchitectureDirection,
  architectureSideToHandleId,
  buildArchitectureEdgeLabel,
  getDirectionFromMarkers,
  handleIdToArchitectureSide,
  normalizeArchitectureEdgeDirection,
  normalizeArchitectureEdgeSide,
  reverseArchitectureDirection,
  resolveArchitectureEdgeMarkers,
} from './architectureSemantics';

describe('buildArchitectureEdgeLabel', () => {
  it('uppercases protocol and appends port when provided', () => {
    expect(buildArchitectureEdgeLabel('https', '443')).toBe('HTTPS:443');
  });

  it('returns protocol only when port is empty', () => {
    expect(buildArchitectureEdgeLabel('tcp', '')).toBe('TCP');
  });

  it('returns empty label for empty protocol', () => {
    expect(buildArchitectureEdgeLabel('', '443')).toBe('');
  });
});

describe('normalizeArchitectureEdgeDirection', () => {
  it('keeps supported directions and falls back to forward', () => {
    expect(normalizeArchitectureEdgeDirection('<--')).toBe('<--');
    expect(normalizeArchitectureEdgeDirection('<-->')).toBe('<-->');
    expect(normalizeArchitectureEdgeDirection('-->')).toBe('-->');
    expect(normalizeArchitectureEdgeDirection(undefined)).toBe('-->');
    expect(normalizeArchitectureEdgeDirection('invalid')).toBe('-->');
  });
});

describe('normalizeArchitectureEdgeSide', () => {
  it('normalizes valid side values and rejects unknown values', () => {
    expect(normalizeArchitectureEdgeSide('l')).toBe('L');
    expect(normalizeArchitectureEdgeSide('R')).toBe('R');
    expect(normalizeArchitectureEdgeSide('x')).toBeUndefined();
    expect(normalizeArchitectureEdgeSide(undefined)).toBeUndefined();
  });
});

describe('side/handle mapping', () => {
  it('maps architecture sides to handle ids', () => {
    expect(architectureSideToHandleId('L')).toBe('left');
    expect(architectureSideToHandleId('R')).toBe('right');
    expect(architectureSideToHandleId('T')).toBe('top');
    expect(architectureSideToHandleId('B')).toBe('bottom');
    expect(architectureSideToHandleId(undefined)).toBeUndefined();
  });

  it('maps handle ids to architecture sides', () => {
    expect(handleIdToArchitectureSide('left')).toBe('L');
    expect(handleIdToArchitectureSide('RIGHT')).toBe('R');
    expect(handleIdToArchitectureSide('top')).toBe('T');
    expect(handleIdToArchitectureSide('bottom')).toBe('B');
    expect(handleIdToArchitectureSide('source-right')).toBe('R');
    expect(handleIdToArchitectureSide('target-left')).toBe('L');
    expect(handleIdToArchitectureSide('random')).toBeUndefined();
  });
});

describe('resolveArchitectureEdgeMarkers', () => {
  it('resolves forward direction markers', () => {
    const markers = resolveArchitectureEdgeMarkers('-->', '#111111');
    expect(markers.markerStart).toBeUndefined();
    expect(markers.markerEnd).toBeDefined();
  });

  it('resolves reverse direction markers', () => {
    const markers = resolveArchitectureEdgeMarkers('<--', '#222222');
    expect(markers.markerStart).toBeDefined();
    expect(markers.markerEnd).toBeUndefined();
  });

  it('resolves bidirectional markers', () => {
    const markers = resolveArchitectureEdgeMarkers('<-->', '#333333');
    expect(markers.markerStart).toBeDefined();
    expect(markers.markerEnd).toBeDefined();
  });
});

describe('direction helpers', () => {
  const baseArchitectureEdge: Edge = {
    id: 'e1',
    source: 'a',
    target: 'b',
    data: { archDirection: '-->' },
  };

  it('derives direction from markers', () => {
    expect(getDirectionFromMarkers({ ...baseArchitectureEdge, markerEnd: { type: MarkerType.ArrowClosed } })).toBe('-->');
    expect(getDirectionFromMarkers({ ...baseArchitectureEdge, markerStart: { type: MarkerType.ArrowClosed } })).toBe('<--');
    expect(getDirectionFromMarkers({ ...baseArchitectureEdge, markerStart: { type: MarkerType.ArrowClosed }, markerEnd: { type: MarkerType.ArrowClosed } })).toBe('<-->');
  });

  it('applies direction into markers and architecture data', () => {
    const updates = applyArchitectureDirection(baseArchitectureEdge, '<--');
    expect(updates.data?.archDirection).toBe('<--');
    expect(updates.markerStart).toBeDefined();
    expect(updates.markerEnd).toBeUndefined();
  });

  it('no-ops for non-architecture edge data', () => {
    const updates = applyArchitectureDirection({ ...baseArchitectureEdge, data: {} }, '<-->');
    expect(updates).toEqual({});
  });

  it('reverses architecture direction values', () => {
    expect(reverseArchitectureDirection('-->')).toBe('<--');
    expect(reverseArchitectureDirection('<--')).toBe('-->');
    expect(reverseArchitectureDirection('<-->')).toBe('<-->');
  });
});
