import type { Connection } from '@/lib/reactflowCompat';
import type { FlowEdge, FlowNode, NodeData } from '@/lib/types';
import { createMindmapEdge, DEFAULT_EDGE_OPTIONS, NODE_HEIGHT, NODE_WIDTH } from '@/constants';
import { getNodeHandleIdForSide, handleIdToSide, type HandleSide } from '@/lib/nodeHandles';
import { NODE_DEFAULTS } from '@/theme';
import { createGenericShapeNode, createMindmapTopicNode } from '@/hooks/node-operations/utils';
import { getGenericShapeColor, isGenericShapeType } from '@/lib/genericShapePolicy';
import { createId } from '@/lib/id';
import { getDefaultConnectedNodeSpec, resolveMindmapChildSide, shouldBypassConnectMenu } from '@/lib/connectCreationPolicy';
import { relayoutMindmapComponent, resolveMindmapBranchStyleForNode } from '@/lib/mindmapLayout';

const OPPOSITE_HANDLE_SIDE: Record<HandleSide, HandleSide> = {
    right: 'left',
    left: 'right',
    top: 'bottom',
    bottom: 'top',
};

interface AddedNodeContentLabels {
    noteLabel: string;
    noteSubLabel: string;
}

interface AddedNodeContent {
    label: string;
    subLabel: string;
    icon?: string;
}

interface ClosestHandleTarget {
    nodeId: string;
    handleId: string;
    dist: number;
}

interface BuildConnectedNodeParams {
    type: string;
    position: { x: number; y: number };
    shape?: NodeData['shape'];
    labels: AddedNodeContentLabels;
}

interface BuildConnectedMindmapTopicParams {
    nodes: FlowNode[];
    edges: FlowEdge[];
    sourceNode: FlowNode;
    sourceHandle: string | null;
    sourceId: string;
    position: { x: number; y: number };
}

interface BuiltConnectedMindmapTopic {
    insertedEdge: FlowEdge;
    nextNode: FlowNode;
    nextNodes: FlowNode[];
}

type ConnectEndResolution =
    | { type: 'connect'; connection: Connection }
    | {
        type: 'add';
        nodeType: string;
        shape?: NodeData['shape'];
        position: { x: number; y: number };
      }
    | {
        type: 'menu';
        clientPosition: { x: number; y: number };
        sourceType: string | null;
      }
    | { type: 'none' };

export function getOppositeTargetHandle(node: FlowNode, sourceHandle: string | null): string | null {
    if (!sourceHandle) {
        return null;
    }

    const sourceSide = handleIdToSide(sourceHandle);
    if (!sourceSide) {
        return null;
    }

    return getNodeHandleIdForSide(node, OPPOSITE_HANDLE_SIDE[sourceSide]);
}

export function isDuplicateConnection(edges: FlowEdge[], connection: Connection): boolean {
    return edges.some((edge) =>
        edge.source === connection.source &&
        edge.target === connection.target &&
        edge.sourceHandle === connection.sourceHandle &&
        edge.targetHandle === connection.targetHandle
    );
}

export function findClosestHandleTarget(
    nodes: FlowNode[],
    position: { x: number; y: number },
    maxDistance = 50
): ClosestHandleTarget | null {
    let closestHandle: ClosestHandleTarget | null = null;

    nodes.forEach((node) => {
        const handlePoints = [
            { side: 'top' as const, x: node.position.x + NODE_WIDTH / 2, y: node.position.y },
            { side: 'bottom' as const, x: node.position.x + NODE_WIDTH / 2, y: node.position.y + NODE_HEIGHT },
            { side: 'left' as const, x: node.position.x, y: node.position.y + NODE_HEIGHT / 2 },
            { side: 'right' as const, x: node.position.x + NODE_WIDTH, y: node.position.y + NODE_HEIGHT / 2 },
        ];

        handlePoints.forEach((handlePoint) => {
            const dist = Math.sqrt((handlePoint.x - position.x) ** 2 + (handlePoint.y - position.y) ** 2);
            if (dist < maxDistance && (!closestHandle || dist < closestHandle.dist)) {
                closestHandle = {
                    nodeId: node.id,
                    handleId: getNodeHandleIdForSide(node, handlePoint.side),
                    dist,
                };
            }
        });
    });

    return closestHandle;
}

export function getAddedNodeContent(type: string, labels: AddedNodeContentLabels): AddedNodeContent {
    if (type === 'journey') {
        return {
            label: 'User Journey',
            subLabel: 'User',
        };
    }

    if (type === 'annotation') {
        return {
            label: labels.noteLabel,
            subLabel: labels.noteSubLabel,
            icon: 'StickyNote',
        };
    }

    return {
        label: '',
        subLabel: '',
    };
}

export function buildConnectedNode({
    type,
    position,
    shape,
    labels,
}: BuildConnectedNodeParams): { newNode: FlowNode; isGenericShape: boolean } {
    const id = createId();
    const defaultStyle = NODE_DEFAULTS[type] || NODE_DEFAULTS.process;
    const isGenericShape = isGenericShapeType(type);
    const nodeContent = getAddedNodeContent(type, labels);

    if (type === 'journey') {
        return {
            newNode: {
                id,
                position,
                data: {
                    label: nodeContent.label,
                    subLabel: nodeContent.subLabel,
                    color: 'violet',
                    shape: (shape || defaultStyle?.shape) as NodeData['shape'],
                    journeySection: 'General',
                    journeyTask: 'User Journey',
                    journeyActor: 'User',
                    journeyScore: 3,
                },
                type,
            },
            isGenericShape,
        };
    }

    return {
        newNode: createGenericShapeNode(id, position, {
            type,
            label: nodeContent.label,
            subLabel: nodeContent.subLabel,
            icon: isGenericShape
                ? undefined
                : defaultStyle?.icon && defaultStyle.icon !== 'none'
                    ? defaultStyle.icon
                    : nodeContent.icon,
            color: getGenericShapeColor(type, shape, defaultStyle?.color),
            shape: (shape || defaultStyle?.shape) as NodeData['shape'],
        }),
        isGenericShape,
    };
}

export function buildConnectedEdge(
    sourceId: string,
    targetId: string,
    sourceHandle: string | null,
    targetHandle: string | null
): FlowEdge {
    return {
        id: `e-${sourceId}-${targetId}`,
        source: sourceId,
        sourceHandle,
        target: targetId,
        targetHandle,
        ...DEFAULT_EDGE_OPTIONS,
    };
}

export function buildConnectedMindmapTopic({
    nodes,
    edges,
    sourceNode,
    sourceHandle,
    sourceId,
    position,
}: BuildConnectedMindmapTopicParams): BuiltConnectedMindmapTopic {
    const parentDepth = typeof sourceNode.data?.mindmapDepth === 'number' ? sourceNode.data.mindmapDepth : 0;
    const preferredSide = resolveMindmapChildSide(parentDepth, sourceNode.data?.mindmapSide, sourceHandle);
    const branchStyle = resolveMindmapBranchStyleForNode(sourceId, nodes);
    const nextNode = createMindmapTopicNode({
        id: createId('mm'),
        position,
        depth: parentDepth + 1,
        parentId: sourceId,
        side: preferredSide,
        branchStyle,
        layerId: typeof sourceNode.data?.layerId === 'string' ? sourceNode.data.layerId : undefined,
    });
    const insertedEdge = createMindmapEdge(sourceNode, nextNode, undefined, undefined, branchStyle);
    const nextNodes = relayoutMindmapComponent(
        [
            ...nodes.map((node) => ({ ...node, selected: false })),
            nextNode,
        ],
        edges.concat(insertedEdge),
        sourceId
    );

    return {
        insertedEdge,
        nextNode,
        nextNodes,
    };
}

interface ResolveConnectEndActionParams {
    nodes: FlowNode[];
    edges: FlowEdge[];
    sourceId: string;
    sourceHandle: string | null;
    position: { x: number; y: number };
    clientPosition: { x: number; y: number };
    targetIsPane: boolean;
    canvasInteractionsV1Enabled: boolean;
}

export function resolveConnectEndAction({
    nodes,
    edges,
    sourceId,
    sourceHandle,
    position,
    clientPosition,
    targetIsPane,
    canvasInteractionsV1Enabled,
}: ResolveConnectEndActionParams): ConnectEndResolution {
    const closestHandle = findClosestHandleTarget(nodes, position);

    if (closestHandle) {
        const connection: Connection = {
            source: sourceId,
            sourceHandle,
            target: closestHandle.nodeId,
            targetHandle: closestHandle.handleId,
        };

        if (isDuplicateConnection(edges, connection)) {
            return { type: 'none' };
        }

        return { type: 'connect', connection };
    }

    if (!targetIsPane) {
        return { type: 'none' };
    }

    const sourceNode = nodes.find((node) => node.id === sourceId);
    if (canvasInteractionsV1Enabled || shouldBypassConnectMenu(sourceNode?.type)) {
        const defaultConnectedNode = getDefaultConnectedNodeSpec(sourceNode?.type);
        return {
            type: 'add',
            nodeType: defaultConnectedNode.type,
            shape: defaultConnectedNode.shape,
            position,
        };
    }

    return {
        type: 'menu',
        clientPosition,
        sourceType: sourceNode?.type ?? null,
    };
}
