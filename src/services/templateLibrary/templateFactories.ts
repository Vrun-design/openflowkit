import { createDefaultEdge } from '@/constants';
import { createProviderIconData } from '@/lib/nodeIconState';
import { NodeType, type FlowNode, type NodeData } from '@/lib/types';
import type { TemplateManifest } from './types';

export type TemplateCategory =
  | 'flowchart'
  | 'architecture'
  | 'aws'
  | 'azure'
  | 'cncf'
  | 'mindmap'
  | 'journey'
  | 'wireframe'
  | 'sequence';

export type ProviderKey = 'aws' | 'azure' | 'cncf';

export const PROVIDER_PACK_IDS: Record<ProviderKey, string> = {
  aws: 'aws-official-starter-v1',
  azure: 'azure-official-icons-v20',
  cncf: 'cncf-artwork-icons-v1',
};

export function createFlowNode(
  id: string,
  type: NodeType,
  label: string,
  x: number,
  y: number,
  color: string,
  options: Partial<NodeData> = {}
): FlowNode {
  return { id, type, position: { x, y }, data: { label, color, ...options } };
}

export function createAssetNode(
  id: string,
  provider: ProviderKey,
  label: string,
  category: string,
  shapeId: string,
  x: number,
  y: number
): FlowNode {
  return {
    id,
    type: NodeType.CUSTOM,
    position: { x, y },
    data: {
      label,
      color: 'custom',
      customColor: '#ffffff',
      assetPresentation: 'icon',
      ...createProviderIconData({
        packId: PROVIDER_PACK_IDS[provider],
        shapeId,
        provider,
        category,
      }),
    },
  };
}

export function createArchitectureNode(
  id: string,
  label: string,
  resourceType: string,
  icon: string,
  color: string,
  x: number,
  y: number,
  subLabel: string
): FlowNode {
  return {
    id,
    type: NodeType.ARCHITECTURE,
    position: { x, y },
    data: {
      label,
      subLabel,
      icon,
      color,
      archProvider: 'custom',
      archEnvironment: 'default',
      archResourceType: resourceType,
    },
  };
}

export function createMindmapNode(
  id: string,
  label: string,
  x: number,
  y: number,
  options: Partial<NodeData> = {}
): FlowNode {
  return {
    id,
    type: NodeType.MINDMAP,
    position: { x, y },
    data: { label, color: 'slate', shape: 'rounded', mindmapBranchStyle: 'curved', ...options },
  };
}

export function createJourneyNode(
  id: string,
  label: string,
  actor: string,
  section: string,
  score: number,
  x: number,
  y: number
): FlowNode {
  return {
    id,
    type: NodeType.JOURNEY,
    position: { x, y },
    data: {
      label,
      subLabel: actor,
      color: 'violet',
      journeySection: section,
      journeyTask: label,
      journeyActor: actor,
      journeyScore: score,
    },
  };
}

export function createWireframeNode(
  id: string,
  type: 'browser' | 'mobile',
  label: string,
  variant: string,
  x: number,
  y: number
): FlowNode {
  return { id, type, position: { x, y }, data: { label, color: 'slate', variant } };
}

export function createTemplate(
  id: string,
  name: string,
  description: string,
  category: TemplateCategory,
  tags: string[],
  nodes: FlowNode[],
  edges = [] as ReturnType<typeof createDefaultEdge>[],
  metadata: Pick<
    TemplateManifest,
    | 'audience'
    | 'useCase'
    | 'launchPriority'
    | 'featured'
    | 'difficulty'
    | 'outcome'
    | 'replacementHints'
    | 'previewVariant'
  >
): TemplateManifest {
  return { id, name, description, category, tags, ...metadata, graph: { nodes, edges } };
}
