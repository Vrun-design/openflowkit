import React, { createContext, useCallback, useContext, useMemo } from 'react';
import type { FlowEdge, FlowNode, FlowSnapshot } from '@/lib/types';
import { computeDiagramDiff, type DiagramDiff } from '@/services/diagramDiff/diffEngine';

interface DiagramDiffContextValue {
    isActive: boolean;
    baselineSnapshot: FlowSnapshot | null;
    diff: DiagramDiff | null;
    addedNodeIds: ReadonlySet<string>;
    changedNodeIds: ReadonlySet<string>;
    stopCompare: () => void;
}

const DiagramDiffContext = createContext<DiagramDiffContextValue>({
    isActive: false,
    baselineSnapshot: null,
    diff: null,
    addedNodeIds: new Set(),
    changedNodeIds: new Set(),
    stopCompare: () => undefined,
});

export function useDiagramDiff(): DiagramDiffContextValue {
    return useContext(DiagramDiffContext);
}

interface DiagramDiffProviderProps {
    nodes: FlowNode[];
    edges: FlowEdge[];
    /** Controlled: the snapshot to compare against (null = diff mode off). */
    baselineSnapshot: FlowSnapshot | null;
    onStopCompare: () => void;
    children: React.ReactNode;
}

export function DiagramDiffProvider({ nodes, edges, baselineSnapshot, onStopCompare, children }: DiagramDiffProviderProps): React.ReactElement {
    const stopCompare = useCallback(() => onStopCompare(), [onStopCompare]);

    const diff = useMemo(() => {
        if (!baselineSnapshot) return null;
        return computeDiagramDiff({ nodes, edges }, { nodes: baselineSnapshot.nodes, edges: baselineSnapshot.edges });
    }, [nodes, edges, baselineSnapshot]);

    const addedNodeIds = useMemo(() => new Set(diff?.addedNodeIds ?? []), [diff]);
    const changedNodeIds = useMemo(() => new Set(diff?.changedNodeIds ?? []), [diff]);

    const value = useMemo(
        () => ({ isActive: Boolean(baselineSnapshot), baselineSnapshot, diff, addedNodeIds, changedNodeIds, stopCompare }),
        [baselineSnapshot, diff, addedNodeIds, changedNodeIds, stopCompare],
    );

    return <DiagramDiffContext.Provider value={value}>{children}</DiagramDiffContext.Provider>;
}
