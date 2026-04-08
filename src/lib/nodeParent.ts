import type { Node } from '@/lib/reactflowCompat';

type NodeWithParent = Node & {
  parentId?: string;
  extent?: Node['extent'];
};

interface SetNodeParentOptions {
  constrainToParent?: boolean;
}

export function getNodeParentId(node: NodeWithParent): string {
  if (typeof node.parentId === 'string' && node.parentId.length > 0) {
    return node.parentId;
  }
  return '';
}

export function setNodeParent<T extends Node>(
  node: T,
  parentId: string,
  options: SetNodeParentOptions = {}
): T {
  const nextNode = {
    ...node,
    parentId,
  } as NodeWithParent;

  if (options.constrainToParent) {
    nextNode.extent = 'parent';
  } else {
    delete nextNode.extent;
  }

  return nextNode as T;
}

export function clearNodeParent<T extends Node>(node: T): T {
  const next = { ...node } as NodeWithParent;
  delete next.parentId;
  delete next.extent;
  return next as T;
}
