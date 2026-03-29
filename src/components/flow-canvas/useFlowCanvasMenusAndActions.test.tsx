import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useFlowCanvasMenusAndActions } from './useFlowCanvasMenusAndActions';

describe('useFlowCanvasMenusAndActions', () => {
    it('clears pane selection and closes the context menu on pane click', () => {
        const onPaneSelectionClear = vi.fn();
        const hook = renderHook(() =>
            useFlowCanvasMenusAndActions({
                onPaneSelectionClear,
                screenToFlowPosition: (position) => position,
                copySelection: vi.fn(),
                pasteSelection: vi.fn(),
                duplicateNode: vi.fn(),
                deleteNode: vi.fn(),
                deleteEdge: vi.fn(),
                updateNodeZIndex: vi.fn(),
                updateNodeType: vi.fn(),
                updateNodeData: vi.fn(),
                fitSectionToContents: vi.fn(),
                releaseFromSection: vi.fn(),
                bringContentsIntoSection: vi.fn(),
                handleAlignNodes: vi.fn(),
                handleDistributeNodes: vi.fn(),
                handleGroupNodes: vi.fn(),
                handleWrapInSection: vi.fn(),
                nodes: [],
            })
        );

        act(() => {
            hook.result.current.onPaneContextMenu({
                preventDefault: vi.fn(),
                clientX: 10,
                clientY: 20,
            } as unknown as React.MouseEvent);
        });

        expect(hook.result.current.contextMenu.isOpen).toBe(true);

        act(() => {
            hook.result.current.onPaneClick();
        });

        expect(onPaneSelectionClear).toHaveBeenCalledTimes(1);
        expect(hook.result.current.contextMenu.isOpen).toBe(false);
    });

    it('exposes section-specific context actions for section nodes', () => {
        const updateNodeData = vi.fn();
        const fitSectionToContents = vi.fn();
        const bringContentsIntoSection = vi.fn();

        const hook = renderHook(() =>
            useFlowCanvasMenusAndActions({
                onPaneSelectionClear: vi.fn(),
                screenToFlowPosition: (position) => position,
                copySelection: vi.fn(),
                pasteSelection: vi.fn(),
                duplicateNode: vi.fn(),
                deleteNode: vi.fn(),
                deleteEdge: vi.fn(),
                updateNodeZIndex: vi.fn(),
                updateNodeType: vi.fn(),
                updateNodeData,
                fitSectionToContents,
                releaseFromSection: vi.fn(),
                bringContentsIntoSection,
                handleAlignNodes: vi.fn(),
                handleDistributeNodes: vi.fn(),
                handleGroupNodes: vi.fn(),
                handleWrapInSection: vi.fn(),
                nodes: [
                    {
                        id: 'section-1',
                        type: 'section',
                        position: { x: 0, y: 0 },
                        data: { label: 'Frame', sectionLocked: false, sectionHidden: false },
                    } as never,
                ],
            })
        );

        act(() => {
            hook.result.current.onNodeContextMenu({
                preventDefault: vi.fn(),
                clientX: 10,
                clientY: 20,
            } as unknown as React.MouseEvent, {
                id: 'section-1',
                type: 'section',
                position: { x: 0, y: 0 },
                data: { label: 'Frame', sectionLocked: false, sectionHidden: false },
            } as never);
        });

        act(() => {
            hook.result.current.contextActions.onFitSectionToContents();
        });
        expect(fitSectionToContents).toHaveBeenCalledWith('section-1');

        act(() => {
            hook.result.current.onNodeContextMenu({
                preventDefault: vi.fn(),
                clientX: 10,
                clientY: 20,
            } as unknown as React.MouseEvent, {
                id: 'section-1',
                type: 'section',
                position: { x: 0, y: 0 },
                data: { label: 'Frame', sectionLocked: false, sectionHidden: false },
            } as never);
            hook.result.current.contextActions.onBringContentsIntoSection();
        });
        expect(bringContentsIntoSection).toHaveBeenCalledWith('section-1');

        act(() => {
            hook.result.current.onNodeContextMenu({
                preventDefault: vi.fn(),
                clientX: 10,
                clientY: 20,
            } as unknown as React.MouseEvent, {
                id: 'section-1',
                type: 'section',
                position: { x: 0, y: 0 },
                data: { label: 'Frame', sectionLocked: false, sectionHidden: false },
            } as never);
            hook.result.current.contextActions.onToggleSectionLock();
        });
        expect(updateNodeData).toHaveBeenCalledWith('section-1', { sectionLocked: true });
    });
});
