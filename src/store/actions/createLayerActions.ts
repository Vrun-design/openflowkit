import { createId } from '@/lib/id';
import type { GetFlowState, SetFlowState } from '../actionFactory';
import type { FlowState } from '../types';
import { syncTabNodesEdges } from './syncTabNodesEdges';

function ensureLayerExists(state: FlowState, layerId: string): boolean {
    return state.layers.some((layer) => layer.id === layerId);
}

function syncLayers(state: FlowState, layers: FlowState['layers']) {
    return {
        layers,
        tabs: syncTabNodesEdges(state.tabs, state.activeTabId, state.nodes, state.edges, layers),
    };
}

export function createLayerActions(set: SetFlowState, _get: GetFlowState): Pick<
    FlowState,
    | 'addLayer'
    | 'renameLayer'
    | 'deleteLayer'
    | 'setActiveLayerId'
    | 'toggleLayerVisibility'
    | 'toggleLayerLock'
    | 'moveLayer'
    | 'moveSelectedNodesToLayer'
    | 'selectNodesInLayer'
> {
    return {
        addLayer: (name = 'New Layer') => {
            const id = createId('layer');
            set((state) => ({
                ...syncLayers(state, [...state.layers, { id, name, visible: true, locked: false }]),
                activeLayerId: id,
            }));
            return id;
        },
        renameLayer: (id, name) => {
            const nextName = name.trim();
            if (!nextName) return;
            set((state) => syncLayers(state, state.layers.map((layer) => (
                    layer.id === id ? { ...layer, name: nextName } : layer
                ))));
        },
        deleteLayer: (id) => {
            if (id === 'default') return;
            set((state) => {
                const exists = state.layers.some((layer) => layer.id === id);
                if (!exists) return {};

                const layers = state.layers.filter((layer) => layer.id !== id);
                const nodes = state.nodes.map((node) => (
                    node.data?.layerId === id
                        ? { ...node, data: { ...node.data, layerId: 'default' } }
                        : node
                ));
                return {
                    layers,
                    tabs: syncTabNodesEdges(
                        state.tabs, state.activeTabId, nodes, state.edges, layers
                    ),
                    activeLayerId: state.activeLayerId === id ? 'default' : state.activeLayerId,
                    nodes,
                };
            });
        },
        setActiveLayerId: (id) => {
            set((state) => (ensureLayerExists(state, id) ? { activeLayerId: id } : {}));
        },
        toggleLayerVisibility: (id) => {
            if (id === 'default') return;
            set((state) => syncLayers(state, state.layers.map((layer) => (
                    layer.id === id ? { ...layer, visible: !layer.visible } : layer
                ))));
        },
        toggleLayerLock: (id) => {
            set((state) => syncLayers(state, state.layers.map((layer) => (
                    layer.id === id ? { ...layer, locked: !layer.locked } : layer
                ))));
        },
        moveLayer: (id, direction) => {
            if (id === 'default') return;
            set((state) => {
                const index = state.layers.findIndex((layer) => layer.id === id);
                if (index === -1) return {};
                const targetIndex = direction === 'up' ? index - 1 : index + 1;
                if (targetIndex < 1 || targetIndex >= state.layers.length) return {};

                const layers = [...state.layers];
                const [moved] = layers.splice(index, 1);
                layers.splice(targetIndex, 0, moved);
                return syncLayers(state, layers);
            });
        },
        moveSelectedNodesToLayer: (layerId) => {
            set((state) => {
                if (!ensureLayerExists(state, layerId)) return {};
                return {
                    nodes: state.nodes.map((node) => (
                        node.selected
                            ? { ...node, data: { ...node.data, layerId } }
                            : node
                    )),
                };
            });
        },
        selectNodesInLayer: (layerId) => {
            set((state) => {
                if (!ensureLayerExists(state, layerId)) return {};
                let firstSelectedId: string | null = null;
                const nodes = state.nodes.map((node) => {
                    const nodeLayerId = node.data?.layerId ?? 'default';
                    const isSelected = nodeLayerId === layerId;
                    if (isSelected && firstSelectedId === null) {
                        firstSelectedId = node.id;
                    }
                    return { ...node, selected: isSelected };
                });
                return {
                    nodes,
                    edges: state.edges.map((edge) => ({ ...edge, selected: false })),
                    selectedNodeId: firstSelectedId,
                    selectedEdgeId: null,
                };
            });
        },
    };
}
