import { describe, expect, it } from 'vitest';
import { ConnectionMode, MarkerType, SelectionMode } from '@/lib/reactflowCompat';
import { computeFlowCanvasReactFlowConfig } from './useFlowCanvasReactFlowConfig';

describe('computeFlowCanvasReactFlowConfig', () => {
    it('builds select-mode config with visual quality styling', () => {
        const result = computeFlowCanvasReactFlowConfig({
            visualQualityV2Enabled: true,
            isEffectiveSelectMode: true,
            viewportCullingEnabled: true,
        });

        expect(result.className).toContain('flow-canvas-select-mode');
        expect(result.onlyRenderVisibleElements).toBe(true);
        expect(result.connectionMode).toBe(ConnectionMode.Loose);
        expect(result.selectionOnDrag).toBe(true);
        expect(result.selectionKeyCode).toBe('Shift');
        expect(result.panOnDrag).toEqual([1, 2]);
        expect(result.panActivationKeyCode).toBe('Space');
        expect(result.zoomActivationKeyCode).toEqual(['Meta', 'Control']);
        expect(result.selectionMode).toBe(SelectionMode.Partial);
        expect(result.multiSelectionKeyCode).toBe('Shift');
        expect(result.zoomOnScroll).toBe(false);
        expect(result.zoomOnPinch).toBe(true);
        expect(result.panOnScroll).toBe(true);
        expect(result.panOnScrollMode).toBe('free');
        expect(result.preventScrolling).toBe(true);
        expect(result.zoomOnDoubleClick).toBe(false);
        expect(result.defaultEdgeOptions).toEqual({
            style: { stroke: '#64748b', strokeWidth: 1.5 },
            animated: false,
            markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b', width: 20, height: 20 },
        });
        expect(result.background).toEqual({
            variant: expect.anything(),
            gap: 24,
            size: 1.5,
            color: 'rgba(148,163,184,0.5)',
        });
    });

    it('builds pan-mode config with legacy styling', () => {
        const result = computeFlowCanvasReactFlowConfig({
            visualQualityV2Enabled: false,
            isEffectiveSelectMode: false,
            viewportCullingEnabled: false,
        });

        expect(result.className).toContain('flow-canvas-pan-mode');
        expect(result.onlyRenderVisibleElements).toBe(false);
        expect(result.selectionOnDrag).toBe(false);
        expect(result.selectionKeyCode).toBe('Shift');
        expect(result.panOnDrag).toEqual([0, 1, 2]);
        expect(result.panActivationKeyCode).toBe('Space');
        expect(result.zoomActivationKeyCode).toEqual(['Meta', 'Control']);
        expect(result.selectionMode).toBeUndefined();
        expect(result.multiSelectionKeyCode).toBe('Shift');
        expect(result.zoomOnScroll).toBe(false);
        expect(result.zoomOnPinch).toBe(true);
        expect(result.panOnScroll).toBe(true);
        expect(result.panOnScrollMode).toBe('free');
        expect(result.preventScrolling).toBe(true);
        expect(result.zoomOnDoubleClick).toBe(false);
        expect(result.defaultEdgeOptions).toEqual({
            style: { stroke: '#94a3b8', strokeWidth: 2 },
            animated: false,
            markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8', width: 20, height: 20 },
        });
        expect(result.background.gap).toBe(20);
        expect(result.background.size).toBe(1.25);
        expect(result.background.color).toBe('#94a3b8');
    });
});
