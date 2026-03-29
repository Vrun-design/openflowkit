import type { FlowEdge, FlowNode, NodeData, EdgeData } from './types';
import { TEMPLATE_DEFINITIONS, type ArchitectureTemplateId } from './architectureTemplateData';

export type { ArchitectureTemplateId } from './architectureTemplateData';

type InheritedArchitectureData = Pick<
  NodeData,
  'archProvider' | 'archEnvironment' | 'archBoundaryId' | 'archZone' | 'archTrustDomain'
>;

export interface ArchitectureTemplateOption {
  id: ArchitectureTemplateId;
  label: string;
  description: string;
}

export interface BuiltArchitectureTemplate {
  sourceData: Partial<NodeData>;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export function getArchitectureTemplateOptions(): ArchitectureTemplateOption[] {
  return TEMPLATE_DEFINITIONS.map(({ id, label, description }) => ({ id, label, description }));
}

function resolveInheritedArchitectureData(
  sourceNode: FlowNode,
  anchor: Partial<NodeData>
): InheritedArchitectureData {
  return {
    archProvider: sourceNode.data.archProvider || anchor.archProvider || 'custom',
    archEnvironment: sourceNode.data.archEnvironment || 'default',
    archBoundaryId: sourceNode.data.archBoundaryId,
    archZone: sourceNode.data.archZone,
    archTrustDomain: sourceNode.data.archTrustDomain,
  };
}

function createTemplateEdge(
  id: string,
  source: string,
  target: string,
  label: string | undefined,
  data: Partial<EdgeData> | undefined
): FlowEdge {
  return { id, source, target, label, type: 'default', animated: false, data };
}

export function buildArchitectureTemplate(
  templateId: ArchitectureTemplateId,
  sourceNode: FlowNode,
  createNodeId: (key: string) => string,
  createEdgeId: (key: string) => string
): BuiltArchitectureTemplate | null {
  const template = TEMPLATE_DEFINITIONS.find((candidate) => candidate.id === templateId);
  if (!template) return null;

  const inheritedData = resolveInheritedArchitectureData(sourceNode, template.anchor);
  const nodeIdByKey = new Map<string, string>([['source', sourceNode.id]]);
  const nodes = template.nodes.map((definition) => {
    const id = createNodeId(definition.key);
    nodeIdByKey.set(definition.key, id);
    return {
      id,
      type: 'architecture' as const,
      position: {
        x: sourceNode.position.x + definition.offsetX,
        y: sourceNode.position.y + definition.offsetY,
      },
      data: { ...sourceNode.data, ...definition.data, ...inheritedData },
      selected: false,
    } satisfies FlowNode;
  });

  const edges = template.edges.map((definition, index) => {
    const source = nodeIdByKey.get(definition.source);
    const target = nodeIdByKey.get(definition.target);
    if (!source || !target) {
      throw new Error(
        `Architecture template "${templateId}" has an invalid edge definition at index ${index}.`
      );
    }
    return createTemplateEdge(
      createEdgeId(`${definition.source}-${definition.target}`),
      source,
      target,
      definition.label,
      definition.data
    );
  });

  return { sourceData: { ...template.anchor, ...inheritedData }, nodes, edges };
}
