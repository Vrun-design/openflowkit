import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useFlowEditorStudioController } from './useFlowEditorStudioController';

function createBaseProps(overrides: Partial<Parameters<typeof useFlowEditorStudioController>[0]> = {}) {
    return {
        editorMode: 'canvas' as const,
        selectedNodeId: null,
        selectedEdgeId: null,
        setStudioTab: vi.fn(),
        setStudioCodeMode: vi.fn(),
        setStudioMode: vi.fn(),
        closeCommandBar: vi.fn(),
        setCanvasMode: vi.fn(),
        setSelectedNodeId: vi.fn(),
        setSelectedEdgeId: vi.fn(),
        ...overrides,
    };
}

describe('useFlowEditorStudioController', () => {
    it('opens the AI studio panel and closes the launcher', () => {
        const props = createBaseProps();
        const { result } = renderHook(() => useFlowEditorStudioController(props));

        act(() => {
            result.current.openStudioAI();
        });

        expect(props.setStudioTab).toHaveBeenCalledWith('ai');
        expect(props.setStudioMode).toHaveBeenCalled();
        expect(props.closeCommandBar).toHaveBeenCalled();
    });

    it('opens the code studio panel with the requested code mode', () => {
        const props = createBaseProps();
        const { result } = renderHook(() => useFlowEditorStudioController(props));

        act(() => {
            result.current.openStudioCode('mermaid');
        });

        expect(props.setStudioTab).toHaveBeenCalledWith('code');
        expect(props.setStudioCodeMode).toHaveBeenCalledWith('mermaid');
        expect(props.setStudioMode).toHaveBeenCalled();
        expect(props.closeCommandBar).toHaveBeenCalled();
    });

    it('toggles studio closed by clearing selection and returning to canvas mode', () => {
        const props = createBaseProps({
            editorMode: 'studio',
            selectedNodeId: 'node-1',
            selectedEdgeId: 'edge-1',
        });
        const { result } = renderHook(() => useFlowEditorStudioController(props));

        act(() => {
            result.current.toggleStudioPanel();
        });

        expect(props.setSelectedNodeId).toHaveBeenCalledWith(null);
        expect(props.setSelectedEdgeId).toHaveBeenCalledWith(null);
        expect(props.setCanvasMode).toHaveBeenCalled();
    });

    it('returns to canvas mode when selection changes after studio opens', () => {
        const initialProps = createBaseProps({
            editorMode: 'canvas',
            selectedNodeId: 'node-1',
        });
        const { result, rerender } = renderHook((props) => useFlowEditorStudioController(props), {
            initialProps,
        });

        act(() => {
            result.current.openStudioAI();
        });

        rerender({
            ...initialProps,
            editorMode: 'studio',
            selectedNodeId: 'node-2',
        });

        expect(initialProps.setCanvasMode).toHaveBeenCalled();
    });
});
