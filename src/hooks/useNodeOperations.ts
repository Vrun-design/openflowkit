import { useCallback } from 'react';
import { Node, useReactFlow } from 'reactflow';
import { NodeData } from '@/lib/types';
import { useFlowStore } from '../store';
import { assignSmartHandles } from '../services/smartEdgeRouting';
import { NODE_WIDTH, NODE_HEIGHT } from '../constants';

export const useNodeOperations = (recordHistory: () => void) => {
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
        recordHistory();
        setNodes((nds) => nds.filter((n) => n.id !== id));
        setSelectedNodeId(null);
    }, [setNodes, recordHistory, setSelectedNodeId]);

    // --- Duplicate ---
    const duplicateNode = useCallback((id: string) => {
        const nodeToDuplicate = nodes.find((n) => n.id === id);
        if (!nodeToDuplicate) return;
        recordHistory();
        const newNodeId = `${Date.now()}`;
        const newNode: Node = {
            ...nodeToDuplicate,
            id: newNodeId,
            position: { x: nodeToDuplicate.position.x + 50, y: nodeToDuplicate.position.y + 50 },
            selected: true,
        };
        setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), newNode]);
        setSelectedNodeId(newNodeId);
    }, [nodes, recordHistory, setNodes, setSelectedNodeId]);

    // --- Add Nodes ---
    const handleAddNode = useCallback((position?: { x: number; y: number }) => {
        recordHistory();
        const id = `${Date.now()}`;
        const newNode: Node = {
            id,
            position: position || { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
            data: { label: 'New Node', subLabel: 'Process Step', color: 'slate' },
            type: 'process',
        };
        setNodes((nds) => nds.concat(newNode));
        setSelectedNodeId(id);
    }, [setNodes, recordHistory, setSelectedNodeId]);

    const handleAddAnnotation = useCallback((position?: { x: number; y: number }) => {
        recordHistory();
        const id = `${Date.now()}`;
        const newNode: Node = {
            id,
            position: position || { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
            data: { label: 'Note', subLabel: 'Add your comments here.', color: 'yellow' },
            type: 'annotation',
        };
        setNodes((nds) => nds.concat(newNode));
        setSelectedNodeId(id);
    }, [setNodes, recordHistory, setSelectedNodeId]);

    const handleAddSection = useCallback((position?: { x: number; y: number }) => {
        recordHistory();
        const id = `section-${Date.now()}`;
        const newNode: Node = {
            id,
            position: position || { x: Math.random() * 200 + 50, y: Math.random() * 200 + 50 },
            data: { label: 'New Section', subLabel: '', color: 'blue' },
            type: 'section',
            style: { width: 500, height: 400 },
            zIndex: -1,
        };
        setNodes((nds) => nds.concat(newNode));
        setSelectedNodeId(id);
    }, [setNodes, recordHistory, setSelectedNodeId]);

    const handleAddTextNode = useCallback((position?: { x: number; y: number }) => {
        recordHistory();
        const id = `text-${Date.now()}`;
        const newNode: Node = {
            id,
            position: position || { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
            data: { label: 'Text', subLabel: '', color: 'slate' },
            type: 'text',
        };
        setNodes((nds) => nds.concat(newNode));
        setSelectedNodeId(id);
    }, [setNodes, recordHistory, setSelectedNodeId]);

    const handleAddImage = useCallback((imageUrl: string, position?: { x: number; y: number }) => {
        recordHistory();
        const id = `image-${Date.now()}`;
        const newNode: Node = {
            id,
            position: position || { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
            data: { label: 'Image', imageUrl, transparency: 1, rotation: 0 },
            type: 'image',
            style: { width: 200, height: 200 },
        };
        setNodes((nds) => nds.concat(newNode));
        setSelectedNodeId(id);
    }, [setNodes, recordHistory, setSelectedNodeId]);

    // --- Drag Operations ---
    const onNodeDragStart = useCallback((event: React.MouseEvent, node: Node) => {
        recordHistory();

        // Alt + Drag Duplication
        if (event.altKey) {
            const newNodeId = `${Date.now()}`;
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

        if (draggedNode.type === 'section') return;

        // Section/Parenting Logic
        let absX = draggedNode.position.x;
        let absY = draggedNode.position.y;
        if (draggedNode.parentNode) {
            const currentParent = currentNodes.find((n) => n.id === draggedNode.parentNode);
            if (currentParent) {
                absX += currentParent.position.x;
                absY += currentParent.position.y;
            }
        }

        const sectionNodes = currentNodes.filter((n) => n.type === 'section' && n.id !== draggedNode.id);
        let newParent: Node | null = null;

        for (const section of sectionNodes) {
            const sW = (section.style?.width as number) || 500;
            const sH = (section.style?.height as number) || 400;
            const sX = section.position.x;
            const sY = section.position.y;

            if (
                absX > sX &&
                absX < sX + sW &&
                absY > sY &&
                absY < sY + sH
            ) {
                newParent = section;
                break;
            }
        }

        if (newParent?.id === draggedNode.parentNode) return;

        const updatedNodes = currentNodes.map((n) => {
            if (n.id !== draggedNode.id) return n;
            if (newParent) {
                return {
                    ...n,
                    parentNode: newParent.id,
                    extent: 'parent' as const,
                    position: {
                        x: absX - newParent.position.x,
                        y: absY - newParent.position.y,
                    },
                };
            } else if (n.parentNode) {
                // Unparent
                const { parentNode, extent, ...rest } = n as any;
                return { ...rest, position: { x: absX, y: absY } };
            }
            return { ...n, position: draggedNode.position };
        });

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
