import { useCallback } from 'react';
import { useFlowStore } from '../store';
import { alignNodes, distributeNodes } from '../services/AlignDistribute';
import { createId } from '../lib/id';
import { ungroupSection, wrapNodesInSection } from './node-operations/groupOperations';

export const useLayoutOperations = (recordHistory: () => void) => {
    const { setNodes } = useFlowStore();

    const handleAlignNodes = useCallback((direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
        const { nodes } = useFlowStore.getState();
        const selectedNodes = nodes.filter(n => n.selected);
        if (selectedNodes.length < 2) return;

        recordHistory();
        const updates = alignNodes(selectedNodes, direction);
        setNodes((nds) => nds.map((n) => {
            const update = updates.find(u => u.id === n.id);
            return update ? { ...n, position: update.position } : n;
        }));
    }, [recordHistory, setNodes]);

    const handleDistributeNodes = useCallback((direction: 'horizontal' | 'vertical') => {
        const { nodes } = useFlowStore.getState();
        const selectedNodes = nodes.filter(n => n.selected);
        if (selectedNodes.length < 3) return;

        recordHistory();
        const updates = distributeNodes(selectedNodes, direction);
        setNodes((nds) => nds.map((n) => {
            const update = updates.find(u => u.id === n.id);
            return update ? { ...n, position: update.position } : n;
        }));
    }, [recordHistory, setNodes]);

    // Grouping is wrapping in a section: one container primitive, not two.
    const handleWrapInSection = useCallback(() => {
        const { nodes, setSelectedNodeId } = useFlowStore.getState();
        const selectedIds = nodes.filter((n) => n.selected).map((n) => n.id);
        if (selectedIds.length === 0) return;
        const sectionId = createId();
        const next = wrapNodesInSection(nodes, selectedIds, sectionId, 'Group');
        if (next === nodes) return;
        recordHistory();
        setNodes(() => next);
        setSelectedNodeId(sectionId);
    }, [recordHistory, setNodes]);

    const handleGroupNodes = handleWrapInSection;

    const handleUngroupSection = useCallback((sectionId: string) => {
        const { nodes, setSelectedNodeId } = useFlowStore.getState();
        const next = ungroupSection(nodes, sectionId);
        if (next === nodes) return;
        recordHistory();
        setNodes(() => next);
        setSelectedNodeId(next.find((n) => n.selected)?.id ?? null);
    }, [recordHistory, setNodes]);

    return {
        handleAlignNodes,
        handleDistributeNodes,
        handleGroupNodes,
        handleWrapInSection,
        handleUngroupSection,
    };
};
