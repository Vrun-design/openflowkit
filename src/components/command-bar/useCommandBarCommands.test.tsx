import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCommandBarCommands } from './useCommandBarCommands';

describe('useCommandBarCommands', () => {
    it('exposes Studio launcher actions from the root command list', () => {
        const onOpenStudioAI = vi.fn();
        const onOpenStudioOpenFlow = vi.fn();
        const onOpenStudioMermaid = vi.fn();

        const { result } = renderHook(() =>
            useCommandBarCommands({
                settings: {
                    showGrid: true,
                    onToggleGrid: vi.fn(),
                    snapToGrid: false,
                    onToggleSnap: vi.fn(),
                },
                onUndo: vi.fn(),
                onRedo: vi.fn(),
                onOpenStudioAI,
                onOpenStudioOpenFlow,
                onOpenStudioMermaid,
                hasImport: true,
            })
        );

        const ids = result.current.map((command) => command.id);
        expect(ids).toEqual([
            'studio-ai',
            'import',
            'templates',
            'assets',
            'search-nodes',
            'layout',
            'studio-openflow',
            'studio-mermaid',
            'toggle-grid',
            'toggle-snap',
            'undo',
            'redo',
            'select-all-edges',
        ]);

        expect(result.current.find((command) => command.id === 'studio-ai')?.tier).toBe('core');
        expect(result.current.find((command) => command.id === 'import')?.tier).toBe('core');
        expect(result.current.find((command) => command.id === 'templates')?.tier).toBe('core');
        expect(result.current.find((command) => command.id === 'layout')?.tier).toBe('core');
        expect(result.current.find((command) => command.id === 'assets')?.tier).toBe('advanced');
        expect(result.current.find((command) => command.id === 'studio-openflow')?.tier).toBe('advanced');

        result.current.find((command) => command.id === 'studio-ai')?.action?.();
        result.current.find((command) => command.id === 'studio-openflow')?.action?.();
        result.current.find((command) => command.id === 'studio-mermaid')?.action?.();

        expect(onOpenStudioAI).toHaveBeenCalledTimes(1);
        expect(onOpenStudioOpenFlow).toHaveBeenCalledTimes(1);
        expect(onOpenStudioMermaid).toHaveBeenCalledTimes(1);
    });
});
