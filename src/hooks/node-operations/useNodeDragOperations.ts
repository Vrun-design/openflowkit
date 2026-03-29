import { useCallback, useEffect, useRef } from 'react';
import type { FlowNode } from '@/lib/types';
import { useFlowStore } from '../../store';
import { createId } from '../../lib/id';
import { assignSmartHandlesWithOptions, getSmartRoutingOptionsFromViewSettings } from '../../services/smartEdgeRouting';
import { releaseStaleElkRoutesForNodeIds } from '@/lib/releaseStaleElkRoutes';
import { reconcileMindmapDrop } from '@/lib/mindmapLayout';
import { applyMindmapVisibility } from '@/lib/mindmapTree';
import { applySectionParenting, getContainingSectionId } from './utils';
import { getDragStopReconcileDelayMs } from './dragStopReconcilePolicy';
import { requestNodeLabelEdit } from '../nodeLabelEditRequest';

export const useNodeDragOperations = (recordHistory: () => void) => {
    const { setNodes, setEdges, setSelectedNodeId, setHoveredSectionId } = useFlowStore();
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
            useFlowStore.getState().setHoveredSectionId(null);
        };
    }, []);

    const onNodeDragStart = useCallback((event: React.MouseEvent, node: FlowNode) => {
        recordHistory();
        setHoveredSectionId(node.type === 'section' ? null : getContainingSectionId(useFlowStore.getState().nodes, node));

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
    }, [recordHistory, setHoveredSectionId, setNodes, setSelectedNodeId]);

    const onNodeDrag = useCallback((_event: React.MouseEvent, draggedNode: FlowNode, _draggedNodes: FlowNode[]) => {
        const altDragDuplicate = altDragDuplicateRef.current;
        let hoverTargetNode = draggedNode;
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
            hoverTargetNode = {
                ...draggedNode,
                id: altDragDuplicate.duplicateNodeId,
            };
        }

        setHoveredSectionId(getContainingSectionId(useFlowStore.getState().nodes, hoverTargetNode));

        // Intentionally no smart-routing work during active drag to protect frame budget.
        // Full reconciliation still runs on drag stop via `onNodeDragStop`.
    }, [setHoveredSectionId, setNodes, setSelectedNodeId]);

    const onNodeDragStop = useCallback((_event: React.MouseEvent, draggedNode: FlowNode) => {
        const altDragDuplicate = altDragDuplicateRef.current;
        const effectiveDraggedNode = altDragDuplicate && altDragDuplicate.originalNodeId === draggedNode.id
            ? useFlowStore.getState().nodes.find((node) => node.id === altDragDuplicate.duplicateNodeId) ?? draggedNode
            : draggedNode;
        altDragDuplicateRef.current = null;

        // Sequence participants must stay in their horizontal row — lock Y position.
        if (effectiveDraggedNode.type === 'sequence_participant') {
            const { nodes: snapNodes } = useFlowStore.getState();
            const rowY = snapNodes.find((n) => n.type === 'sequence_participant' && n.id !== effectiveDraggedNode.id)?.position.y ?? 0;
            setNodes((currentNodes) => currentNodes.map((node) =>
                node.id === effectiveDraggedNode.id
                    ? { ...node, position: { ...node.position, y: rowY } }
                    : node
            ));
            return;
        }

        setHoveredSectionId(null);

        const { nodes: currentNodes } = useFlowStore.getState();
        const parentedNodes = applySectionParenting(currentNodes, effectiveDraggedNode);
        let reconciledNodes = parentedNodes;
        let currentEdges = useFlowStore.getState().edges;

        if (effectiveDraggedNode.type === 'mindmap') {
            const mindmapDropResult = reconcileMindmapDrop(parentedNodes, currentEdges, effectiveDraggedNode.id);
            if (mindmapDropResult.changed) {
                const visibilityState = applyMindmapVisibility(mindmapDropResult.nodes, mindmapDropResult.edges);
                reconciledNodes = visibilityState.nodes;
                currentEdges = visibilityState.edges;
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

    }, [setEdges, setHoveredSectionId, setNodes]);

    const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: FlowNode) => {
        setSelectedNodeId(node.id);
        requestNodeLabelEdit(node.id);
    }, [setSelectedNodeId]);

    return {
        onNodeDragStart,
        onNodeDrag,
        onNodeDragStop,
        onNodeDoubleClick,
    };
};
