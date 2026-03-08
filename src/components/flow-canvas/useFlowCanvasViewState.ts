import type { FlowEdge, FlowNode } from '@/lib/types';
import type { Layer, ViewSettings } from '@/store/types';
import {
    getSafetyAdjustedEdges,
    isLargeGraphSafetyActive,
    shouldEnableViewportCulling,
} from './largeGraphSafetyMode';

interface FlowCanvasViewStateParams {
    nodes: FlowNode[];
    edges: FlowEdge[];
    layers: Layer[];
    showGrid: boolean;
    largeGraphSafetyMode: ViewSettings['largeGraphSafetyMode'];
    largeGraphSafetyProfile: ViewSettings['largeGraphSafetyProfile'];
}

interface FlowCanvasViewState {
    safetyModeActive: boolean;
    viewportCullingEnabled: boolean;
    effectiveShowGrid: boolean;
    layerAdjustedNodes: FlowNode[];
    effectiveEdges: FlowEdge[];
}

function buildLayerLookup(layers: Layer[]): Map<string, Layer> {
    return new Map(layers.map((layer) => [layer.id, layer]));
}

function applyLayerStateToNode(node: FlowNode, layerById: Map<string, Layer>): FlowNode {
    const layerId = node.data?.layerId ?? 'default';
    const layer = layerById.get(layerId);
    const isVisible = layer?.visible ?? true;
    const isLocked = layer?.locked ?? false;
    const nextHidden = !isVisible;
    const nextSelected = isVisible ? Boolean(node.selected) : false;
    const nextDraggable = !isLocked;

    if (
        node.hidden === nextHidden
        && node.selected === nextSelected
        && node.draggable === nextDraggable
    ) {
        return node;
    }

    return {
        ...node,
        hidden: nextHidden,
        selected: nextSelected,
        draggable: nextDraggable,
    };
}

function getLayerAdjustedNodes(nodes: FlowNode[], layers: Layer[]): FlowNode[] {
    const layerById = buildLayerLookup(layers);
    return nodes.map((node) => applyLayerStateToNode(node, layerById));
}

function getVisibleEdges(nodes: FlowNode[], edges: FlowEdge[]): FlowEdge[] {
    const visibleNodeIds = new Set(
        nodes
            .filter((node) => !node.hidden)
            .map((node) => node.id)
    );

    return edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target));
}

export function computeFlowCanvasViewState({
    nodes,
    edges,
    layers,
    showGrid,
    largeGraphSafetyMode,
    largeGraphSafetyProfile,
}: FlowCanvasViewStateParams): FlowCanvasViewState {
    const safetyModeActive = isLargeGraphSafetyActive(
        nodes.length,
        edges.length,
        largeGraphSafetyMode,
        largeGraphSafetyProfile
    );
    const viewportCullingEnabled = shouldEnableViewportCulling(safetyModeActive);
    const effectiveShowGrid = showGrid && !safetyModeActive;
    const layerAdjustedNodes = getLayerAdjustedNodes(nodes, layers);
    const visibleEdges = getVisibleEdges(layerAdjustedNodes, edges);
    const effectiveEdges = getSafetyAdjustedEdges(visibleEdges, safetyModeActive);

    return {
        safetyModeActive,
        viewportCullingEnabled,
        effectiveShowGrid,
        layerAdjustedNodes,
        effectiveEdges,
    };
}

export function useFlowCanvasViewState(params: FlowCanvasViewStateParams): FlowCanvasViewState {
    return computeFlowCanvasViewState(params);
}
