import { useCallback, useEffect, useRef } from 'react';
import { useReactFlow } from '@/lib/reactflowCompat';
import type { FlowNode, NodeData } from '@/lib/types';
import { clearNodeParent, getNodeParentId, setNodeParent } from '@/lib/nodeParent';
import { useFlowStore } from '../store';
import { assignSmartHandlesWithOptions, getSmartRoutingOptionsFromViewSettings } from '../services/smartEdgeRouting';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '../lib/analytics';
import { createId } from '../lib/id';
import { createDefaultEdge, createMindmapEdge } from '@/constants';
import { releaseStaleElkRoutesForNodeIds } from '@/lib/releaseStaleElkRoutes';
import { reconcileMindmapDrop, relayoutMindmapComponent, resolveMindmapBranchStyleForNode, syncMindmapEdges } from '@/lib/mindmapLayout';
import {
    applySectionParenting,
    createArchitectureServiceNode,
    createMindmapTopicNode,
    createSectionNode,
    getDefaultNodePosition,
    getAbsoluteNodePosition,
    reassignArchitectureNodeBoundary,
} from './node-operations/utils';
import { getDragStopReconcileDelayMs } from './node-operations/dragStopReconcilePolicy';
import { useNodeOperationAdders } from './node-operations/useNodeOperationAdders';
import { requestNodeLabelEdit } from './nodeLabelEditRequest';
import { resolveMindmapChildSide } from '@/lib/connectCreationPolicy';
import type { MindmapTopicSide } from './mindmapTopicActionRequest';

export const useNodeOperations = (recordHistory: () => void) => {
    const { t } = useTranslation();
    const { nodes, setNodes, setEdges, setSelectedNodeId } = useFlowStore();
    const { screenToFlowPosition } = useReactFlow();
    const dragStopReconcileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const altDragDuplicateRef = useRef<{
        originalNodeId: string;
        duplicateNodeId: string;
        originalPosition: FlowNode['position'];
    } | null>(null);

    useEffect(() => {
        return () => {
            if (dragStopReconcileTimerRef.current !== null) {
                clearTimeout(dragStopReconcileTimerRef.current);
            }
        };
    }, []);

    // --- Node Data Updates ---
    const updateNodeData = useCallback((id: string, data: Partial<NodeData>) => {
        const state = useFlowStore.getState();
        const existingNode = state.nodes.find((node) => node.id === id);
        if (!existingNode) {
            return;
        }

        if (existingNode.type === 'mindmap' && typeof data.mindmapBranchStyle === 'string') {
            const nextNodes = relayoutMindmapComponent(
                state.nodes.map((node) => (
                    node.id === id
                        ? { ...node, data: { ...node.data, ...data } }
                        : node
                )),
                state.edges,
                id
            );
            setNodes(() => nextNodes);
            setEdges((existingEdges) => syncMindmapEdges(nextNodes, existingEdges));
            return;
        }

        setNodes((nds) => {
            return reassignArchitectureNodeBoundary({
                nodes: nds,
                nodeId: id,
                data,
            });
        });
    }, [setEdges, setNodes]);

    const applyBulkNodeData = useCallback((updates: Partial<NodeData>, labelPrefix = '', labelSuffix = '') => {
        const hasFieldUpdates = Object.keys(updates).length > 0;
        const hasLabelUpdates = labelPrefix.length > 0 || labelSuffix.length > 0;
        if (!hasFieldUpdates && !hasLabelUpdates) {
            return 0;
        }

        const selectedNodes = useFlowStore.getState().nodes.filter((node) => node.selected);
        if (selectedNodes.length === 0) {
            return 0;
        }

        const selectedIds = new Set(selectedNodes.map((node) => node.id));
        recordHistory();
        setNodes((nds) => nds.map((node) => {
            if (!selectedIds.has(node.id)) {
                return node;
            }

            const nextData: NodeData = { ...node.data, ...updates };
            if (hasLabelUpdates) {
                const baseLabel = node.data?.label ?? '';
                nextData.label = `${labelPrefix}${baseLabel}${labelSuffix}`;
            }

            return { ...node, data: nextData };
        }));

        return selectedNodes.length;
    }, [recordHistory, setNodes]);

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
        const newNode: FlowNode = {
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
    const {
        handleAddShape,
        handleAddNode,
        handleAddAnnotation,
        handleAddJourneyNode,
        handleAddMindmapNode,
        handleAddArchitectureNode,
        handleAddSection,
        handleAddTextNode,
        handleAddImage,
        handleAddWireframe,
        handleAddDomainLibraryItem,
    } = useNodeOperationAdders({
        recordHistory,
        nodesLength: nodes.length,
        setNodes,
        setSelectedNodeId,
    });

    const insertMindmapTopic = useCallback((
        sourceNodeId: string,
        relationship: 'child' | 'sibling',
        preferredSideOverride: MindmapTopicSide = null
    ): boolean => {
        const state = useFlowStore.getState();
        const sourceNode = state.nodes.find((node) => node.id === sourceNodeId);
        if (!sourceNode || sourceNode.type !== 'mindmap') {
            return false;
        }

        const parentId = relationship === 'child' ? sourceNode.id : sourceNode.data?.mindmapParentId;
        if (!parentId) {
            return false;
        }

        const parentNode = state.nodes.find((node) => node.id === parentId);
        if (!parentNode || parentNode.type !== 'mindmap') {
            return false;
        }

        const sourceDepth = typeof sourceNode.data?.mindmapDepth === 'number' ? sourceNode.data.mindmapDepth : 0;
        const parentDepth = typeof parentNode.data?.mindmapDepth === 'number' ? parentNode.data.mindmapDepth : 0;
        const id = createId('mm');
        const { activeLayerId, viewSettings } = state;
        const inheritedSide = sourceNode.data?.mindmapSide === 'left' || sourceNode.data?.mindmapSide === 'right'
            ? sourceNode.data.mindmapSide
            : parentNode.data?.mindmapSide;
        const preferredSide = preferredSideOverride ?? resolveMindmapChildSide(parentDepth, inheritedSide, null);
        const branchStyle = resolveMindmapBranchStyleForNode(parentNode.id, state.nodes);

        const newNode = createMindmapTopicNode({
            id,
            position: {
                x: sourceNode.position.x + 260,
                y: sourceNode.position.y,
            },
            depth: relationship === 'child' ? sourceDepth + 1 : parentDepth + 1,
            parentId: parentNode.id,
            side: preferredSide,
            branchStyle,
            layerId: activeLayerId,
        });
        const insertedEdge = createMindmapEdge(parentNode, newNode, undefined, undefined, branchStyle);
        const nextNodes = relayoutMindmapComponent(
            [
                ...state.nodes.map((node) => ({ ...node, selected: false })),
                newNode,
            ],
            state.edges.concat(insertedEdge),
            sourceNode.id
        );

        recordHistory();
        setNodes(() => nextNodes);
        setEdges((existingEdges) => {
                const insertedEdges = syncMindmapEdges(nextNodes, existingEdges.concat(insertedEdge));
                if (!viewSettings.smartRoutingEnabled) {
                    return insertedEdges;
                }
            return assignSmartHandlesWithOptions(
                nextNodes,
                insertedEdges,
                getSmartRoutingOptionsFromViewSettings(viewSettings)
            );
        });
        setSelectedNodeId(id);
        requestNodeLabelEdit(id, { replaceExisting: true });
        trackEvent('add_node', {
            node_type: relationship === 'child' ? 'mindmap_child' : 'mindmap_sibling',
        });
        return true;
    }, [recordHistory, setEdges, setNodes, setSelectedNodeId]);

    const handleAddMindmapChild = useCallback((parentId: string, preferredSide: MindmapTopicSide = null): boolean => {
        return insertMindmapTopic(parentId, 'child', preferredSide);
    }, [insertMindmapTopic]);

    const handleAddMindmapSibling = useCallback((nodeId: string): boolean => {
        return insertMindmapTopic(nodeId, 'sibling');
    }, [insertMindmapTopic]);

    const handleAddArchitectureService = useCallback((sourceId: string): boolean => {
        const state = useFlowStore.getState();
        const sourceNode = state.nodes.find((node) => node.id === sourceId);
        if (!sourceNode || sourceNode.type !== 'architecture') {
            return false;
        }

        const id = createId('arch');
        const { activeLayerId, viewSettings } = state;
        const sameBoundaryNodes = state.nodes.filter(
            (node) => node.type === 'architecture' && node.data?.archBoundaryId === sourceNode.data?.archBoundaryId
        );
        const yOffset = sameBoundaryNodes.length * 90;

        const newNode = createArchitectureServiceNode({
            id,
            position: {
                x: sourceNode.position.x + 260,
                y: sourceNode.position.y + yOffset,
            },
            sourceNode,
            layerId: activeLayerId,
        });

        recordHistory();
        setNodes((existingNodes) => [
            ...existingNodes.map((node) => ({ ...node, selected: false })),
            newNode,
        ]);
        setEdges((existingEdges) => {
            const insertedEdges = existingEdges.concat(createDefaultEdge(sourceId, id));
            if (!viewSettings.smartRoutingEnabled) {
                return insertedEdges;
            }
            return assignSmartHandlesWithOptions(
                useFlowStore.getState().nodes.concat(newNode),
                insertedEdges,
                getSmartRoutingOptionsFromViewSettings(viewSettings)
            );
        });
        setSelectedNodeId(id);
        trackEvent('add_node', { node_type: 'architecture_service' });
        return true;
    }, [recordHistory, setNodes, setEdges, setSelectedNodeId]);

    const handleCreateArchitectureBoundary = useCallback((sourceId: string): boolean => {
        const state = useFlowStore.getState();
        const sourceNode = state.nodes.find((node) => node.id === sourceId);
        if (!sourceNode || sourceNode.type !== 'architecture') {
            return false;
        }
        const sourceAbsolutePosition = getAbsoluteNodePosition(sourceNode, state.nodes);

        const boundaryId = createId('section');
        const { activeLayerId } = state;
        const boundaryLabel = `${sourceNode.data?.label || 'System'} Boundary`;
        const boundaryNode = createSectionNode(
            boundaryId,
            { x: sourceAbsolutePosition.x - 80, y: sourceAbsolutePosition.y - 70 },
            boundaryLabel
        );
        boundaryNode.style = { width: 360, height: 260 };
        boundaryNode.data = {
            ...boundaryNode.data,
            layerId: activeLayerId,
            archBoundaryId: boundaryId,
        };

        recordHistory();
        setNodes((existingNodes) => {
            const nextNodes: FlowNode[] = existingNodes.map((node) => {
                if (node.id === sourceId) {
                    return setNodeParent({
                        ...node,
                        position: {
                            x: sourceAbsolutePosition.x - boundaryNode.position.x,
                            y: sourceAbsolutePosition.y - boundaryNode.position.y,
                        },
                        data: {
                            ...node.data,
                            archBoundaryId: boundaryId,
                        },
                        selected: true,
                    }, boundaryId);
                }
                return { ...node, selected: false };
            });
            nextNodes.push({ ...boundaryNode, selected: false });
            return nextNodes;
        });
        setSelectedNodeId(sourceId);
        trackEvent('add_node', { node_type: 'architecture_boundary' });
        return true;
    }, [recordHistory, setNodes, setSelectedNodeId]);

    // --- Drag Operations ---
    const onNodeDragStart = useCallback((event: React.MouseEvent, node: FlowNode) => {
        recordHistory();

        // Alt + Drag Duplication
        if (event.altKey) {
            const newNodeId = createId();
            const newNode: FlowNode = {
                ...node,
                id: newNodeId,
                selected: true,
                position: { ...node.position },
                zIndex: (node.zIndex || 0) + 1,
            };

            altDragDuplicateRef.current = {
                originalNodeId: node.id,
                duplicateNodeId: newNodeId,
                originalPosition: { ...node.position },
            };
            setNodes((nds) => [
                ...nds.map((existingNode) => ({
                    ...existingNode,
                    selected: existingNode.id === newNodeId ? true : existingNode.id === node.id ? false : existingNode.selected,
                })),
                newNode,
            ]);
            setSelectedNodeId(newNodeId);
        }
    }, [recordHistory, setNodes, setSelectedNodeId]);

    const onNodeDrag = useCallback((_event: React.MouseEvent, draggedNode: FlowNode, _draggedNodes: FlowNode[]) => {
        const altDragDuplicate = altDragDuplicateRef.current;
        if (altDragDuplicate && altDragDuplicate.originalNodeId === draggedNode.id) {
            setNodes((currentNodes) => currentNodes.map((node) => {
                if (node.id === altDragDuplicate.originalNodeId) {
                    return {
                        ...node,
                        position: { ...altDragDuplicate.originalPosition },
                        selected: false,
                    };
                }

                if (node.id === altDragDuplicate.duplicateNodeId) {
                    return {
                        ...node,
                        position: { ...draggedNode.position },
                        selected: true,
                    };
                }

                return node;
            }));
            setSelectedNodeId(altDragDuplicate.duplicateNodeId);
        }

        // Intentionally no smart-routing work during active drag to protect frame budget.
        // Full reconciliation still runs on drag stop via `onNodeDragStop`.
    }, [setNodes, setSelectedNodeId]);

    const onNodeDragStop = useCallback((_event: React.MouseEvent, draggedNode: FlowNode) => {
        const altDragDuplicate = altDragDuplicateRef.current;
        const effectiveDraggedNode = altDragDuplicate && altDragDuplicate.originalNodeId === draggedNode.id
            ? useFlowStore.getState().nodes.find((node) => node.id === altDragDuplicate.duplicateNodeId) ?? draggedNode
            : draggedNode;
        altDragDuplicateRef.current = null;

        const { nodes: currentNodes } = useFlowStore.getState();
        const parentedNodes = applySectionParenting(currentNodes, effectiveDraggedNode);
        let reconciledNodes = parentedNodes;
        let currentEdges = useFlowStore.getState().edges;

        if (effectiveDraggedNode.type === 'mindmap') {
            const mindmapDropResult = reconcileMindmapDrop(parentedNodes, currentEdges, effectiveDraggedNode.id);
            if (mindmapDropResult.changed) {
                reconciledNodes = mindmapDropResult.nodes;
                currentEdges = mindmapDropResult.edges;
                setNodes(reconciledNodes);
                setEdges(currentEdges);
            } else if (parentedNodes !== currentNodes) {
                setNodes(parentedNodes);
            }
        } else if (parentedNodes !== currentNodes) {
            setNodes(parentedNodes);
        }

        const runReconcile = () => {
            const { nodes: latestNodes, edges: latestEdges, setEdges: setLatestEdges, viewSettings } = useFlowStore.getState();
            const movedNodeIds = new Set(
                latestNodes.filter((node) => node.selected).map((node) => node.id)
            );
            if (effectiveDraggedNode.id) {
                movedNodeIds.add(effectiveDraggedNode.id);
            }

            const releasedEdges = releaseStaleElkRoutesForNodeIds(latestEdges, movedNodeIds);
            if (!viewSettings.smartRoutingEnabled) {
                if (releasedEdges !== latestEdges) {
                    setLatestEdges(releasedEdges);
                }
                return;
            }
            const smartEdges = assignSmartHandlesWithOptions(
                latestNodes,
                releasedEdges,
                getSmartRoutingOptionsFromViewSettings(viewSettings)
            );
            setLatestEdges(smartEdges);
        };

        const delayMs = getDragStopReconcileDelayMs(reconciledNodes.length, currentEdges.length);
        if (delayMs === 0) {
            if (dragStopReconcileTimerRef.current !== null) {
                clearTimeout(dragStopReconcileTimerRef.current);
                dragStopReconcileTimerRef.current = null;
            }
            runReconcile();
            return;
        }

        if (dragStopReconcileTimerRef.current !== null) {
            clearTimeout(dragStopReconcileTimerRef.current);
        }
        dragStopReconcileTimerRef.current = setTimeout(() => {
            dragStopReconcileTimerRef.current = null;
            runReconcile();
        }, delayMs);

    }, [setEdges, setNodes]);

    const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: FlowNode) => {
        setSelectedNodeId(node.id);
        requestNodeLabelEdit(node.id);
    }, [setSelectedNodeId]);


    return {
        updateNodeData,
        applyBulkNodeData,
        updateNodeType,
        updateNodeZIndex,
        deleteNode,
        duplicateNode,
        handleAddShape,
        handleAddNode,
        handleAddAnnotation,
        handleAddJourneyNode,
        handleAddMindmapNode,
        handleAddArchitectureNode,
        handleAddSection,
        handleAddTextNode,
        handleAddImage,
        handleAddWireframe,
        handleAddDomainLibraryItem,
        handleAddMindmapChild,
        handleAddMindmapSibling,
        handleAddArchitectureService,
        handleCreateArchitectureBoundary,
        onNodeDragStart,
        onNodeDrag,
        onNodeDragStop,
        onNodeDoubleClick
    };
};
