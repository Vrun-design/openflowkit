import type { Node } from '@/lib/reactflowCompat';
import { NodeType, type NodeData } from '@/lib/types';

export type BulkEditableCapability =
  | 'shape'
  | 'color'
  | 'advancedColor'
  | 'icon'
  | 'variant'
  | 'architecture'
  | 'journey'
  | 'class'
  | 'sequence';

export interface BulkLabelTransformOptions {
  labelPrefix?: string;
  labelSuffix?: string;
  labelFindReplace?: { find: string; replace: string; useRegex: boolean };
}

export interface BulkSelectionFamilySummary {
  id: string;
  label: string;
  count: number;
}

type NodeFamilyId =
  | 'architecture'
  | 'mindmap'
  | 'journey'
  | 'class'
  | 'entity'
  | 'sequence'
  | 'wireframe'
  | 'text'
  | 'annotation'
  | 'image'
  | 'asset'
  | 'section'
  | 'generic';

type CapabilityRule = {
  capability: BulkEditableCapability;
  keys: readonly (keyof NodeData)[];
  supports: (node: Node<NodeData>) => boolean;
};

const FLOW_NODE_LABEL = 'Flow node';

const NODE_FAMILY_LABELS: Record<NodeFamilyId, string> = {
  architecture: 'Architecture',
  mindmap: 'Mindmap',
  journey: 'Journey',
  class: 'Class',
  entity: 'Entity',
  sequence: 'Sequence',
  wireframe: 'Wireframe',
  text: 'Text',
  annotation: 'Annotation',
  image: 'Image',
  asset: 'Asset',
  section: 'Section',
  generic: FLOW_NODE_LABEL,
};

const BULK_CAPABILITY_RULES: CapabilityRule[] = [
  {
    capability: 'shape',
    keys: ['shape'],
    supports: (node) =>
      !isIconAssetNode(node) &&
      GENERIC_SHAPE_NODE_TYPES.has(node.type),
  },
  {
    capability: 'color',
    keys: ['color'],
    supports: (node) =>
      GENERIC_COLOR_NODE_TYPES.has(node.type) ||
      node.type === NodeType.ARCHITECTURE ||
      node.type === NodeType.MINDMAP,
  },
  {
    capability: 'advancedColor',
    keys: ['colorMode', 'customColor'],
    supports: (node) => ADVANCED_COLOR_NODE_TYPES.has(node.type),
  },
  {
    capability: 'icon',
    keys: [
      'icon',
      'customIconUrl',
      'assetProvider',
      'assetCategory',
      'archIconPackId',
      'archIconShapeId',
    ],
    supports: (node) =>
      !isIconAssetNode(node) &&
      GENERIC_ICON_NODE_TYPES.has(node.type),
  },
  {
    capability: 'variant',
    keys: ['variant'],
    supports: (node) => node.type === NodeType.BROWSER || node.type === NodeType.MOBILE,
  },
  {
    capability: 'architecture',
    keys: ['archEnvironment', 'archResourceType', 'archZone', 'archTrustDomain'],
    supports: (node) => node.type === NodeType.ARCHITECTURE,
  },
  {
    capability: 'journey',
    keys: ['journeySection', 'journeyScore'],
    supports: (node) => node.type === NodeType.JOURNEY,
  },
  {
    capability: 'class',
    keys: ['classStereotype'],
    supports: (node) => node.type === NodeType.CLASS,
  },
  {
    capability: 'sequence',
    keys: ['seqParticipantAlias'],
    supports: (node) => node.type === NodeType.SEQUENCE_PARTICIPANT,
  },
];

const GENERIC_SHAPE_NODE_TYPES = new Set<string>([
  NodeType.START,
  NodeType.PROCESS,
  NodeType.DECISION,
  NodeType.END,
  NodeType.CUSTOM,
  NodeType.GROUP,
  NodeType.SWIMLANE,
]);

const GENERIC_ICON_NODE_TYPES = new Set<string>([
  NodeType.START,
  NodeType.PROCESS,
  NodeType.DECISION,
  NodeType.END,
  NodeType.CUSTOM,
  NodeType.GROUP,
  NodeType.SWIMLANE,
]);

const GENERIC_COLOR_NODE_TYPES = new Set<string>([
  NodeType.START,
  NodeType.PROCESS,
  NodeType.DECISION,
  NodeType.END,
  NodeType.CUSTOM,
  NodeType.ANNOTATION,
  NodeType.SECTION,
  NodeType.GROUP,
  NodeType.SWIMLANE,
  NodeType.TEXT,
]);

const ADVANCED_COLOR_NODE_TYPES = new Set<string>([
  NodeType.START,
  NodeType.PROCESS,
  NodeType.DECISION,
  NodeType.END,
  NodeType.CUSTOM,
  NodeType.ARCHITECTURE,
  NodeType.MINDMAP,
]);

function isIconAssetNode(node: Node<NodeData>): boolean {
  return node.data?.assetPresentation === 'icon';
}

function getNodeFamilyId(node: Node<NodeData>): NodeFamilyId {
  if (node.data?.assetPresentation === 'icon') {
    return 'asset';
  }

  switch (node.type) {
    case NodeType.ARCHITECTURE:
      return 'architecture';
    case NodeType.MINDMAP:
      return 'mindmap';
    case NodeType.JOURNEY:
      return 'journey';
    case NodeType.CLASS:
      return 'class';
    case NodeType.ER_ENTITY:
      return 'entity';
    case NodeType.SEQUENCE_PARTICIPANT:
      return 'sequence';
    case NodeType.BROWSER:
    case NodeType.MOBILE:
      return 'wireframe';
    case NodeType.TEXT:
      return 'text';
    case NodeType.ANNOTATION:
      return 'annotation';
    case NodeType.IMAGE:
      return 'image';
    case NodeType.SECTION:
      return 'section';
    default:
      return 'generic';
  }
}

function copyAllowedKeys(
  target: Partial<NodeData>,
  source: Partial<NodeData>,
  keys: readonly (keyof NodeData)[]
): void {
  for (const key of keys) {
    if (key in source) {
      target[key] = source[key];
    }
  }
}

export function getNodeBulkEditCapabilities(
  node: Node<NodeData>
): Set<BulkEditableCapability> {
  return new Set(
    BULK_CAPABILITY_RULES.filter((rule) => rule.supports(node)).map((rule) => rule.capability)
  );
}

export function getBulkSelectionFamilySummary(
  nodes: Array<Node<NodeData>>
): BulkSelectionFamilySummary[] {
  const counts = new Map<NodeFamilyId, number>();

  for (const node of nodes) {
    const familyId = getNodeFamilyId(node);
    counts.set(familyId, (counts.get(familyId) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([id, count]) => ({
      id,
      label: NODE_FAMILY_LABELS[id],
      count,
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

export function getCapabilityTargetNodeIds(
  nodes: Array<Node<NodeData>>,
  capability: BulkEditableCapability
): string[] {
  return nodes
    .filter((node) => getNodeBulkEditCapabilities(node).has(capability))
    .map((node) => node.id);
}

export function getScopedSectionTitle(
  title: string,
  supportedCount: number,
  totalCount: number
): string {
  if (supportedCount === totalCount) {
    return title;
  }

  return `${title} (${supportedCount}/${totalCount})`;
}

export function filterBulkUpdatesForNode(
  node: Node<NodeData>,
  updates: Partial<NodeData>
): Partial<NodeData> {
  const filteredUpdates: Partial<NodeData> = {};

  for (const rule of BULK_CAPABILITY_RULES) {
    if (!rule.supports(node)) {
      continue;
    }

    copyAllowedKeys(filteredUpdates, updates, rule.keys);
  }

  return filteredUpdates;
}

export function getBulkAffectedNodeCount(
  nodes: Array<Node<NodeData>>,
  updates: Partial<NodeData>,
  labelOptions?: BulkLabelTransformOptions
): number {
  const hasLabelTransforms = Boolean(labelOptions?.labelPrefix || labelOptions?.labelSuffix);
  const hasFindReplace = Boolean(labelOptions?.labelFindReplace?.find);

  return nodes.filter((node) => {
    const filteredUpdates = filterBulkUpdatesForNode(node, updates);
    return Object.keys(filteredUpdates).length > 0 || hasLabelTransforms || hasFindReplace;
  }).length;
}
