import type { FlowNode } from '@/lib/types';

export type HandleSide = 'top' | 'right' | 'bottom' | 'left';

const SPECIAL_HANDLE_IDS_BY_TYPE: Partial<Record<string, Partial<Record<HandleSide, string>>>> = {
  text: {
    top: 'target-top',
    right: 'source-right',
    bottom: 'source-bottom',
    left: 'target-left',
  },
  group: {
    top: 'top-target',
    right: 'right-source',
    bottom: 'bottom-source',
    left: 'left-target',
  },
  swimlane: {
    top: 'top-target',
    right: 'right-source',
    bottom: 'bottom-source',
    left: 'left-target',
  },
  mindmap: {
    right: 'right',
    left: 'left',
  },
};

export function handleIdToSide(handleId: string | null | undefined): HandleSide | undefined {
  if (!handleId) return undefined;
  const normalized = handleId.trim().toLowerCase();

  if (normalized === 'left' || normalized.startsWith('left-') || normalized.endsWith('-left')) return 'left';
  if (normalized === 'right' || normalized.startsWith('right-') || normalized.endsWith('-right')) return 'right';
  if (normalized === 'top' || normalized.startsWith('top-') || normalized.endsWith('-top')) return 'top';
  if (normalized === 'bottom' || normalized.startsWith('bottom-') || normalized.endsWith('-bottom')) return 'bottom';
  return undefined;
}

export function getNodeHandleIdForSide(
  node: Pick<FlowNode, 'type'> | null | undefined,
  side: HandleSide
): string {
  const nodeType = typeof node?.type === 'string' ? node.type : '';
  const handleIdsBySide = SPECIAL_HANDLE_IDS_BY_TYPE[nodeType];
  return handleIdsBySide?.[side] ?? side;
}

export function normalizeNodeHandleId(
  node: Pick<FlowNode, 'type'> | null | undefined,
  handleId: string | null | undefined
): string | null | undefined {
  const side = handleIdToSide(handleId);
  if (!side) return handleId;
  return getNodeHandleIdForSide(node, side);
}
