import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FlowNode } from '@/lib/types';
import { useFlowCanvasSelectionTools } from './useFlowCanvasSelectionTools';

function createNode(id: string, overrides: Partial<FlowNode> = {}): FlowNode {
    return {
        id,
        type: 'custom',
        position: { x: 100, y: 120 },
        width: 220,
        height: 120,
        selected: false,
        data: { label: id, backgroundColor: '#ffffff', ...overrides.data },
        ...overrides,
    } as FlowNode;
}

describe('useFlowCanvasSelectionTools', () => {
    it('keeps drag guide handling working for the selected node', () => {
        const selectedNode = createNode('node-1', {
            selected: true,
            data: { label: 'node-1', backgroundColor: '#ff6600' },
        });
        const onNodeDragStart = vi.fn();
        const onNodeDrag = vi.fn();
        const onNodeDragStop = vi.fn();
        const startInteractionLowDetail = vi.fn();
        const endInteractionLowDetail = vi.fn();

        const hook = renderHook(() =>
            useFlowCanvasSelectionTools({
                layerAdjustedNodes: [selectedNode],
                edges: [],
                alignmentGuidesEnabled: true,
                toTypedFlowNode: (node) => node as FlowNode,
                onNodeDragStart,
                onNodeDrag,
                onNodeDragStop,
                startInteractionLowDetail,
                endInteractionLowDetail,
            })
        );

        act(() => {
            hook.result.current.handleNodeDragStart({}, selectedNode);
            hook.result.current.handleNodeDrag({}, selectedNode, []);
        });

        expect(startInteractionLowDetail).toHaveBeenCalledTimes(1);
        expect(onNodeDragStart).toHaveBeenCalledTimes(1);
        expect(onNodeDrag).toHaveBeenCalledTimes(1);
        expect(hook.result.current.alignmentGuides.verticalFlowX).toBeNull();
        expect(hook.result.current.alignmentGuides.horizontalFlowY).toBeNull();

        act(() => {
            hook.result.current.handleNodeDragStop({}, selectedNode);
        });

        expect(onNodeDragStop).toHaveBeenCalledTimes(1);
        expect(endInteractionLowDetail).toHaveBeenCalledTimes(1);
        expect(hook.result.current.alignmentGuides).toEqual({
            verticalFlowX: null,
            horizontalFlowY: null,
        });
    });
});
