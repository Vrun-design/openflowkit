import { useCallback, useRef } from 'react';
import { Edge, Connection, addEdge, useReactFlow } from 'reactflow';
import { useFlowStore } from '../store';
import { NodeData } from '@/lib/types';
import { DEFAULT_EDGE_OPTIONS, NODE_WIDTH, NODE_HEIGHT } from '../constants';

export const useEdgeOperations = (
    recordHistory: () => void,
    onShowConnectMenu?: (position: { x: number; y: number }, sourceId: string, sourceHandle: string | null) => void
) => {
    const { nodes, edges, setNodes, setEdges, setSelectedNodeId, setSelectedEdgeId } = useFlowStore();
    const { screenToFlowPosition } = useReactFlow();

    const connectingNodeId = useRef<string | null>(null);
    const connectingHandleId = useRef<string | null>(null);
    const isConnectionValid = useRef<boolean>(false);

    // --- Edge Updates ---
    const updateEdge = useCallback((id: string, updates: Partial<Edge>) => {
        recordHistory();
        setEdges((eds) => eds.map((edge) => edge.id === id ? { ...edge, ...updates } : edge));
    }, [setEdges, recordHistory]);

    const onEdgeUpdate = useCallback((oldEdge: Edge, newConnection: Connection) => {
        recordHistory();
        setEdges((eds) => {
            return eds.map((edge) => {
                if (edge.id === oldEdge.id) {
                    return {
                        ...edge,
                        source: newConnection.source || edge.source,
                        target: newConnection.target || edge.target,
                        sourceHandle: newConnection.sourceHandle,
                        targetHandle: newConnection.targetHandle,
                    };
                }
                return edge;
            });
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
        const isDuplicate = edges.some(e =>
            e.source === params.source &&
            e.target === params.target &&
            e.sourceHandle === params.sourceHandle &&
            e.targetHandle === params.targetHandle
        );

        if (isDuplicate) return;

        recordHistory();
        setEdges((eds) =>
            addEdge({
                ...params,
                ...DEFAULT_EDGE_OPTIONS,
            }, eds)
        );
    }, [edges, setEdges, recordHistory]);

    const onConnectStart = useCallback((_, { nodeId, handleId }: { nodeId: string | null; handleId: string | null }) => {
        connectingNodeId.current = nodeId;
        connectingHandleId.current = handleId;
        isConnectionValid.current = false;
    }, []);

    const onConnectEnd = useCallback(
        (event: any) => {
            if (!connectingNodeId.current) return;
            if (isConnectionValid.current) return;

            const { clientX, clientY } = event;
            const position = screenToFlowPosition({ x: clientX, y: clientY });

            // PHASE 1: Auto-Snap
            let closestHandle: { nodeId: string, handleId: string, dist: number } | null = null;

            // Use current nodes from store to ensure fresh state if needed
            // but `nodes` from hook dependency should be fine
            nodes.forEach(node => {
                const hPoints = [
                    { id: 'top', x: node.position.x + NODE_WIDTH / 2, y: node.position.y },
                    { id: 'bottom', x: node.position.x + NODE_WIDTH / 2, y: node.position.y + NODE_HEIGHT },
                    { id: 'left', x: node.position.x, y: node.position.y + NODE_HEIGHT / 2 },
                    { id: 'right', x: node.position.x + NODE_WIDTH, y: node.position.y + NODE_HEIGHT / 2 },
                ];

                hPoints.forEach(hp => {
                    const dist = Math.sqrt((hp.x - position.x) ** 2 + (hp.y - position.y) ** 2);
                    if (dist < 50 && (!closestHandle || dist < closestHandle.dist)) {
                        closestHandle = { nodeId: node.id, handleId: hp.id, dist };
                    }
                });
            });

            if (closestHandle) {
                const connection = {
                    source: connectingNodeId.current,
                    sourceHandle: connectingHandleId.current,
                    target: (closestHandle as any).nodeId,
                    targetHandle: (closestHandle as any).handleId,
                } as Connection;

                const isDuplicate = edges.some(e =>
                    e.source === connection.source &&
                    e.target === connection.target &&
                    e.sourceHandle === connection.sourceHandle &&
                    e.targetHandle === connection.targetHandle
                );

                if (isDuplicate) return;

                onConnect(connection);
                return;
            }

            // PHASE 2: Context Menu
            const targetIsPane = event.target.classList.contains('react-flow__pane');

            if (targetIsPane && onShowConnectMenu) {
                onShowConnectMenu(
                    { x: clientX, y: clientY },
                    connectingNodeId.current,
                    connectingHandleId.current
                );
            }
        },
        [nodes, edges, screenToFlowPosition, onConnect, onShowConnectMenu]
    );

    const handleAddAndConnect = useCallback((type: string, position: { x: number; y: number }, sourceId: string, sourceHandle: string | null, shape?: NodeData['shape']) => {
        recordHistory();
        const id = `${Date.now()}`;
        const newNode = {
            id,
            position,
            data: {
                label: type === 'annotation' ? 'Note' : (shape === 'cylinder' ? 'Database' : shape === 'parallelogram' ? 'Input / Output' : 'New Node'),
                subLabel: type === 'decision' ? 'Branch' : 'Process Step',
                icon: type === 'decision' ? 'GitBranch' : (type === 'annotation' ? 'StickyNote' : (shape === 'cylinder' ? 'Database' : 'Settings')),
                color: type === 'annotation' ? 'yellow' : (type === 'decision' ? 'amber' : (shape === 'cylinder' ? 'emerald' : 'slate')),
                ...(shape ? { shape } : {}),
            },
            type,
        };

        setNodes((nds) => nds.concat(newNode));
        setEdges((eds) =>
            eds.concat({
                id: `e-${sourceId}-${id}`,
                source: sourceId,
                sourceHandle,
                target: id,
                ...DEFAULT_EDGE_OPTIONS,
            })
        );
        setSelectedNodeId(id);
    }, [setNodes, setEdges, recordHistory, setSelectedNodeId]);

    return {
        updateEdge,
        deleteEdge,
        onConnect,
        onConnectStart,
        onConnectEnd,
        onEdgeUpdate,
        handleAddAndConnect
    };
};
