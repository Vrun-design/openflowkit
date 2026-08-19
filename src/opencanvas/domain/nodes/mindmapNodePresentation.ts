import type { SceneNode } from '../document/types';
import { optionalPresentationString, presentationString } from './nodePresentationValues';

export type MindmapWrapper =
  | 'double-circle'
  | 'double-square'
  | 'stadium'
  | 'subroutine'
  | 'square'
  | 'rounded'
  | 'hexagon';

export interface MindmapNodePresentation {
  readonly kind: 'mindmap';
  readonly label: string;
  readonly depth: number;
  readonly parentId?: string;
  readonly alias?: string;
  readonly wrapper?: MindmapWrapper;
  readonly side?: 'left' | 'right';
  readonly branchStyle: 'curved' | 'straight';
  readonly collapsed: boolean;
  readonly colorKey: string;
  readonly colorMode: 'subtle' | 'filled';
  readonly customColor?: string;
}

export interface MindmapHierarchySnapshot {
  readonly childCountByNodeId: ReadonlyMap<string, number>;
  readonly descendantCountByNodeId: ReadonlyMap<string, number>;
}

const WRAPPERS = new Set<MindmapWrapper>([
  'double-circle',
  'double-square',
  'stadium',
  'subroutine',
  'square',
  'rounded',
  'hexagon',
]);

function depth(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function wrapper(value: unknown): MindmapWrapper | undefined {
  return typeof value === 'string' && WRAPPERS.has(value as MindmapWrapper)
    ? (value as MindmapWrapper)
    : undefined;
}

export function resolveMindmapNodePresentation(node: SceneNode): MindmapNodePresentation | null {
  if (node.kind !== 'mindmap') return null;
  const resolvedDepth = depth(node.content.mindmapDepth);
  const parentId = optionalPresentationString(node.content.mindmapParentId);
  const alias = optionalPresentationString(node.content.mindmapAlias);
  const customColor = optionalPresentationString(node.content.customColor);
  const resolvedWrapper = wrapper(node.content.mindmapWrapper);
  const side =
    node.content.mindmapSide === 'left' || node.content.mindmapSide === 'right'
      ? node.content.mindmapSide
      : undefined;
  return {
    kind: 'mindmap',
    label: presentationString(node.content.label, resolvedDepth === 0 ? 'Central Topic' : 'Topic'),
    depth: resolvedDepth,
    ...(parentId ? { parentId } : {}),
    ...(alias ? { alias } : {}),
    ...(resolvedWrapper ? { wrapper: resolvedWrapper } : {}),
    ...(side ? { side } : {}),
    branchStyle: node.content.mindmapBranchStyle === 'straight' ? 'straight' : 'curved',
    collapsed: node.content.mindmapCollapsed === true,
    colorKey: presentationString(node.content.color, resolvedDepth === 0 ? 'slate' : 'white'),
    colorMode:
      node.content.colorMode === 'filled' ||
      (node.content.colorMode !== 'subtle' && resolvedDepth === 0)
        ? 'filled'
        : 'subtle',
    ...(customColor ? { customColor } : {}),
  };
}

export function createMindmapHierarchySnapshot(
  nodes: readonly SceneNode[]
): MindmapHierarchySnapshot {
  const mindmapIds = new Set(
    nodes.filter((node) => node.kind === 'mindmap').map((node) => node.id)
  );
  const childrenByNodeId = new Map<string, string[]>();
  for (const node of nodes) {
    if (node.kind !== 'mindmap') continue;
    const parentId = optionalPresentationString(node.content.mindmapParentId);
    if (!parentId || parentId === node.id || !mindmapIds.has(parentId)) continue;
    const children = childrenByNodeId.get(parentId) ?? [];
    children.push(node.id);
    childrenByNodeId.set(parentId, children);
  }
  const descendantCountByNodeId = new Map<string, number>();
  for (const nodeId of mindmapIds) {
    const descendants = new Set<string>();
    const pending = [...(childrenByNodeId.get(nodeId) ?? [])];
    while (pending.length > 0) {
      const descendantId = pending.pop();
      if (!descendantId || descendantId === nodeId || descendants.has(descendantId)) continue;
      descendants.add(descendantId);
      pending.push(...(childrenByNodeId.get(descendantId) ?? []));
    }
    descendantCountByNodeId.set(nodeId, descendants.size);
  }
  return {
    childCountByNodeId: new Map(
      [...mindmapIds].map((nodeId) => [nodeId, (childrenByNodeId.get(nodeId) ?? []).length])
    ),
    descendantCountByNodeId,
  };
}
