import type { FlowNode, NodeData } from '@/lib/types';
import { clearNodeParent, getNodeParentId, setNodeParent } from '@/lib/nodeParent';
import { NODE_DEFAULTS } from '@/theme';

export function getDefaultNodePosition(count: number, baseX: number, baseY: number): { x: number; y: number } {
    const columns = 4;
    const column = count % columns;
    const row = Math.floor(count / columns);
    return { x: baseX + column * 80, y: baseY + row * 80 };
}

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
    return {
        id,
        position,
        data: { label, subLabel: '', color: 'blue' },
        type: 'section',
        style: { width: 500, height: 400 },
        zIndex: -1,
    };
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
    return {
        id,
        type: 'architecture',
        position,
        data: {
            label: 'New Service',
            color: 'slate',
            shape: 'rectangle',
            icon: 'Server',
            archProvider: sourceNode.data?.archProvider || 'custom',
            archResourceType: 'service',
            archEnvironment: sourceNode.data?.archEnvironment || 'default',
            archBoundaryId: sourceNode.data?.archBoundaryId,
            archZone: sourceNode.data?.archZone,
            archTrustDomain: sourceNode.data?.archTrustDomain,
            layerId,
        },
        selected: true,
    };
}

export function getAbsoluteNodePosition(node: FlowNode, allNodes: FlowNode[]): { x: number; y: number } {
    let absoluteX = node.position.x;
    let absoluteY = node.position.y;
    let currentParentId = getNodeParentId(node);

    while (currentParentId) {
        const parentNode = allNodes.find((candidate) => candidate.id === currentParentId);
        if (!parentNode) {
            break;
        }
        absoluteX += parentNode.position.x;
        absoluteY += parentNode.position.y;
        currentParentId = getNodeParentId(parentNode);
    }

    return { x: absoluteX, y: absoluteY };
}

interface ReassignArchitectureNodeBoundaryParams {
    nodes: FlowNode[];
    nodeId: string;
    data: Partial<NodeData>;
}

export function reassignArchitectureNodeBoundary({
    nodes,
    nodeId,
    data,
}: ReassignArchitectureNodeBoundaryParams): FlowNode[] {
    const targetNode = nodes.find((node) => node.id === nodeId);
    if (!targetNode) {
        return nodes;
    }

    const rawBoundaryId = data.archBoundaryId;
    const hasBoundaryUpdate = typeof rawBoundaryId === 'string';
    if (targetNode.type !== 'architecture' || !hasBoundaryUpdate) {
        return nodes.map((node) => (
            node.id === nodeId
                ? { ...node, data: { ...node.data, ...data } }
                : node
        ));
    }

    const requestedBoundaryId = rawBoundaryId.trim();
    const absolutePosition = getAbsoluteNodePosition(targetNode, nodes);

    if (requestedBoundaryId.length === 0) {
        return nodes.map((node) => {
            if (node.id !== nodeId) {
                return node;
            }

            const nextNode = {
                ...node,
                position: absolutePosition,
                data: {
                    ...node.data,
                    ...data,
                    archBoundaryId: '',
                },
            } as FlowNode;
            return clearNodeParent(nextNode);
        });
    }

    const boundaryNode = nodes.find(
        (node) => node.id === requestedBoundaryId && node.type === 'section'
    );
    if (!boundaryNode) {
        return nodes.map((node) => (
            node.id === nodeId
                ? { ...node, data: { ...node.data, ...data } }
                : node
        ));
    }

    return nodes.map((node) => {
        if (node.id !== nodeId) {
            return node;
        }

        return setNodeParent({
            ...node,
            position: {
                x: absolutePosition.x - boundaryNode.position.x,
                y: absolutePosition.y - boundaryNode.position.y,
            },
            data: {
                ...node.data,
                ...data,
                archBoundaryId: boundaryNode.id,
            },
        }, boundaryNode.id);
    });
}

function findContainingSection(
    position: { x: number; y: number },
    draggedNodeId: string,
    allNodes: FlowNode[]
): FlowNode | null {
    const sectionNodes = allNodes.filter((node) => node.type === 'section' && node.id !== draggedNodeId);

    for (const section of sectionNodes) {
        const sectionWidth = (section.style?.width as number) || 500;
        const sectionHeight = (section.style?.height as number) || 400;
        const sectionX = section.position.x;
        const sectionY = section.position.y;

        if (
            position.x > sectionX
            && position.x < sectionX + sectionWidth
            && position.y > sectionY
            && position.y < sectionY + sectionHeight
        ) {
            return section;
        }
    }

    return null;
}

function unparentNode(node: FlowNode, absolutePosition: { x: number; y: number }): FlowNode {
    return clearNodeParent({ ...node, position: absolutePosition });
}

export function applySectionParenting(currentNodes: FlowNode[], draggedNode: FlowNode): FlowNode[] {
    if (draggedNode.type === 'section') {
        return currentNodes;
    }

    const absolutePosition = getAbsoluteNodePosition(draggedNode, currentNodes);
    const newParent = findContainingSection(absolutePosition, draggedNode.id, currentNodes);
    if (newParent?.id === getNodeParentId(draggedNode)) {
        return currentNodes;
    }

    return currentNodes.map((node) => {
        if (node.id !== draggedNode.id) {
            return node;
        }

        if (newParent) {
            return setNodeParent({
                ...node,
                position: {
                    x: absolutePosition.x - newParent.position.x,
                    y: absolutePosition.y - newParent.position.y,
                },
            }, newParent.id);
        }

        if (getNodeParentId(node)) {
            return unparentNode(node, absolutePosition);
        }

        return { ...node, position: draggedNode.position };
    });
}
