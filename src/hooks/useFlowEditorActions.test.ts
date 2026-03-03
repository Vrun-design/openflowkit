import { act, renderHook } from '@testing-library/react';
import type { TFunction } from 'i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFlowEditorActions } from './useFlowEditorActions';
import type { FlowEdge, FlowNode } from '@/lib/types';

vi.mock('@/services/openFlowDSLExporter', () => ({
    toOpenFlowDSL: vi.fn(() => 'mock-dsl'),
}));

vi.mock('@/services/figmaExportService', () => ({
    toFigmaSVG: vi.fn(() => '<svg />'),
}));

function createNode(id: string): FlowNode {
    return {
        id,
        type: 'process',
        position: { x: 0, y: 0 },
        data: { label: id, subLabel: '', color: 'slate' },
    };
}

function createEdge(id: string, source: string, target: string): FlowEdge {
    return { id, source, target };
}

function createTranslator(fn: (key: string, options?: Record<string, unknown>) => string): TFunction {
    return fn as unknown as TFunction;
}

describe('useFlowEditorActions', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn().mockResolvedValue(undefined),
            },
        });
    });

    it('copies OpenFlow DSL and shows success toast', async () => {
        const addToast = vi.fn();
        const { result } = renderHook(() =>
            useFlowEditorActions({
                nodes: [createNode('n1')],
                edges: [createEdge('e1', 'n1', 'n1')],
                recordHistory: vi.fn(),
                setNodes: vi.fn(),
                setEdges: vi.fn(),
                fitView: vi.fn(),
                t: createTranslator((key: string) => key),
                addToast,
            })
        );

        await act(async () => {
            await result.current.handleExportOpenFlowDSL();
        });

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('mock-dsl');
        expect(addToast).toHaveBeenCalledWith('flowEditor.dslCopied', 'success');
    });

    it('shows error toast when Figma export copy fails', async () => {
        const addToast = vi.fn();
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new Error('copy failed'));

        const { result } = renderHook(() =>
            useFlowEditorActions({
                nodes: [createNode('n1')],
                edges: [createEdge('e1', 'n1', 'n1')],
                recordHistory: vi.fn(),
                setNodes: vi.fn(),
                setEdges: vi.fn(),
                fitView: vi.fn(),
                t: createTranslator((key: string, options?: Record<string, unknown>) => options?.message ? `${key}:${String(options.message)}` : key),
                addToast,
            })
        );

        await act(async () => {
            await result.current.handleExportFigma();
        });

        expect(addToast).toHaveBeenCalledWith('flowEditor.figmaExportFailed:copy failed', 'error');
    });
});
