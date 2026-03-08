import { MarkerType } from '@/lib/reactflowCompat';
import type { Edge, EdgeMarkerType } from '@/lib/reactflowCompat';
import { handleIdToSide } from '@/lib/nodeHandles';

export type ArchitectureEdgeSide = 'L' | 'R' | 'T' | 'B';
export type ArchitectureEdgeDirection = '-->' | '<--' | '<-->';

export function buildArchitectureEdgeLabel(protocol: string, port: string): string {
  const normalizedProtocol = protocol.trim().toUpperCase();
  const normalizedPort = port.trim();
  if (!normalizedProtocol) return '';
  return normalizedPort ? `${normalizedProtocol}:${normalizedPort}` : normalizedProtocol;
}

export function normalizeArchitectureEdgeDirection(value: string | undefined): ArchitectureEdgeDirection {
  if (value === '<--' || value === '<-->') {
    return value;
  }
  return '-->';
}

export function normalizeArchitectureEdgeSide(value: string | undefined): ArchitectureEdgeSide | undefined {
  if (!value) return undefined;
  const side = value.trim().toUpperCase();
  if (side === 'L' || side === 'R' || side === 'T' || side === 'B') {
    return side;
  }
  return undefined;
}

export function architectureSideToHandleId(side: ArchitectureEdgeSide | undefined): string | undefined {
  if (!side) return undefined;
  if (side === 'L') return 'left';
  if (side === 'R') return 'right';
  if (side === 'T') return 'top';
  return 'bottom';
}

export function handleIdToArchitectureSide(handleId: string | undefined): ArchitectureEdgeSide | undefined {
  const side = handleIdToSide(handleId);
  if (side === 'left') return 'L';
  if (side === 'right') return 'R';
  if (side === 'top') return 'T';
  if (side === 'bottom') return 'B';
  return undefined;
}

export function resolveArchitectureEdgeMarkers(
  direction: ArchitectureEdgeDirection,
  color: string
): { markerStart?: { type: MarkerType; color: string }; markerEnd?: { type: MarkerType; color: string } } {
  if (direction === '<-->') {
    return {
      markerStart: { type: MarkerType.ArrowClosed, color },
      markerEnd: { type: MarkerType.ArrowClosed, color },
    };
  }
  if (direction === '<--') {
    return {
      markerStart: { type: MarkerType.ArrowClosed, color },
      markerEnd: undefined,
    };
  }
  return {
    markerStart: undefined,
    markerEnd: { type: MarkerType.ArrowClosed, color },
  };
}

function hasArchitectureDirectionData(edge: Edge): boolean {
  return typeof edge.data?.archDirection === 'string';
}

function isArrowMarker(marker: EdgeMarkerType | string | undefined): boolean {
  return Boolean(marker);
}

export function getDirectionFromMarkers(edge: Edge): ArchitectureEdgeDirection {
  const hasStart = isArrowMarker(edge.markerStart);
  const hasEnd = isArrowMarker(edge.markerEnd);
  if (hasStart && hasEnd) return '<-->';
  if (hasStart) return '<--';
  return '-->';
}

export function applyArchitectureDirection(
  edge: Edge,
  direction: ArchitectureEdgeDirection
): Partial<Edge> {
  if (!hasArchitectureDirectionData(edge)) {
    return {};
  }
  const strokeColor = typeof edge.style?.stroke === 'string' ? edge.style.stroke : '#94a3b8';
  const markers = resolveArchitectureEdgeMarkers(direction, strokeColor);
  return {
    ...markers,
    data: {
      ...edge.data,
      archDirection: direction,
    },
  };
}

export function reverseArchitectureDirection(direction: ArchitectureEdgeDirection): ArchitectureEdgeDirection {
  if (direction === '-->') return '<--';
  if (direction === '<--') return '-->';
  return '<-->';
}
