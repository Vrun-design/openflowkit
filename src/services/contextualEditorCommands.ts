import {
  applyArchitectureDirection,
  getDirectionFromMarkers,
  reverseArchitectureDirection,
} from '@/components/properties/edge/architectureSemantics';
import type { EdgeData, FlowEdge, FlowNode } from '@/lib/types';
import { alignNodes, distributeNodes } from './AlignDistribute';

export type AlignDirection = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
export type DistributeDirection = 'horizontal' | 'vertical';
export type ContextualEditorCommand =
  | { readonly kind: 'align'; readonly direction: AlignDirection }
  | { readonly kind: 'distribute'; readonly direction: DistributeDirection }
  | { readonly kind: 'z-order'; readonly direction: 'front' | 'back' }
  | { readonly kind: 'reverse-connectors' };

export interface ContextualEditorGraph {
  readonly nodes: readonly FlowNode[];
  readonly edges: readonly FlowEdge[];
  readonly selectedNodeId: string | null;
  readonly selectedEdgeId: string | null;
}

export interface ContextualCommandDefinition {
  readonly id: string;
  readonly command: ContextualEditorCommand;
  readonly keywords: readonly string[];
}

export interface ContextualCommandResult {
  readonly nodes: FlowNode[];
  readonly edges: FlowEdge[];
}

export const CONTEXTUAL_COMMAND_DEFINITIONS: readonly ContextualCommandDefinition[] = [
  ...(['left', 'center', 'right', 'top', 'middle', 'bottom'] as const).map((direction) => ({
    id: `context-align-${direction}`,
    command: { kind: 'align' as const, direction },
    keywords: ['selection', 'arrange', 'position', direction],
  })),
  ...(['horizontal', 'vertical'] as const).map((direction) => ({
    id: `context-distribute-${direction}`,
    command: { kind: 'distribute' as const, direction },
    keywords: ['selection', 'arrange', 'space evenly', direction],
  })),
  {
    id: 'context-bring-to-front',
    command: { kind: 'z-order', direction: 'front' },
    keywords: ['selection', 'layer', 'z order', 'raise'],
  },
  {
    id: 'context-send-to-back',
    command: { kind: 'z-order', direction: 'back' },
    keywords: ['selection', 'layer', 'z order', 'lower'],
  },
  {
    id: 'context-reverse-connectors',
    command: { kind: 'reverse-connectors' },
    keywords: ['selection', 'edge', 'connector', 'swap source target'],
  },
];

function selectedNodes(graph: ContextualEditorGraph): FlowNode[] {
  return graph.nodes.filter((node) => node.selected === true || node.id === graph.selectedNodeId);
}

function selectedEdges(graph: ContextualEditorGraph): FlowEdge[] {
  return graph.edges.filter((edge) => edge.selected === true || edge.id === graph.selectedEdgeId);
}

interface SelectionContext {
  readonly nodeCount: number;
  readonly edgeCount: number;
}

function selectionContext(graph: ContextualEditorGraph): SelectionContext {
  return {
    nodeCount: selectedNodes(graph).length,
    edgeCount: selectedEdges(graph).length,
  };
}

function isAvailableInContext(
  context: SelectionContext,
  command: ContextualEditorCommand
): boolean {
  if (command.kind === 'reverse-connectors') return context.edgeCount > 0;
  if (command.kind === 'distribute') return context.nodeCount >= 3;
  if (command.kind === 'align') return context.nodeCount >= 2;
  return context.nodeCount > 0;
}

export function isContextualCommandAvailable(
  graph: ContextualEditorGraph,
  command: ContextualEditorCommand
): boolean {
  return isAvailableInContext(selectionContext(graph), command);
}

export function listAvailableContextualCommands(
  graph: ContextualEditorGraph
): readonly ContextualCommandDefinition[] {
  const context = selectionContext(graph);
  return CONTEXTUAL_COMMAND_DEFINITIONS.filter((definition) =>
    isAvailableInContext(context, definition.command)
  );
}

function mergeSelectedNodeUpdates(
  nodes: readonly FlowNode[],
  updatedSelection: readonly FlowNode[]
): FlowNode[] | null {
  const updatesById = new Map(updatedSelection.map((node) => [node.id, node]));
  let changed = false;
  const nextNodes = nodes.map((node) => {
    const update = updatesById.get(node.id);
    if (!update) return node;
    if (
      update.position.x === node.position.x &&
      update.position.y === node.position.y &&
      update.zIndex === node.zIndex
    ) {
      return node;
    }
    changed = true;
    return update;
  });
  return changed ? nextNodes : null;
}

function applyZOrder(
  nodes: readonly FlowNode[],
  selected: readonly FlowNode[],
  direction: 'front' | 'back'
): FlowNode[] {
  const selectedIds = new Set(selected.map((node) => node.id));
  const unselectedZ = nodes
    .filter((node) => !selectedIds.has(node.id))
    .map((node) => node.zIndex ?? 0);
  const boundary =
    direction === 'front' ? Math.max(0, ...unselectedZ) : Math.min(0, ...unselectedZ);
  const ordered = [...selected].sort(
    (left, right) => (left.zIndex ?? 0) - (right.zIndex ?? 0) || left.id.localeCompare(right.id)
  );
  const zById = new Map(
    ordered.map((node, index) => [
      node.id,
      direction === 'front' ? boundary + index + 1 : boundary - ordered.length + index,
    ])
  );
  return nodes.map((node) => (zById.has(node.id) ? { ...node, zIndex: zById.get(node.id) } : node));
}

function reverseSelectedConnectors(
  edges: readonly FlowEdge[],
  selected: readonly FlowEdge[]
): FlowEdge[] {
  const selectedIds = new Set(selected.map((edge) => edge.id));
  return edges.map((edge) => {
    if (!selectedIds.has(edge.id)) return edge;
    const edgeData = (edge.data ?? {}) as EdgeData;
    const currentDirection = edgeData.archDirection || getDirectionFromMarkers(edge);
    const reversedDirection = reverseArchitectureDirection(currentDirection);
    const architectureEdge = edgeData.archDirection
      ? {
          ...edge,
          data: {
            ...edgeData,
            archDirection: reversedDirection,
            archSourceSide: edgeData.archTargetSide,
            archTargetSide: edgeData.archSourceSide,
          },
        }
      : edge;
    return {
      ...edge,
      source: edge.target,
      target: edge.source,
      sourceHandle: edge.targetHandle,
      targetHandle: edge.sourceHandle,
      ...applyArchitectureDirection(architectureEdge, reversedDirection),
    };
  });
}

export function applyContextualEditorCommand(
  graph: ContextualEditorGraph,
  command: ContextualEditorCommand
): ContextualCommandResult | null {
  if (!isContextualCommandAvailable(graph, command)) return null;

  if (command.kind === 'reverse-connectors') {
    return {
      nodes: [...graph.nodes],
      edges: reverseSelectedConnectors(graph.edges, selectedEdges(graph)),
    };
  }

  const selection = selectedNodes(graph);
  if (command.kind === 'z-order') {
    return {
      nodes: applyZOrder(graph.nodes, selection, command.direction),
      edges: [...graph.edges],
    };
  }
  const updatedSelection =
    command.kind === 'align'
      ? alignNodes(selection, command.direction)
      : distributeNodes(selection, command.direction);
  const nodes = mergeSelectedNodeUpdates(graph.nodes, updatedSelection);
  return nodes ? { nodes, edges: [...graph.edges] } : null;
}
