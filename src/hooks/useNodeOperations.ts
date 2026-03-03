import { useCallback } from 'react';
import { Node, useReactFlow } from 'reactflow';
import { NodeData } from '@/lib/types';
import { useFlowStore } from '../store';
import { assignSmartHandles } from '../services/smartEdgeRouting';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '../lib/analytics';
import { createId } from '../lib/id';
import {
    applySectionParenting,
    createAnnotationNode,
    createImageNode,
    createProcessNode,
    createSectionNode,
    createTextNode,
    getDefaultNodePosition,
} from './node-operations/utils';

export const useNodeOperations = (recordHistory: () => void) => {
    const { t } = useTranslation();
    const { nodes, setNodes, setEdges, setSelectedNodeId } = useFlowStore();
    const { screenToFlowPosition } = useReactFlow();

    // --- Node Data Updates ---
    const updateNodeData = useCallback((id: string, data: Partial<NodeData>) => {
        setNodes((nds) =>
            nds.map((node) => node.id === id ? { ...node, data: { ...node.data, ...data } } : node)
        );
    }, [setNodes]);

    const updateNodeType = useCallback((id: string, type: string) => {
        recordHistory();
        setNodes((nds) => nds.map((node) => node.id === id ? { ...node, type } : node));
    }, [setNodes, recordHistory]);

    const updateNodeZIndex = useCallback((id: string, action: 'front' | 'back') => {
        recordHistory();
        setNodes((nds) => {
            const node = nds.find((n) => n.id === id);
            if (!node) return nds;

            const zIndices = nds.map((n) => n.zIndex || 0);
            const maxZ = Math.max(...zIndices, 0);
            const minZ = Math.min(...zIndices, 0);

            const newZ = action === 'front' ? maxZ + 1 : minZ - 1;

            return nds.map((n) => (n.id === id ? { ...n, zIndex: newZ } : n));
        });
    }, [setNodes, recordHistory]);

    // --- Delete ---
    const deleteNode = useCallback((id: string) => {
        const deletedNode = nodes.find(n => n.id === id);
        recordHistory();
        setNodes((nds) => nds.filter((n) => n.id !== id));
        setSelectedNodeId(null);
        if (deletedNode) {
            trackEvent('delete_node', { node_type: deletedNode.type });
        }
    }, [nodes, setNodes, recordHistory, setSelectedNodeId]);

    // --- Duplicate ---
    const duplicateNode = useCallback((id: string) => {
        const nodeToDuplicate = nodes.find((n) => n.id === id);
        if (!nodeToDuplicate) return;
        recordHistory();
        const newNodeId = createId();
        const newNode: Node = {
            ...nodeToDuplicate,
            id: newNodeId,
            position: { x: nodeToDuplicate.position.x + 50, y: nodeToDuplicate.position.y + 50 },
            selected: true,
        };
        setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), newNode]);
        setSelectedNodeId(newNodeId);
        trackEvent('duplicate_node', { node_type: nodeToDuplicate.type });
    }, [nodes, recordHistory, setNodes, setSelectedNodeId]);

    // --- Add Nodes ---
    const handleAddNode = useCallback((position?: { x: number; y: number }) => {
        recordHistory();
        const id = createId();
        const newNode = createProcessNode(
            id,
            position || getDefaultNodePosition(nodes.length, 100, 100),
            { label: t('nodes.newNode'), subLabel: t('nodes.processStep') }
        );
        setNodes((nds) => nds.concat(newNode));
        setSelectedNodeId(id);
        trackEvent('add_node', { node_type: 'process' });
    }, [setNodes, recordHistory, setSelectedNodeId, t, nodes.length]);

    const handleAddAnnotation = useCallback((position?: { x: number; y: number }) => {
        recordHistory();
        const id = createId();
        const newNode = createAnnotationNode(
            id,
            position || getDefaultNodePosition(nodes.length, 100, 100),
            { label: t('nodes.note'), subLabel: t('nodes.addCommentsHere') }
        );
        setNodes((nds) => nds.concat(newNode));
        setSelectedNodeId(id);
        trackEvent('add_node', { node_type: 'annotation' });
    }, [setNodes, recordHistory, setSelectedNodeId, t, nodes.length]);

    const handleAddSection = useCallback((position?: { x: number; y: number }) => {
        recordHistory();
        const id = createId('section');
        const newNode = createSectionNode(
            id,
            position || getDefaultNodePosition(nodes.length, 50, 50),
            t('nodes.newSection')
        );
        setNodes((nds) => nds.concat(newNode));
        setSelectedNodeId(id);
        trackEvent('add_node', { node_type: 'section' });
    }, [setNodes, recordHistory, setSelectedNodeId, t, nodes.length]);

    const handleAddTextNode = useCallback((position?: { x: number; y: number }) => {
        recordHistory();
        const id = createId('text');
        const newNode = createTextNode(
            id,
            position || getDefaultNodePosition(nodes.length, 100, 100),
            t('nodes.text')
        );
        setNodes((nds) => nds.concat(newNode));
        setSelectedNodeId(id);
        trackEvent('add_node', { node_type: 'text' });
    }, [setNodes, recordHistory, setSelectedNodeId, t, nodes.length]);

    const handleAddImage = useCallback((imageUrl: string, position?: { x: number; y: number }) => {
        recordHistory();
        const id = createId('image');
        const newNode = createImageNode(
            id,
            imageUrl,
            position || getDefaultNodePosition(nodes.length, 100, 100),
            t('nodes.image')
        );
        setNodes((nds) => nds.concat(newNode));
        setSelectedNodeId(id);
        trackEvent('add_node', { node_type: 'image' });
    }, [setNodes, recordHistory, setSelectedNodeId, t, nodes.length]);

    // --- Drag Operations ---
    const onNodeDragStart = useCallback((event: React.MouseEvent, node: Node) => {
        recordHistory();

        // Alt + Drag Duplication
        if (event.altKey) {
            const newNodeId = createId();
            const newNode: Node = {
                ...node,
                id: newNodeId,
                selected: false, // The static clone should not be selected
                position: { ...node.position }, // Clone executes at START position
                // We might want to reset zIndex or ensure it's correct?
                zIndex: (node.zIndex || 0) - 1, // Put clone slightly behind?
            };

            // Add the CLONE (which stays behind)
            setNodes((nds) => nds.concat(newNode));

            // The user continues dragging the ORIGINAL 'node'.
        }
    }, [recordHistory, setNodes]);

    const onNodeDrag = useCallback((_event: React.MouseEvent, _node: Node, draggedNodes: Node[]) => {
        const { nodes: storeNodes, edges, setEdges, viewSettings } = useFlowStore.getState();

        if (!viewSettings.smartRoutingEnabled) return;

        // "draggedNodes" contains only the nodes being dragged.
        // "storeNodes" contains all nodes, but newly dragged ones might be stale in store until commit?
        // Actually store updates on drag? ReactFlow updates internal state, and onNodesChange updates store.
        // But onNodeDrag happens frequently.

        // Merge logic to ensure valid routing
        const draggedNodesMap = new Map(draggedNodes.map(n => [n.id, n]));
        const mergedNodes = storeNodes.map(n => draggedNodesMap.get(n.id) || n);

        const smartEdges = assignSmartHandles(mergedNodes, edges);
        setEdges(smartEdges);
    }, []);

    const onNodeDragStop = useCallback((_event: React.MouseEvent, draggedNode: Node) => {
        const { nodes: currentNodes } = useFlowStore.getState();
        const updatedNodes = applySectionParenting(currentNodes, draggedNode);
        if (updatedNodes === currentNodes) return;
        setNodes(updatedNodes);

        // Smart Routing Recalc on Drop
        const { edges, setEdges, viewSettings } = useFlowStore.getState();
        if (viewSettings.smartRoutingEnabled) {
            const smartEdges = assignSmartHandles(updatedNodes, edges);
            setEdges(smartEdges);
        }

    }, [setNodes]);

    const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
        setSelectedNodeId(node.id);
    }, [setSelectedNodeId]);


    return {
        updateNodeData,
        updateNodeType,
        updateNodeZIndex,
        deleteNode,
        duplicateNode,
        handleAddNode,
        handleAddAnnotation,
        handleAddSection,
        handleAddTextNode,
        handleAddImage,
        onNodeDragStart,
        onNodeDrag,
        onNodeDragStop,
        onNodeDoubleClick
    };
};
