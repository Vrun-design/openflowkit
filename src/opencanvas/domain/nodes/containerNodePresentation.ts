import type { SceneNode } from '../document/types';
import { optionalPresentationString, presentationString } from './nodePresentationValues';

export const CONTAINER_NODE_KINDS = ['group', 'section', 'swimlane'] as const;

export type ContainerNodeKind = (typeof CONTAINER_NODE_KINDS)[number];

export interface ContainerNodePresentation {
  readonly kind: ContainerNodeKind;
  readonly label: string;
  readonly subLabel?: string;
  readonly colorKey: string;
  readonly colorMode: 'subtle' | 'filled';
  readonly customColor?: string;
  readonly locked: boolean;
  readonly hidden: boolean;
  readonly collapsed: boolean;
}

const CONTAINER_KIND_SET = new Set<string>(CONTAINER_NODE_KINDS);
const SWIMLANE_COLOR_KEYS = ['blue', 'emerald', 'yellow', 'pink', 'violet'] as const;

export function isContainerNodeKind(kind: string): kind is ContainerNodeKind {
  return CONTAINER_KIND_SET.has(kind);
}

function fallbackColorKey(node: SceneNode, kind: ContainerNodeKind): string {
  if (kind === 'group') return 'violet';
  if (kind === 'section') return 'blue';
  const numericId = Number.parseInt(node.id.replace(/\D/g, ''), 10);
  const index = Number.isFinite(numericId) ? numericId : 0;
  return SWIMLANE_COLOR_KEYS[index % SWIMLANE_COLOR_KEYS.length];
}

function fallbackLabel(kind: ContainerNodeKind): string {
  if (kind === 'group') return 'Group';
  if (kind === 'section') return 'Section';
  return 'Swimlane';
}

export function resolveContainerNodePresentation(
  node: SceneNode
): ContainerNodePresentation | null {
  if (!isContainerNodeKind(node.kind)) return null;
  const kind = node.kind;
  const subLabel = optionalPresentationString(node.content.subLabel);
  const customColor = optionalPresentationString(node.content.customColor);
  return {
    kind,
    label: presentationString(node.content.label, fallbackLabel(kind)),
    ...(subLabel ? { subLabel } : {}),
    colorKey: presentationString(node.content.color, fallbackColorKey(node, kind)),
    colorMode: node.content.colorMode === 'filled' ? 'filled' : 'subtle',
    ...(customColor ? { customColor } : {}),
    locked: node.content.sectionLocked === true,
    hidden: node.content.sectionHidden === true,
    collapsed: node.content.sectionCollapsed === true,
  };
}
