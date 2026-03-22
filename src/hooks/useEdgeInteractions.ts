import { useEffect, useCallback } from 'react';
import { useReactFlow, MarkerType } from '@/lib/reactflowCompat';
import type { EdgeData } from '@/lib/types';
import {
    applyArchitectureDirection,
    getDirectionFromMarkers,
    reverseArchitectureDirection,
} from '@/components/properties/edge/architectureSemantics';

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
    const { getEdges, setEdges } = useReactFlow();

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
                        const edgeData = (e.data ?? {}) as EdgeData;
                        const currentDirection = edgeData.archDirection || getDirectionFromMarkers(e);
                        const reversedDirection = reverseArchitectureDirection(currentDirection);
                        const swappedArchitectureEdge = edgeData.archDirection
                            ? {
                                ...e,
                                data: {
                                    ...edgeData,
                                    archDirection: reversedDirection,
                                    archSourceSide: edgeData.archTargetSide,
                                    archTargetSide: edgeData.archSourceSide,
                                },
                            }
                            : e;
                        const architectureDirectionUpdates = applyArchitectureDirection(
                            swappedArchitectureEdge,
                            reversedDirection
                        );
                        return {
                            ...e,
                            source: e.target,
                            target: e.source,
                            sourceHandle: e.targetHandle,
                            targetHandle: e.sourceHandle,
                            ...architectureDirectionUpdates,
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
                        const nextDirection = isBidirectional ? '-->' : '<-->';
                        const architectureUpdates = applyArchitectureDirection(e, nextDirection);
                        return {
                            ...e,
                            markerStart: isBidirectional
                                ? undefined
                                : { type: MarkerType.ArrowClosed, color: (e.style?.stroke as string) || '#94a3b8' },
                            ...architectureUpdates,
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
