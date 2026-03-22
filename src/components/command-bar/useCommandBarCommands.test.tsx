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
            })
        );

        const ids = result.current.map((command) => command.id);
        expect(ids).toContain('studio-ai');
        expect(ids).toContain('studio-openflow');
        expect(ids).toContain('studio-mermaid');
        expect(ids).toContain('studio-playback');
        expect(ids).toContain('assets');

        result.current.find((command) => command.id === 'studio-ai')?.action?.();
        result.current.find((command) => command.id === 'studio-openflow')?.action?.();
        result.current.find((command) => command.id === 'studio-mermaid')?.action?.();

        expect(onOpenStudioAI).toHaveBeenCalledTimes(1);
        expect(onOpenStudioOpenFlow).toHaveBeenCalledTimes(1);
        expect(onOpenStudioMermaid).toHaveBeenCalledTimes(1);
    });
});
