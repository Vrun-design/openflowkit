import { useCallback, useRef } from 'react';
import { Edge, Connection, addEdge } from '@/lib/reactflowCompat';
import { useActiveCanvas } from '@/canvas/activeCanvas';
import { useFlowStore } from '../store';
import type { FlowEdge, NodeData } from '@/lib/types';
import { createMindmapEdge, DEFAULT_EDGE_OPTIONS } from '../constants';
import { useTranslation } from 'react-i18next';
import type { DomainLibraryItem } from '@/services/domainLibrary';
import { createDomainLibraryNode } from '@/services/domainLibrary';
import { createId } from '@/lib/id';
import { assignSmartHandlesWithOptions, getSmartRoutingOptionsFromViewSettings } from '../services/smartEdgeRouting';
import { getPointerClientPosition, isPaneTarget, normalizeConnectionFromDragStart } from './edgeConnectInteractions';
import { normalizeNodeHandleId } from '@/lib/nodeHandles';
import { buildReconnectedEdge, shouldRespectExplicitReconnectHandles } from '@/lib/reconnectEdge';
import { queueNodeLabelEditRequest } from './nodeLabelEditRequest';
import { insertNodeIntoEdge } from './node-operations/edgeInsertion';
import { isMindmapConnectorSource } from '@/lib/connectCreationPolicy';
import { resolveMindmapBranchStyleForNode, syncMindmapEdges } from '@/lib/mindmapLayout';
import {
    buildSequenceMessageEdge,
    isSequenceConnection,
} from '@/services/sequence/sequenceMessage';
import {
    buildConnectedEdge,
    buildConnectedMindmapTopic,
    buildConnectedNode,
    type ConnectedEdgePreset,
    getOppositeTargetHandle,
    isDuplicateConnection,
    resolveConnectEndAction,
} from './edge-operations/utils';
import { getDefaultConnectedNodeSpec } from '@/lib/connectCreationPolicy';
import type { QuickCreateDirection } from './nodeQuickCreateRequest';

export const useEdgeOperations = (
    recordHistory: () => void,
    onShowConnectMenu?: (position: { x: number; y: number }, sourceId: string, sourceHandle: string | null, sourceType: string | null) => void
) => {
    const { t } = useTranslation();
    const { nodes, edges, setNodes, setEdges, setSelectedNodeId, setSelectedEdgeId } = useFlowStore();
    const { screenToFlowPosition } = useActiveCanvas();

    const connectingNodeId = useRef<string | null>(null);
    const connectingHandleId = useRef<string | null>(null);
    const isConnectionValid = useRef<boolean>(false);

    // --- Edge Updates ---
    const updateEdge = useCallback((id: string, updates: Partial<Edge>) => {
        recordHistory();
        setEdges((eds) => eds.map((edge) => edge.id === id ? { ...edge, ...updates } : edge));
    }, [setEdges, recordHistory]);

    const onReconnect = useCallback((oldEdge: Edge, newConnection: Connection) => {
        recordHistory();
        setEdges((eds) => {
            const state = useFlowStore.getState();
            const reconnectedEdge = buildReconnectedEdge(oldEdge as FlowEdge, newConnection, state.nodes);
            const nextEdges = eds.map((edge) => {
                if (edge.id === oldEdge.id) {
                    return reconnectedEdge;
                }
                return edge;
            });

            if (!state.viewSettings.smartRoutingEnabled || shouldRespectExplicitReconnectHandles(newConnection)) {
                return nextEdges;
            }

            return assignSmartHandlesWithOptions(
                state.nodes,
                nextEdges,
                getSmartRoutingOptionsFromViewSettings(state.viewSettings)
            );
        });
    }, [setEdges, recordHistory]);

    const deleteEdge = useCallback((id: string) => {
        recordHistory();
        setEdges((eds) => eds.filter((e) => e.id !== id));
        setSelectedEdgeId(null);
    }, [setEdges, recordHistory, setSelectedEdgeId]);

    // --- Connections ---
    const onConnect = useCallback((params: Connection) => {
        isConnectionValid.current = true;
        const normalizedConnection = normalizeConnectionFromDragStart(
            params,
            connectingNodeId.current,
            connectingHandleId.current
        );
        const sourceNode = nodes.find((node) => node.id === normalizedConnection.source);
        const targetNode = nodes.find((node) => node.id === normalizedConnection.target);
        const resolvedConnection = {
            ...normalizedConnection,
            sourceHandle: normalizeNodeHandleId(sourceNode, normalizedConnection.sourceHandle),
            targetHandle: normalizeNodeHandleId(targetNode, normalizedConnection.targetHandle),
        };
        const isDuplicate = isDuplicateConnection(edges, resolvedConnection);

        if (isDuplicate) return;

        const { viewSettings } = useFlowStore.getState();
        recordHistory();
        setEdges((eds) => {
            if (sourceNode?.type === 'mindmap' && targetNode?.type === 'mindmap' && resolvedConnection.source && resolvedConnection.target) {
                const mindmapEdge = createMindmapEdge(
                    sourceNode,
                    targetNode,
                    undefined,
                    `e-${resolvedConnection.source}-${resolvedConnection.target}`,
                    resolveMindmapBranchStyleForNode(sourceNode.id, nodes)
                );
                return eds.concat(mindmapEdge);
            }

            if (isSequenceConnection(sourceNode, targetNode, resolvedConnection)) {
                return eds.concat(buildSequenceMessageEdge(
                    resolvedConnection,
                    sourceNode,
                    targetNode,
                    eds,
                    t('connectionPanel.messagePlaceholder', 'Message')
                ));
            }

            const inserted = addEdge({
                ...resolvedConnection,
                data: {
                    connectionType: resolvedConnection.sourceHandle || resolvedConnection.targetHandle ? 'fixed' : 'dynamic',
                },
                ...DEFAULT_EDGE_OPTIONS,
            }, eds);

            // If the user explicitly dragged both source AND target to specific handles,
            // respect that intentional choice — don't let Smart Routing override it.
            // Only auto-assign handles when the user dropped on the node body (not a handle).
            const bothHandlesExplicit = !!resolvedConnection.sourceHandle && !!resolvedConnection.targetHandle;
            if (!viewSettings.smartRoutingEnabled || bothHandlesExplicit) {
                return inserted;
            }
            return assignSmartHandlesWithOptions(
                useFlowStore.getState().nodes,
                inserted,
                getSmartRoutingOptionsFromViewSettings(viewSettings)
            );
        });
    }, [edges, nodes, recordHistory, setEdges, t]);

    const onConnectStart = useCallback((_, { nodeId, handleId }: { nodeId: string | null; handleId: string | null }) => {
        connectingNodeId.current = nodeId;
        connectingHandleId.current = handleId;
        isConnectionValid.current = false;
    }, []);

    const handleAddAndConnect = useCallback((
        type: string,
        position: { x: number; y: number },
        sourceId: string,
        sourceHandle: string | null,
        shape?: NodeData['shape'],
        edgePreset?: ConnectedEdgePreset
    ) => {
        recordHistory();
        const state = useFlowStore.getState();
        const sourceNode = state.nodes.find((node) => node.id === sourceId);
        if (type === 'mindmap' && isMindmapConnectorSource(sourceNode?.type)) {
            const { insertedEdge, nextNode, nextNodes } = buildConnectedMindmapTopic({
                nodes: state.nodes,
                edges: state.edges,
                sourceNode,
                sourceHandle,
                sourceId,
                position,
            });

            setNodes(() => nextNodes);
            setEdges((existingEdges) => {
                const insertedEdges = syncMindmapEdges(nextNodes, existingEdges.concat(insertedEdge));
                if (!state.viewSettings.smartRoutingEnabled) {
                    return insertedEdges;
                }
                return assignSmartHandlesWithOptions(
                    nextNodes,
                    insertedEdges,
                    getSmartRoutingOptionsFromViewSettings(state.viewSettings)
                );
            });
            setSelectedNodeId(nextNode.id);
            queueNodeLabelEditRequest(nextNode.id, { replaceExisting: true });
            return;
        }

        const { newNode } = buildConnectedNode({
            type,
            position,
            shape,
            sourceNode,
            labels: {
                noteLabel: t('nodes.note'),
                noteSubLabel: t('nodes.addCommentsHere'),
            },
        });
        const id = newNode.id;

        const { viewSettings } = state;
        setNodes((nds) => nds.concat(newNode));
        setEdges((eds) => {
            const resolvedSourceHandle = normalizeNodeHandleId(sourceNode, sourceHandle) ?? null;
            const resolvedTargetHandle = !viewSettings.smartRoutingEnabled && resolvedSourceHandle
                ? getOppositeTargetHandle(newNode, resolvedSourceHandle)
                : null;

            const insertedEdges = eds.concat(buildConnectedEdge(sourceId, id, resolvedSourceHandle, resolvedTargetHandle, edgePreset));
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
        queueNodeLabelEditRequest(id, { replaceExisting: true });
    }, [recordHistory, setEdges, setNodes, setSelectedNodeId, t]);

    const insertNodeOnEdge = useCallback((edgeId: string) => {
        const state = useFlowStore.getState();
        const result = insertNodeIntoEdge(state.nodes, state.edges, edgeId, {
            nodeId: createId(), edgeId: createId('e'),
        });
        if (!result) return;
        recordHistory();
        setNodes(() => result.nodes);
        setEdges(() => result.edges);
        setSelectedNodeId(result.nodeId);
        setSelectedEdgeId(null);
        queueNodeLabelEditRequest(result.nodeId, { replaceExisting: true });
    }, [recordHistory, setEdges, setNodes, setSelectedEdgeId, setSelectedNodeId]);

    const createConnectedNodeInDirection = useCallback((sourceId: string, direction: QuickCreateDirection) => {
        const state = useFlowStore.getState();
        const sourceNode = state.nodes.find((node) => node.id === sourceId);
        if (!sourceNode) {
            return;
        }

        const directionMap: Record<QuickCreateDirection, { dx: number; dy: number; handle: string }> = {
            up: { dx: 0, dy: -180, handle: 'top' },
            right: { dx: 260, dy: 0, handle: 'right' },
            down: { dx: 0, dy: 180, handle: 'bottom' },
            left: { dx: -260, dy: 0, handle: 'left' },
        };
        const directionConfig = directionMap[direction];
        const defaultConnectedNode = getDefaultConnectedNodeSpec(sourceNode.type);

        handleAddAndConnect(
            defaultConnectedNode.type,
            {
                x: sourceNode.position.x + directionConfig.dx,
                y: sourceNode.position.y + directionConfig.dy,
            },
            sourceId,
            directionConfig.handle,
            defaultConnectedNode.shape
        );
    }, [handleAddAndConnect]);

    const handleAddDomainLibraryItemAndConnect = useCallback((item: DomainLibraryItem, position: { x: number; y: number }, sourceId: string, sourceHandle: string | null) => {
        recordHistory();
        const state = useFlowStore.getState();
        const sourceNode = state.nodes.find((node) => node.id === sourceId);
        const id = createId('lib');
        const newNode = createDomainLibraryNode(item, id, position, state.activeLayerId);
        const { viewSettings } = state;

        setNodes((nds) => nds.concat(newNode));
        setEdges((eds) => {
            const resolvedSourceHandle = normalizeNodeHandleId(sourceNode, sourceHandle) ?? null;
            const resolvedTargetHandle = !viewSettings.smartRoutingEnabled && resolvedSourceHandle
                ? getOppositeTargetHandle(newNode, resolvedSourceHandle)
                : null;
            const insertedEdges = eds.concat(buildConnectedEdge(sourceId, id, resolvedSourceHandle, resolvedTargetHandle));
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
    }, [recordHistory, setEdges, setNodes, setSelectedNodeId]);

    const onConnectEnd = useCallback(
        (event: unknown) => {
            if (!connectingNodeId.current) return;
            if (isConnectionValid.current) return;

            const clientPosition = getPointerClientPosition(event);
            if (!clientPosition) return;
            const position = screenToFlowPosition(clientPosition);
            const target = (event as { target?: EventTarget | null }).target ?? null;
            const resolution = resolveConnectEndAction({
                nodes,
                edges,
                sourceId: connectingNodeId.current,
                sourceHandle: connectingHandleId.current,
                position,
                clientPosition,
                targetIsPane: isPaneTarget(target),
                canvasInteractionsV1Enabled: true,
            });

            if (resolution.type === 'connect') {
                onConnect(resolution.connection);
                return;
            }

            if (resolution.type === 'add') {
                handleAddAndConnect(
                    resolution.nodeType,
                    resolution.position,
                    connectingNodeId.current,
                    connectingHandleId.current,
                    resolution.shape
                );
                return;
            }

            if (resolution.type === 'menu' && onShowConnectMenu) {
                onShowConnectMenu(
                    resolution.clientPosition,
                    connectingNodeId.current,
                    connectingHandleId.current,
                    resolution.sourceType
                );
            }
        },
        [nodes, edges, screenToFlowPosition, onConnect, onShowConnectMenu, handleAddAndConnect]
    );

    return {
        updateEdge,
        deleteEdge,
        onConnect,
        onConnectStart,
        onConnectEnd,
        onReconnect,
        handleAddAndConnect,
        createConnectedNodeInDirection,
        handleAddDomainLibraryItemAndConnect,
        insertNodeOnEdge,
    };
};
