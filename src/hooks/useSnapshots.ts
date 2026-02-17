import { useState, useCallback, useEffect } from 'react';
import { FlowNode, FlowEdge, FlowSnapshot } from '@/lib/types';

const STORAGE_KEY = 'flowmind_snapshots';

export const useSnapshots = () => {
    const [snapshots, setSnapshots] = useState<FlowSnapshot[]>(() => {
        if (typeof window === 'undefined') return [];
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Failed to parse snapshots', e);
            }
        }
        return [];
    });

    const saveSnapshot = useCallback((name: string, nodes: FlowNode[], edges: FlowEdge[]) => {
        const newSnapshot: FlowSnapshot = {
            id: crypto.randomUUID(),
            name,
            timestamp: new Date().toISOString(),
            nodes,
            edges,
        };

        setSnapshots(prev => {
            const updated = [newSnapshot, ...prev];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);

    const deleteSnapshot = useCallback((id: string) => {
        setSnapshots(prev => {
            const updated = prev.filter(s => s.id !== id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);

    const restoreSnapshot = useCallback((snapshot: FlowSnapshot, setNodes: (n: FlowNode[]) => void, setEdges: (e: FlowEdge[]) => void) => {
        // Deep copy to avoid reference issues
        const nodesCopy = JSON.parse(JSON.stringify(snapshot.nodes));
        const edgesCopy = JSON.parse(JSON.stringify(snapshot.edges));
        setNodes(nodesCopy);
        setEdges(edgesCopy);
    }, []);

    return { snapshots, saveSnapshot, deleteSnapshot, restoreSnapshot };
};
