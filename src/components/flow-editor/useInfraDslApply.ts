import { useCallback } from 'react';
import { parseInfraDslApplyInput } from './infraDslApply';
import type { FlowEdge, FlowNode } from '@/lib/types';

interface UseInfraDslApplyParams {
    addToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning', duration?: number) => void;
    handleCommandBarApply: (nodes: FlowNode[], edges: FlowEdge[]) => void;
}

export function useInfraDslApply({
    addToast,
    handleCommandBarApply,
}: UseInfraDslApplyParams) {
    return useCallback((dsl: string) => {
        const result = parseInfraDslApplyInput(dsl);
        if (result.status === 'error') {
            addToast(
                `Infrastructure import could not be applied: ${result.message}`,
                'error',
                5000
            );
            return;
        }

        handleCommandBarApply(result.nodes, result.edges);
        addToast('Infrastructure diagram applied to the canvas.', 'success', 3000);
    }, [addToast, handleCommandBarApply]);
}
