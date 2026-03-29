import type { FlowNode, NodeData } from '@/lib/types';
import { NODE_DEFAULTS } from '@/theme';
import { SECTION_MIN_WIDTH, SECTION_MIN_HEIGHT, withSectionDefaults } from './sectionBounds';

interface CreateGenericShapeNodeOptions {
  type?: FlowNode['type'];
  label?: string;
  subLabel?: string;
  color?: string;
  shape?: NodeData['shape'];
  icon?: string;
  layerId?: string;
}

interface CreateMindmapTopicNodeOptions {
  id: string;
  position: { x: number; y: number };
  depth: number;
  parentId: string;
  side: 'left' | 'right';
  branchStyle: 'curved' | 'straight';
  layerId?: string;
}

interface CreateArchitectureServiceNodeOptions {
  id: string;
  position: { x: number; y: number };
  sourceNode: FlowNode;
  layerId: string;
}

export function createGenericShapeNode(
  id: string,
  position: { x: number; y: number },
  options: CreateGenericShapeNodeOptions = {}
): FlowNode {
  return {
    id,
    position,
    data: {
      label: options.label ?? '',
      subLabel: options.subLabel ?? '',
      color: options.color,
      shape: options.shape,
      icon: options.icon,
      layerId: options.layerId,
    },
    type: options.type ?? 'process',
  };
}

export function createProcessNode(
  id: string,
  position: { x: number; y: number },
  labels?: { label?: string; subLabel?: string }
): FlowNode {
  const defaults = NODE_DEFAULTS.process;
  return createGenericShapeNode(id, position, {
    type: 'process',
    label: labels?.label,
    subLabel: labels?.subLabel,
    color: defaults?.color || 'slate',
    shape: defaults?.shape as NodeData['shape'],
    icon: defaults?.icon && defaults.icon !== 'none' ? defaults.icon : undefined,
  });
}

export function createAnnotationNode(
  id: string,
  position: { x: number; y: number },
  labels: { label: string; subLabel: string }
): FlowNode {
  return {
    id,
    position,
    data: { label: labels.label, subLabel: labels.subLabel, color: 'yellow' },
    type: 'annotation',
  };
}

export function createSectionNode(
  id: string,
  position: { x: number; y: number },
  label: string
): FlowNode {
  return withSectionDefaults({
    id,
    position,
    data: {
      label,
      subLabel: '',
      color: 'blue',
      sectionSizingMode: 'manual',
      sectionLayoutMode: 'freeform',
      sectionOrder: 0,
      sectionLocked: false,
      sectionHidden: false,
      sectionCollapsed: false,
    },
    type: 'section',
    style: { width: SECTION_MIN_WIDTH, height: SECTION_MIN_HEIGHT },
    zIndex: -1,
  });
}

export function createTextNode(
  id: string,
  position: { x: number; y: number },
  label: string
): FlowNode {
  return {
    id,
    position,
    data: { label, subLabel: '', color: 'slate' },
    type: 'text',
  };
}

export function createImageNode(
  id: string,
  imageUrl: string,
  position: { x: number; y: number },
  label: string
): FlowNode {
  return {
    id,
    position,
    data: { label, imageUrl, transparency: 1, rotation: 0 },
    type: 'image',
    style: { width: 200, height: 200 },
  };
}

export function createClassNode(
  id: string,
  position: { x: number; y: number },
  label = 'ClassName'
): FlowNode {
  return {
    id,
    position,
    data: { label, color: 'slate', classStereotype: '', classAttributes: [], classMethods: [] },
    type: 'class',
  };
}

export function createEntityNode(
  id: string,
  position: { x: number; y: number },
  label = 'entity'
): FlowNode {
  return {
    id,
    position,
    data: { label, color: 'blue', erFields: [] },
    type: 'er_entity',
  };
}

export function createJourneyNode(
  id: string,
  position: { x: number; y: number },
  label = 'Step'
): FlowNode {
  return {
    id,
    position,
    data: {
      label,
      color: 'violet',
      journeySection: '',
      journeyActor: '',
      journeyTask: label,
      journeyScore: 3,
    },
    type: 'journey',
  };
}

export function createArchitectureNode(
  id: string,
  position: { x: number; y: number },
  label = 'Service'
): FlowNode {
  return {
    id,
    position,
    data: { label, color: 'blue', archProvider: 'aws', archResourceType: 'service' },
    type: 'architecture',
  };
}

export function createBrowserNode(
  id: string,
  position: { x: number; y: number },
  label = 'Page'
): FlowNode {
  return {
    id,
    position,
    data: { label, color: 'slate', icon: 'lock', variant: 'default' },
    type: 'browser',
    style: { width: 400, height: 300 },
  };
}

export function createMobileNode(
  id: string,
  position: { x: number; y: number },
  label = 'Screen'
): FlowNode {
  return {
    id,
    position,
    data: { label, color: 'slate', variant: 'default' },
    type: 'mobile',
    style: { width: 300, height: 600 },
  };
}

export function createSequenceParticipantNode(
  id: string,
  position: { x: number; y: number },
  label = 'Actor'
): FlowNode {
  return {
    id,
    position,
    data: { label, color: 'slate', seqParticipantKind: 'participant' },
    type: 'sequence_participant',
  };
}

export function createMindmapTopicNode({
  id,
  position,
  depth,
  parentId,
  side,
  branchStyle,
  layerId,
}: CreateMindmapTopicNodeOptions): FlowNode {
  return {
    id,
    type: 'mindmap',
    position,
    data: {
      label: 'New Topic',
      color: 'slate',
      shape: 'rounded',
      mindmapDepth: depth,
      mindmapParentId: parentId,
      mindmapSide: side,
      mindmapBranchStyle: branchStyle,
      layerId,
    },
    selected: true,
  };
}

export function createArchitectureServiceNode({
  id,
  position,
  sourceNode,
  layerId,
}: CreateArchitectureServiceNodeOptions): FlowNode {
  const sourceProvider = sourceNode.data?.archProvider || 'custom';

  return {
    id,
    type: 'architecture',
    position,
    data: {
      label: 'New Service',
      color: 'slate',
      shape: 'rectangle',
      icon: 'Server',
      archProvider: sourceProvider,
      archProviderLabel:
        sourceProvider === 'custom' ? sourceNode.data?.archProviderLabel : undefined,
      archResourceType: 'service',
      archEnvironment: sourceNode.data?.archEnvironment || 'default',
      archBoundaryId: sourceNode.data?.archBoundaryId,
      archZone: sourceNode.data?.archZone,
      archTrustDomain: sourceNode.data?.archTrustDomain,
      customIconUrl: sourceProvider === 'custom' ? sourceNode.data?.customIconUrl : undefined,
      archIconPackId: sourceProvider !== 'custom' ? sourceNode.data?.archIconPackId : undefined,
      archIconShapeId: sourceProvider !== 'custom' ? sourceNode.data?.archIconShapeId : undefined,
      layerId,
    },
    selected: true,
  };
}
