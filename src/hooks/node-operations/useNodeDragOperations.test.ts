import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useFlowStore } from '../../store';
import { useNodeDragOperations } from './useNodeDragOperations';
import { requestNodeLabelEdit } from '../nodeLabelEditRequest';
import type { FlowNode } from '@/lib/types';

vi.mock('../../store', () => ({
    useFlowStore: Object.assign(vi.fn(), {
        getState: vi.fn(),
    }),
}));

vi.mock('../nodeLabelEditRequest', () => ({
    requestNodeLabelEdit: vi.fn(),
}));

const mockSetNodes = vi.fn();
const mockSetEdges = vi.fn();
const mockSetSelectedNodeId = vi.fn();
const mockSetHoveredSectionId = vi.fn();
const mockState = {
    nodes: [],
    edges: [],
    viewSettings: { smartRoutingEnabled: false },
    setEdges: mockSetEdges,
    setHoveredSectionId: mockSetHoveredSectionId,
};

beforeEach(() => {
    vi.mocked(useFlowStore).mockReturnValue({
        setNodes: mockSetNodes,
        setEdges: mockSetEdges,
        setSelectedNodeId: mockSetSelectedNodeId,
        setHoveredSectionId: mockSetHoveredSectionId,
    } as never);
    vi.mocked(useFlowStore.getState).mockReturnValue(mockState as never);
    vi.clearAllMocks();
    vi.mocked(useFlowStore).mockReturnValue({
        setNodes: mockSetNodes,
        setEdges: mockSetEdges,
        setSelectedNodeId: mockSetSelectedNodeId,
        setHoveredSectionId: mockSetHoveredSectionId,
    } as never);
    vi.mocked(useFlowStore.getState).mockReturnValue(mockState as never);
});

const makeMouseEvent = (altKey = false) => ({ altKey } as React.MouseEvent);
const makeNode = (id = 'node-1'): FlowNode => ({ id, type: 'process', position: { x: 0, y: 0 }, data: {} } as FlowNode);

describe('useNodeDragOperations', () => {
    const recordHistory = vi.fn();

    it('onNodeDoubleClick calls setSelectedNodeId and requestNodeLabelEdit', () => {
        const { result } = renderHook(() => useNodeDragOperations(recordHistory));
        const node = makeNode();
        result.current.onNodeDoubleClick(makeMouseEvent(), node);
        expect(mockSetSelectedNodeId).toHaveBeenCalledWith('node-1');
        expect(vi.mocked(requestNodeLabelEdit)).toHaveBeenCalledWith('node-1');
    });

    it('onNodeDragStart calls recordHistory', () => {
        const { result } = renderHook(() => useNodeDragOperations(recordHistory));
        result.current.onNodeDragStart(makeMouseEvent(), makeNode());
        expect(recordHistory).toHaveBeenCalled();
    });

    it('onNodeDragStart with altKey=false does NOT call setNodes', () => {
        const { result } = renderHook(() => useNodeDragOperations(recordHistory));
        result.current.onNodeDragStart(makeMouseEvent(false), makeNode());
        expect(mockSetNodes).not.toHaveBeenCalled();
    });

    it('onNodeDragStart with altKey=true creates a duplicate node (calls setNodes)', () => {
        const { result } = renderHook(() => useNodeDragOperations(recordHistory));
        result.current.onNodeDragStart(makeMouseEvent(true), makeNode());
        expect(mockSetNodes).toHaveBeenCalled();
    });
});
