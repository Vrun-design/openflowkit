import { useCallback } from 'react';
import type { FlowEdge, FlowNode } from '@/lib/types';
import { createId } from '../lib/id';
import { clearNodeParent } from '@/lib/nodeParent';
import { readLocalStorageString, writeLocalStorageJson } from '@/services/storage/uiLocalStorage';
import { useCanvasActions, useCanvasState } from '@/store/canvasHooks';
import { useSelectionActions } from '@/store/selectionHooks';

const CLIPBOARD_STORAGE_KEY = 'flowmind-clipboard';

export const useClipboardOperations = (recordHistory: () => void) => {
    const { nodes, edges } = useCanvasState();
    const { setNodes, setEdges } = useCanvasActions();
    const { setSelectedNodeId } = useSelectionActions();

    const copySelection = useCallback(() => {
        const selectedNodes = nodes.filter((n) => n.selected);
        const selectedEdges = edges.filter((e) => e.selected);

        if (selectedNodes.length > 0 || selectedEdges.length > 0) {
            const clipboardData = {
                nodes: selectedNodes,
                edges: selectedEdges,
            };
            writeLocalStorageJson(CLIPBOARD_STORAGE_KEY, clipboardData);
        }
    }, [nodes, edges]);

    const pasteSelection = useCallback((position?: { x: number; y: number }) => {
        const clipboardDataStr = readLocalStorageString(CLIPBOARD_STORAGE_KEY);
        if (!clipboardDataStr) return;

        try {
            const { nodes: copiedNodes, edges: copiedEdges } = JSON.parse(clipboardDataStr);

            if (!copiedNodes || !Array.isArray(copiedNodes)) return;

            recordHistory();

            let offsetX = 50;
            let offsetY = 50;

            if (position && copiedNodes.length > 0) {
                const minX = Math.min(...copiedNodes.map((n: FlowNode) => n.position.x));
                const minY = Math.min(...copiedNodes.map((n: FlowNode) => n.position.y));
                offsetX = position.x - minX;
                offsetY = position.y - minY;
            }

            const idMap = new Map<string, string>();

            const newNodes = copiedNodes.map((node: FlowNode) => {
                const newId = createId();
                idMap.set(node.id, newId);

                return {
                    ...node,
                    ...clearNodeParent(node),
                    id: newId,
                    position: {
                        x: position ? node.position.x + offsetX : node.position.x + 50,
                        y: position ? node.position.y + offsetY : node.position.y + 50
                    },
                    selected: true
                };
            });

            const newEdges = copiedEdges
                .filter((edge: FlowEdge) => idMap.has(edge.source) && idMap.has(edge.target))
                .map((edge: FlowEdge) => ({
                    ...edge,
                    id: createId('e'),
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
