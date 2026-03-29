import { describe, expect, it } from 'vitest';
import { computeFlowCanvasViewState } from './useFlowCanvasViewState';
import type { FlowEdge, FlowNode } from '@/lib/types';
import type { Layer } from '@/store/types';

function createNode(id: string, overrides: Partial<FlowNode> = {}): FlowNode {
    return {
        id,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: { label: id, ...overrides.data },
        ...overrides,
    } as FlowNode;
}

function createEdge(id: string, source: string, target: string): FlowEdge {
    return {
        id,
        source,
        target,
    } as FlowEdge;
}

describe('computeFlowCanvasViewState', () => {
    it('hides locked-layer nodes and filters disconnected edges', () => {
        const layers: Layer[] = [
            { id: 'default', name: 'Default', visible: true, locked: false },
            { id: 'hidden', name: 'Hidden', visible: false, locked: true },
        ];
        const nodes = [
            createNode('visible'),
            createNode('hidden', { data: { label: 'hidden', layerId: 'hidden' } }),
        ];
        const edges = [
            createEdge('edge-visible', 'visible', 'visible'),
            createEdge('edge-hidden', 'visible', 'hidden'),
        ];

        const result = computeFlowCanvasViewState({
            nodes,
            edges,
            layers,
            showGrid: true,
            largeGraphSafetyMode: 'off',
            largeGraphSafetyProfile: 'balanced',
        });

        expect(result.layerAdjustedNodes[1]?.hidden).toBe(true);
        expect(result.layerAdjustedNodes[1]?.draggable).toBe(false);
        expect(result.effectiveEdges.map((edge) => edge.id)).toEqual(['edge-visible']);
        expect(result.effectiveShowGrid).toBe(true);
    });

    it('disables the grid when large-graph safety mode is active', () => {
        const nodes = Array.from({ length: 301 }, (_, index) => createNode(`node-${index}`));

        const result = computeFlowCanvasViewState({
            nodes,
            edges: [],
            layers: [{ id: 'default', name: 'Default', visible: true, locked: false }],
            showGrid: true,
            largeGraphSafetyMode: 'auto',
            largeGraphSafetyProfile: 'balanced',
        });

        expect(result.safetyModeActive).toBe(true);
        expect(result.viewportCullingEnabled).toBe(true);
        expect(result.effectiveShowGrid).toBe(false);
    });

    it('activates safety mode for edge-dense graphs even when node count is modest', () => {
        const nodes = Array.from({ length: 80 }, (_, index) => createNode(`node-${index}`));
        const edges = Array.from({ length: 190 }, (_, index) => createEdge(`edge-${index}`, 'node-0', `node-${(index % 79) + 1}`));

        const result = computeFlowCanvasViewState({
            nodes,
            edges,
            layers: [{ id: 'default', name: 'Default', visible: true, locked: false }],
            showGrid: true,
            largeGraphSafetyMode: 'auto',
            largeGraphSafetyProfile: 'performance',
        });

        expect(result.safetyModeActive).toBe(true);
        expect(result.effectiveShowGrid).toBe(false);
    });

    it('inherits hidden and locked state from parent sections', () => {
        const nodes = [
            createNode('section-1', {
                type: 'section',
                data: { label: 'Section', sectionHidden: true, sectionLocked: true },
            }),
            createNode('child-1', {
                parentId: 'section-1',
                extent: 'parent',
                data: { label: 'Child' },
            }),
        ];

        const result = computeFlowCanvasViewState({
            nodes,
            edges: [createEdge('edge-1', 'child-1', 'child-1')],
            layers: [{ id: 'default', name: 'Default', visible: true, locked: false }],
            showGrid: true,
            largeGraphSafetyMode: 'off',
            largeGraphSafetyProfile: 'balanced',
        });

        expect(result.layerAdjustedNodes[1]?.hidden).toBe(true);
        expect(result.layerAdjustedNodes[1]?.draggable).toBe(false);
        expect(result.effectiveEdges).toHaveLength(0);
    });
});
