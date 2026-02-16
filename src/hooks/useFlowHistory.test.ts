import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFlowHistory } from './useFlowHistory';
import { useFlowStore } from '../store';

// Helper to reset store
const resetStore = () => {
    const { setNodes, setEdges } = useFlowStore.getState();
    setNodes([]);
    setEdges([]);
};

describe('useFlowHistory', () => {
    beforeEach(() => {
        act(() => {
            const { setNodes, setEdges } = useFlowStore.getState();
            setNodes([]);
            setEdges([]);
        });
    });

    it('should record history', () => {
        const { result } = renderHook(() => useFlowHistory());

        act(() => {
            useFlowStore.getState().setNodes([{ id: '1', type: 'process', position: { x: 0, y: 0 }, data: { label: 'A', subLabel: '', color: 'blue' } }]);
        });

        act(() => {
            result.current.recordHistory();
        });

        expect(result.current.past).toHaveLength(1);
        expect(result.current.canUndo).toBe(true);
    });

    it('should undo changes', () => {
        const { result } = renderHook(() => useFlowHistory());

        // Initial state
        act(() => {
            useFlowStore.getState().setNodes([{ id: '1', type: 'process', position: { x: 0, y: 0 }, data: { label: 'Initial', subLabel: '', color: 'blue' } }]);
        });

        act(() => {
            result.current.recordHistory();
        });

        // Change state
        act(() => {
            useFlowStore.getState().setNodes([{ id: '1', type: 'process', position: { x: 0, y: 0 }, data: { label: 'Changed', subLabel: '', color: 'blue' } }]);
        });

        // Undo
        act(() => {
            result.current.undo();
        });

        const { nodes } = useFlowStore.getState();
        expect(nodes).toHaveLength(1);
        expect(nodes[0].data.label).toBe('Initial');
        expect(result.current.past).toHaveLength(0);
        expect(result.current.future).toHaveLength(1);
    });

    it('should redo changes', () => {
        const { result } = renderHook(() => useFlowHistory());

        act(() => {
            useFlowStore.getState().setNodes([{ id: '1', type: 'process', position: { x: 0, y: 0 }, data: { label: 'A', subLabel: '', color: 'blue' } }]);
        });

        act(() => {
            result.current.recordHistory();
        });

        act(() => {
            useFlowStore.getState().setNodes([{ id: '1', type: 'process', position: { x: 0, y: 0 }, data: { label: 'B', subLabel: '', color: 'blue' } }]);
        });

        act(() => {
            result.current.undo();
        });

        expect(useFlowStore.getState().nodes[0].data.label).toBe('A');

        act(() => {
            result.current.redo();
        });

        expect(useFlowStore.getState().nodes[0].data.label).toBe('B');
    });

    it('should limit history size', () => {
        const { result } = renderHook(() => useFlowHistory());

        act(() => {
            for (let i = 0; i < 30; i++) {
                result.current.recordHistory();
            }
        });

        expect(result.current.past.length).toBe(20); // MAX_HISTORY = 20
    });
});
