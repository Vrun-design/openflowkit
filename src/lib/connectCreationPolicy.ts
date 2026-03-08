import type { NodeData } from '@/lib/types';
import { handleIdToSide } from '@/lib/nodeHandles';

export interface ConnectedNodeSpec {
  type: string;
  shape?: NodeData['shape'];
}

export function isMindmapConnectorSource(sourceNodeType?: string | null): boolean {
  return sourceNodeType === 'mindmap';
}

export function getDefaultConnectedNodeSpec(sourceNodeType?: string | null): ConnectedNodeSpec {
  if (isMindmapConnectorSource(sourceNodeType)) {
    return { type: 'mindmap' };
  }

  return {
    type: 'process',
    shape: 'rounded',
  };
}

export function shouldBypassConnectMenu(sourceNodeType?: string | null): boolean {
  return isMindmapConnectorSource(sourceNodeType);
}

export function getMindmapChildSideFromSourceHandle(sourceHandle?: string | null): 'left' | 'right' | undefined {
  const side = handleIdToSide(sourceHandle);
  if (side === 'left' || side === 'right') {
    return side;
  }
  return undefined;
}

export function resolveMindmapChildSide(
  parentDepth: number,
  parentSide?: 'left' | 'right' | null,
  sourceHandle?: string | null
): 'left' | 'right' | undefined {
  if (parentDepth === 0) {
    return getMindmapChildSideFromSourceHandle(sourceHandle) ?? 'right';
  }
  return parentSide ?? undefined;
}
