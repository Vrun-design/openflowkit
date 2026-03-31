import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RefObject } from 'react';
import { useFlowEditorShellController } from './useFlowEditorShellController';

vi.mock('@/hooks/useStoragePressureGuard', () => ({
    useStoragePressureGuard: vi.fn(),
}));

vi.mock('@/hooks/useAnimatedEdgePerformanceWarning', () => ({
    useAnimatedEdgePerformanceWarning: vi.fn(),
}));

function createNode(id: string, selected = false) {
    return {
        id,
        type: 'process',
        position: { x: 0, y: 0 },
        data: { label: id, color: 'slate', shape: 'rounded' },
        selected,
    } as const;
}

describe('useFlowEditorShellController', () => {
    it('opens the import dialog from route state and clears route state after clicking', () => {
        const click = vi.fn();
        const navigate = vi.fn();
        const fileInputRef = {
            current: { click },
        } as unknown as RefObject<HTMLInputElement | null>;

        renderHook(() => useFlowEditorShellController({
            location: {
                pathname: '/flow/123',
                search: '?tab=1',
                hash: '#canvas',
                state: { openImportDialog: true },
            },
            navigate,
            fileInputRef,
            pages: [{ id: 'tab-1', diagramType: 'mindmap' }],
            activePageId: 'tab-1',
            snapshots: [],
            nodes: [createNode('node-1')],
            edges: [],
            selectedNodeId: null,
            selectedEdgeId: null,
            isCommandBarOpen: false,
            isHistoryOpen: false,
            editorMode: 'canvas',
            isArchitectureRulesOpen: false,
            handleExportJSON: vi.fn(),
            onLayout: vi.fn(async () => undefined),
        }));

        expect(click).toHaveBeenCalled();
        expect(navigate).toHaveBeenCalledWith(
            { pathname: '/flow/123', search: '?tab=1', hash: '#canvas' },
            { replace: true, state: null }
        );
    });

    it('derives selected entities, panel visibility, and layout context', async () => {
        const onLayout = vi.fn(async () => undefined);
        const { result } = renderHook(() => useFlowEditorShellController({
            location: {
                pathname: '/flow/123',
                search: '',
                hash: '',
                state: null,
            },
            navigate: vi.fn(),
            fileInputRef: { current: null },
            pages: [{ id: 'tab-1', diagramType: 'mindmap' }],
            activePageId: 'tab-1',
            snapshots: [],
            nodes: [createNode('node-1', true), createNode('node-2')],
            edges: [{ id: 'edge-1', source: 'node-1', target: 'node-2' }],
            selectedNodeId: 'node-1',
            selectedEdgeId: 'edge-1',
            isCommandBarOpen: false,
            isHistoryOpen: false,
            editorMode: 'canvas',
            isArchitectureRulesOpen: false,
            handleExportJSON: vi.fn(),
            onLayout,
        }));

        expect(result.current.selectedNode?.id).toBe('node-1');
        expect(result.current.selectedNodes).toHaveLength(1);
        expect(result.current.selectedEdge?.id).toBe('edge-1');
        expect(result.current.shouldRenderPanels).toBe(true);

        await act(async () => {
            result.current.handleLayoutWithContext();
        });

        expect(onLayout).toHaveBeenCalledWith('TB', 'layered', 'normal', 'mindmap');
    });
});
