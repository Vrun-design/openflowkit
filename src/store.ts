import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createAIAndSelectionActions } from './store/actions/createAIAndSelectionActions';
import { createBrandActions } from './store/actions/createBrandActions';
import { createCanvasActions } from './store/actions/createCanvasActions';
import { createDesignSystemActions } from './store/actions/createDesignSystemActions';
import { createHistoryActions } from './store/actions/createHistoryActions';
import { createLayerActions } from './store/actions/createLayerActions';
import { createTabActions } from './store/actions/createTabActions';
import { createViewActions } from './store/actions/createViewActions';
import {
    DEFAULT_AI_SETTINGS,
    DEFAULT_BRAND_CONFIG,
    DEFAULT_BRAND_KIT,
    DEFAULT_DESIGN_SYSTEM,
} from './store/defaults';
import type { FlowState } from './store/types';
import { createFlowPersistStorage } from '@/services/storage/flowPersistStorage';
import {
    createInitialFlowState,
    migratePersistedFlowState,
    partializePersistedFlowState,
} from './store/persistence';

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
            ...createInitialFlowState(),
            ...createCanvasActions(set, get),
            ...createHistoryActions(set, get),
            ...createTabActions(set, get),
            ...createDesignSystemActions(set),
            ...createViewActions(set),
            ...createLayerActions(set, get),
            ...createAIAndSelectionActions(set),
            ...createBrandActions(set),
        }),
        {
            name: 'openflowkit-storage',
            storage: createFlowPersistStorage(),
            version: 1,
            migrate: (persistedState) => migratePersistedFlowState(persistedState),
            partialize: (state) => partializePersistedFlowState(state),
        }
    )
);
