import { useCallback } from 'react';
import { Node, Edge } from 'reactflow';
import { useFlowStore } from '../store';

export const useClipboardOperations = (recordHistory: () => void) => {
    const { nodes, edges, setNodes, setEdges, setSelectedNodeId } = useFlowStore();

    const copySelection = useCallback(() => {
        const selectedNodes = nodes.filter((n) => n.selected);
        const selectedEdges = edges.filter((e) => e.selected);

        if (selectedNodes.length > 0 || selectedEdges.length > 0) {
            const clipboardData = {
                nodes: selectedNodes,
                edges: selectedEdges,
            };
            localStorage.setItem('flowmind-clipboard', JSON.stringify(clipboardData));
        }
    }, [nodes, edges]);

    const pasteSelection = useCallback((position?: { x: number; y: number }) => {
        const clipboardDataStr = localStorage.getItem('flowmind-clipboard');
        if (!clipboardDataStr) return;

        try {
            const { nodes: copiedNodes, edges: copiedEdges } = JSON.parse(clipboardDataStr);

            if (!copiedNodes || !Array.isArray(copiedNodes)) return;

            recordHistory();

            let offsetX = 50;
            let offsetY = 50;

            if (position && copiedNodes.length > 0) {
                const minX = Math.min(...copiedNodes.map((n: Node) => n.position.x));
                const minY = Math.min(...copiedNodes.map((n: Node) => n.position.y));
                offsetX = position.x - minX;
                offsetY = position.y - minY;
            }

            const idMap = new Map<string, string>();

            const newNodes = copiedNodes.map((node: Node) => {
                const newId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                idMap.set(node.id, newId);

                return {
                    ...node,
                    id: newId,
                    position: {
                        x: position ? node.position.x + offsetX : node.position.x + 50,
                        y: position ? node.position.y + offsetY : node.position.y + 50
                    },
                    selected: true,
                    parentNode: undefined,
                    extent: undefined
                };
            });

            const newEdges = copiedEdges
                .filter((edge: Edge) => idMap.has(edge.source) && idMap.has(edge.target))
                .map((edge: Edge) => ({
                    ...edge,
                    id: `e-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    source: idMap.get(edge.source)!,
                    target: idMap.get(edge.target)!,
                    selected: true
                }));

            setNodes((nds) => nds.map(n => ({ ...n, selected: false })).concat(newNodes));
            setEdges((eds) => eds.map(e => ({ ...e, selected: false })).concat(newEdges));

            if (newNodes.length > 0) setSelectedNodeId(newNodes[0].id);
        } catch (error) {
            console.error('Failed to paste from clipboard', error);
        }
    }, [setNodes, setEdges, recordHistory, setSelectedNodeId]);

    return {
        copySelection,
        pasteSelection
    };
};
