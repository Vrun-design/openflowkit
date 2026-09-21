import { createDefaultEdge } from '@/constants';
import { SECTION_MIN_HEIGHT, SECTION_MIN_WIDTH } from '@/lib/sectionBounds';
import { clearNodeParent, setNodeParent } from '@/lib/nodeParent';
import { getNodeHandleIdForSide, type HandleSide } from '@/lib/nodeHandles';
import type { FlowEdge, FlowNode, NodeData } from '@/lib/types';
import { estimateWrappedTextBox } from '@/services/elk-layout/textSizing';
import {
  attachMermaidImportedEdgeMetadata,
  attachMermaidImportedNodeMetadata,
} from './importProvenance';

// Width for imported leaf nodes. Mermaid's renderer does not wrap labels, so
// the upper bound is set generously to keep typical flowchart labels on a
// single line (matching Mermaid's visual output); wrapping still kicks in for
// very long labels so individual nodes don't stretch the layout.
const IMPORT_LEAF_MAX_WIDTH = 320;
const IMPORT_LEAF_MIN_WIDTH = 120;

export interface MermaidImportSceneNode {
  id: string;
  kind: 'leaf' | 'container';
  label: string;
  parentId?: string;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  sourceNode?: FlowNode;
  /** Mermaid vertex shape type (e.g. 'square', 'round', 'diamond', 'hexagon') */
  mermaidShapeType?: string;
}

export interface MermaidImportSceneEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  stroke?: 'normal' | 'thick' | 'dotted';
  routePath?: string;
  routePoints?: { x: number; y: number }[];
}

export interface MermaidImportScene {
  nodes: MermaidImportSceneNode[];
  edges: MermaidImportSceneEdge[];
}

type NodeShape =
  | 'rectangle'
  | 'rounded'
  | 'capsule'
  | 'diamond'
  | 'hexagon'
  | 'cylinder'
  | 'ellipse'
  | 'parallelogram'
  | 'circle';

/**
 * Maps a Mermaid flowchart vertex type string to our NodeShape.
 * Mermaid type names come from the flowchart parser's vertex.type field.
 */
function mermaidVertexTypeToShape(mermaidType: string | undefined): NodeShape {
  switch (mermaidType) {
    case 'square':
      return 'rectangle';
    case 'round':
      return 'rounded';
    case 'diamond':
      return 'diamond';
    case 'hexagon':
      return 'hexagon';
    case 'stadium':
    case 'pill':
      return 'capsule';
    case 'cylinder':
      return 'cylinder';
    case 'subroutine': // double-border rectangle → plain rectangle
      return 'rectangle';
    case 'circle':
    case 'double_circle':
      return 'circle';
    case 'lean_right':
    case 'lean_left':
    case 'odd':
      return 'parallelogram';
    case 'trapezoid':
    case 'inv_trapezoid':
    case 'notch_rect':
    case 'taggedRect':
    case 'taggedWaveEdgeRect':
    case 'waveEdgeRect':
    default:
      return 'rounded';
  }
}

function getHandleSideFromVector(dx: number, dy: number): HandleSide {
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'right' : 'left';
  }

  return dy >= 0 ? 'bottom' : 'top';
}

function getOppositeHandleSide(side: HandleSide): HandleSide {
  switch (side) {
    case 'left':
      return 'right';
    case 'right':
      return 'left';
    case 'top':
      return 'bottom';
    case 'bottom':
      return 'top';
  }
}

function normalizeSceneNodePositions(nodes: MermaidImportSceneNode[]): MermaidImportSceneNode[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const relativePositionById = new Map<string, { x: number; y: number }>();

  function getRelativePosition(node: MermaidImportSceneNode): { x: number; y: number } {
    const cached = relativePositionById.get(node.id);
    if (cached) {
      return cached;
    }

    if (!node.parentId) {
      const absolutePosition = { ...node.position };
      relativePositionById.set(node.id, absolutePosition);
      return absolutePosition;
    }

    const parentNode = nodeById.get(node.parentId);
    if (!parentNode) {
      const absolutePosition = { ...node.position };
      relativePositionById.set(node.id, absolutePosition);
      return absolutePosition;
    }

    const parentAbsolutePosition = parentNode.position;
    const relativePosition = {
      x: node.position.x - parentAbsolutePosition.x,
      y: node.position.y - parentAbsolutePosition.y,
    };
    relativePositionById.set(node.id, relativePosition);
    return relativePosition;
  }

  return nodes.map((node) => ({
    ...node,
    position: getRelativePosition(node),
  }));
}

function orderSceneNodesForProjection(nodes: MermaidImportSceneNode[]): MermaidImportSceneNode[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const depthCache = new Map<string, number>();

  function getDepth(node: MermaidImportSceneNode): number {
    const cached = depthCache.get(node.id);
    if (cached !== undefined) {
      return cached;
    }

    const parentNode = node.parentId ? nodeById.get(node.parentId) : undefined;
    const depth = parentNode ? getDepth(parentNode) + 1 : 0;
    depthCache.set(node.id, depth);
    return depth;
  }

  return [...nodes].sort((left, right) => {
    const depthDelta = getDepth(left) - getDepth(right);
    if (depthDelta !== 0) {
      return depthDelta;
    }

    if (left.kind !== right.kind) {
      return left.kind === 'container' ? -1 : 1;
    }

    return left.id.localeCompare(right.id);
  });
}

function applyNodeParent(node: FlowNode, parentId: string | undefined): FlowNode {
  if (parentId) {
    return setNodeParent(node, parentId, { constrainToParent: false });
  }

  return clearNodeParent(node);
}

function buildMermaidImportedVisualData(
  sceneNode: MermaidImportSceneNode,
  sourceNodeData: NodeData | undefined,
  color: 'white' | 'slate',
  mappedShape?: NodeShape
): NodeData {
  return {
    ...(sourceNodeData ?? {}),
    label: sceneNode.label,
    subLabel: '',
    color,
    colorMode: 'subtle',
    ...(mappedShape ? { shape: mappedShape } : {}),
    customColor: undefined,
    backgroundColor: undefined,
    icon: undefined,
    customIconUrl: undefined,
    assetPresentation: undefined,
    assetProvider: undefined,
    assetCategory: undefined,
    archIconPackId: undefined,
    archIconShapeId: undefined,
  };
}

function buildMermaidImportedLeafData(
  sceneNode: MermaidImportSceneNode,
  sourceNodeData: NodeData | undefined,
  mappedShape?: NodeShape
): NodeData {
  return buildMermaidImportedVisualData(sceneNode, sourceNodeData, 'white', mappedShape);
}

function buildMermaidImportedContainerData(
  sceneNode: MermaidImportSceneNode,
  sourceNodeData: NodeData | undefined
): NodeData {
  return {
    ...buildMermaidImportedVisualData(sceneNode, sourceNodeData, 'slate'),
    sectionSizingMode: 'manual',
  };
}

function createLeafNode(sceneNode: MermaidImportSceneNode): FlowNode {
  const mappedShape = mermaidVertexTypeToShape(sceneNode.mermaidShapeType);
  const baseNode: FlowNode = {
    id: sceneNode.id,
    position: { x: 0, y: 0 },
    type: 'process',
    data: { label: sceneNode.label, subLabel: '', color: 'slate', shape: mappedShape },
  };

  const nextNode = applyNodeParent(baseNode, sceneNode.parentId);
  // Width comes from text estimation so labels wrap vertically rather than
  // expanding the node horizontally. Height is intentionally omitted — React
  // Flow measures it from the rendered content, giving each node the correct
  // height for its number of wrapped lines. When Mermaid's renderer measured
  // a wider rect than our estimate (e.g. a long single-word label), take the
  // larger value so the node visually matches Mermaid.
  const { width: estimatedWidth } = estimateWrappedTextBox(sceneNode.label, {
    minWidth: IMPORT_LEAF_MIN_WIDTH,
    maxWidth: IMPORT_LEAF_MAX_WIDTH,
  });
  const mermaidWidth =
    typeof sceneNode.width === 'number' && sceneNode.width > estimatedWidth
      ? Math.min(sceneNode.width, IMPORT_LEAF_MAX_WIDTH)
      : estimatedWidth;
  return attachMermaidImportedNodeMetadata({
    ...nextNode,
    position: { ...sceneNode.position },
    data: buildMermaidImportedLeafData(sceneNode, nextNode.data, mappedShape),
    style: { ...nextNode.style, width: mermaidWidth },
  }, {
    role: 'leaf',
    source: 'official-flowchart',
    fidelity: 'renderer-backed',
  });
}

function createContainerNode(sceneNode: MermaidImportSceneNode): FlowNode {
  const baseNode: FlowNode = {
    id: sceneNode.id,
    position: sceneNode.position,
    type: 'section',
    data: {
      label: sceneNode.label,
      subLabel: '',
      color: 'blue',
      sectionSizingMode: 'manual',
      sectionLayoutMode: 'freeform',
      sectionOrder: 0,
      sectionLocked: false,
      sectionHidden: false,
      sectionCollapsed: false,
    },
    style: { width: SECTION_MIN_WIDTH, height: SECTION_MIN_HEIGHT },
    zIndex: -1,
  };

  const nextNode = applyNodeParent(baseNode, sceneNode.parentId);
  return attachMermaidImportedNodeMetadata({
    ...nextNode,
    position: { ...sceneNode.position },
    data: buildMermaidImportedContainerData(sceneNode, nextNode.data),
    style:
      sceneNode.width && sceneNode.height
        ? { ...nextNode.style, width: sceneNode.width, height: sceneNode.height }
        : nextNode.style,
    zIndex: -1,
  }, {
    role: 'container',
    source: 'official-flowchart',
    fidelity: 'renderer-backed',
  });
}

function createSceneEdge(
  sceneEdge: MermaidImportSceneEdge,
  sceneNodeById: Map<string, MermaidImportSceneNode>
): FlowEdge {
  const sourceHandleSide =
    (sceneEdge.routePoints?.length ?? 0) >= 2
      ? getHandleSideFromVector(
          sceneEdge.routePoints![1].x - sceneEdge.routePoints![0].x,
          sceneEdge.routePoints![1].y - sceneEdge.routePoints![0].y
        )
      : undefined;
  const targetHandleSide =
    (sceneEdge.routePoints?.length ?? 0) >= 2
      ? getOppositeHandleSide(
          getHandleSideFromVector(
            sceneEdge.routePoints![sceneEdge.routePoints!.length - 1].x
              - sceneEdge.routePoints![sceneEdge.routePoints!.length - 2].x,
            sceneEdge.routePoints![sceneEdge.routePoints!.length - 1].y
              - sceneEdge.routePoints![sceneEdge.routePoints!.length - 2].y
          )
        )
      : undefined;
  const edge = createDefaultEdge(sceneEdge.source, sceneEdge.target, sceneEdge.label, sceneEdge.id);
  if (sourceHandleSide) {
    edge.sourceHandle = getNodeHandleIdForSide(sceneNodeById.get(sceneEdge.source)?.sourceNode, sourceHandleSide);
  }
  if (targetHandleSide) {
    edge.targetHandle = getNodeHandleIdForSide(sceneNodeById.get(sceneEdge.target)?.sourceNode, targetHandleSide);
  }
  if (sceneEdge.stroke === 'thick') {
    edge.style = { ...edge.style, strokeWidth: 4 };
  }
  if (sceneEdge.stroke === 'dotted') {
    edge.style = { ...edge.style, strokeDasharray: '5 3' };
  }
  if (sceneEdge.routePath || sceneEdge.routePoints) {
    edge.data = {
      ...edge.data,
      routingMode: 'import-fixed',
      importRoutePath: sceneEdge.routePath,
      importRoutePoints: sceneEdge.routePoints,
    };
  }
  return attachMermaidImportedEdgeMetadata(edge, {
    source: 'official-flowchart',
    fidelity: 'renderer-backed',
    hasFixedRoute: Boolean(sceneEdge.routePath || sceneEdge.routePoints),
    preferredSourceHandle: edge.sourceHandle,
    preferredTargetHandle: edge.targetHandle,
  });
}

export function projectMermaidImportScene(scene: MermaidImportScene): {
  nodes: FlowNode[];
  edges: FlowEdge[];
} {
  const normalizedNodes = orderSceneNodesForProjection(
    normalizeSceneNodePositions(scene.nodes)
  );
  const sceneNodeById = new Map(normalizedNodes.map((node) => [node.id, node]));

  return {
    nodes: normalizedNodes.map((node) =>
      node.kind === 'container' ? createContainerNode(node) : createLeafNode(node)
    ),
    edges: scene.edges.map((edge) => createSceneEdge(edge, sceneNodeById)),
  };
}
