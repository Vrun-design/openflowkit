import { NODE_DEFAULTS } from '@/theme';
import { assignSmartHandles } from '@/services/smartEdgeRouting';
import type { FlowState } from '../types';

type SetFlowState = (partial: Partial<FlowState> | ((state: FlowState) => Partial<FlowState>)) => void;

export function createViewActions(set: SetFlowState): Pick<
    FlowState,
    | 'toggleGrid'
    | 'toggleSnap'
    | 'toggleMiniMap'
    | 'setShortcutsHelpOpen'
    | 'setViewSettings'
    | 'setGlobalEdgeOptions'
    | 'setDefaultIconsEnabled'
    | 'setSmartRoutingEnabled'
    | 'toggleAnalytics'
> {
    return {
        toggleGrid: () => set((state) => ({
            viewSettings: { ...state.viewSettings, showGrid: !state.viewSettings.showGrid },
        })),

        toggleSnap: () => set((state) => ({
            viewSettings: { ...state.viewSettings, snapToGrid: !state.viewSettings.snapToGrid },
        })),

        toggleMiniMap: () => set((state) => ({
            viewSettings: { ...state.viewSettings, showMiniMap: !state.viewSettings.showMiniMap },
        })),

        setShortcutsHelpOpen: (open) => set((state) => ({
            viewSettings: { ...state.viewSettings, isShortcutsHelpOpen: open },
        })),

        setViewSettings: (settings) => set((state) => ({
            viewSettings: { ...state.viewSettings, ...settings },
        })),

        setGlobalEdgeOptions: (options) => set((state) => {
            const newOptions = { ...state.globalEdgeOptions, ...options };

            const updatedEdges = state.edges.map((edge) => ({
                ...edge,
                type: newOptions.type === 'default' ? undefined : newOptions.type,
                animated: newOptions.animated,
                style: {
                    ...edge.style,
                    strokeWidth: newOptions.strokeWidth,
                    ...(newOptions.color ? { stroke: newOptions.color } : {}),
                },
            }));

            return {
                globalEdgeOptions: newOptions,
                edges: updatedEdges,
            };
        }),

        setDefaultIconsEnabled: (enabled) => set((state) => {
            const newViewSettings = { ...state.viewSettings, defaultIconsEnabled: enabled };

            const updatedNodes = state.nodes.map((node) => {
                const defaultIcon = NODE_DEFAULTS[node.type || 'process']?.icon;

                if (enabled) {
                    if (!node.data.icon && !node.data.customIconUrl) {
                        return { ...node, data: { ...node.data, icon: defaultIcon } };
                    }
                } else if (node.data.icon === defaultIcon) {
                    return { ...node, data: { ...node.data, icon: undefined } };
                }

                return node;
            });

            return {
                viewSettings: newViewSettings,
                nodes: updatedNodes,
            };
        }),

        setSmartRoutingEnabled: (enabled) => set((state) => {
            let newEdges = state.edges;
            if (enabled) {
                newEdges = assignSmartHandles(state.nodes, state.edges);
            }

            return {
                viewSettings: { ...state.viewSettings, smartRoutingEnabled: enabled },
                edges: newEdges,
            };
        }),

        toggleAnalytics: (enabled) => set((state) => ({
            viewSettings: { ...state.viewSettings, analyticsEnabled: enabled },
        })),
    };
}
