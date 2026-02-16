import { useEffect, useCallback } from 'react';
import { useReactFlow, MarkerType } from 'reactflow';

/**
 * Edge-specific keyboard shortcuts.
 * Must be used within a ReactFlowProvider.
 *
 * Shortcuts (when an edge is selected):
 *   Delete / Backspace — delete edge
 *   R — reverse direction
 *   B — toggle bidirectional
 */
export function useEdgeInteractions() {
    const { getEdges, setEdges, getNodes } = useReactFlow();

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        // Skip if user is typing in an input/textarea
        const tag = (event.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

        const edges = getEdges();
        const selectedEdges = edges.filter((e) => e.selected);
        if (selectedEdges.length === 0) return;

        switch (event.key.toLowerCase()) {
            case 'r': {
                // Reverse direction of selected edges
                event.preventDefault();
                setEdges((eds) =>
                    eds.map((e) => {
                        if (!e.selected) return e;
                        return {
                            ...e,
                            source: e.target,
                            target: e.source,
                            sourceHandle: e.targetHandle,
                            targetHandle: e.sourceHandle,
                        };
                    })
                );
                break;
            }
            case 'b': {
                // Toggle bidirectional
                event.preventDefault();
                setEdges((eds) =>
                    eds.map((e) => {
                        if (!e.selected) return e;
                        const isBidirectional = !!e.markerStart;
                        return {
                            ...e,
                            markerStart: isBidirectional
                                ? undefined
                                : { type: MarkerType.ArrowClosed, color: (e.style?.stroke as string) || '#94a3b8' },
                        };
                    })
                );
                break;
            }
            default:
                break;
        }
    }, [getEdges, setEdges]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}
