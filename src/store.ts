import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { INITIAL_EDGES, INITIAL_NODES } from './constants';
import { createAIAndSelectionActions } from './store/actions/createAIAndSelectionActions';
import { createBrandActions } from './store/actions/createBrandActions';
import { createCanvasActions } from './store/actions/createCanvasActions';
import { createDesignSystemActions } from './store/actions/createDesignSystemActions';
import { createTabActions } from './store/actions/createTabActions';
import { createViewActions } from './store/actions/createViewActions';
import {
    DEFAULT_AI_SETTINGS,
    DEFAULT_BRAND_CONFIG,
    DEFAULT_BRAND_KIT,
    DEFAULT_DESIGN_SYSTEM,
    INITIAL_GLOBAL_EDGE_OPTIONS,
    INITIAL_VIEW_SETTINGS,
} from './store/defaults';
import type { FlowState } from './store/types';

export {
    DEFAULT_AI_SETTINGS,
    DEFAULT_BRAND_CONFIG,
    DEFAULT_BRAND_KIT,
    DEFAULT_DESIGN_SYSTEM,
};
export type {
    AIProvider,
    AISettings,
    BrandConfig,
    BrandKit,
    CustomHeaderConfig,
    FlowState as FlowStoreState,
    ViewSettings,
} from './store/types';

export const useFlowStore = create<FlowState>()(
    persist(
        (set, get) => ({
            nodes: INITIAL_NODES,
            edges: INITIAL_EDGES,
            tabs: [
                {
                    id: 'tab-1',
                    name: 'Untitled Flow',
                    nodes: INITIAL_NODES,
                    edges: INITIAL_EDGES,
                    history: { past: [], future: [] },
                },
            ],
            activeTabId: 'tab-1',
            designSystems: [DEFAULT_DESIGN_SYSTEM],
            activeDesignSystemId: 'default',
            viewSettings: INITIAL_VIEW_SETTINGS,
            globalEdgeOptions: INITIAL_GLOBAL_EDGE_OPTIONS,
            aiSettings: DEFAULT_AI_SETTINGS,
            brandConfig: DEFAULT_BRAND_CONFIG,
            brandKits: [DEFAULT_BRAND_KIT],
            activeBrandKitId: 'default',
            selectedNodeId: null,
            selectedEdgeId: null,
            ...createCanvasActions(set, get),
            ...createTabActions(set, get),
            ...createDesignSystemActions(set),
            ...createViewActions(set),
            ...createAIAndSelectionActions(set),
            ...createBrandActions(set),
        }),
        {
            name: 'openflowkit-storage',
            partialize: (state) => ({
                tabs: state.tabs,
                activeTabId: state.activeTabId,
                designSystems: state.designSystems,
                activeDesignSystemId: state.activeDesignSystemId,
                viewSettings: state.viewSettings,
                globalEdgeOptions: state.globalEdgeOptions,
                aiSettings: state.aiSettings,
                brandConfig: state.brandConfig,
                brandKits: state.brandKits,
                activeBrandKitId: state.activeBrandKitId,
            }),
        }
    )
);
