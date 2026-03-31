import { useCallback } from 'react';
import { useFlowStore } from '../store';
import { alignNodes, distributeNodes } from '../services/AlignDistribute';

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

    const handleGroupNodes = useCallback(() => {}, []);

    const handleWrapInSection = useCallback(() => {}, []);

    return {
        handleAlignNodes,
        handleDistributeNodes,
        handleGroupNodes,
        handleWrapInSection,
    };
};
