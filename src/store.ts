import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createAIAndSelectionActions } from './store/actions/createAIAndSelectionActions';
import { createCanvasActions } from './store/actions/createCanvasActions';
import { createDesignSystemActions } from './store/actions/createDesignSystemActions';
import { createHistoryActions } from './store/actions/createHistoryActions';
import { createLayerActions } from './store/actions/createLayerActions';
import { createTabActions } from './store/actions/createTabActions';
import { createWorkspaceDocumentActions } from './store/actions/createWorkspaceDocumentActions';
import { createViewActions } from './store/actions/createViewActions';
import { installWorkspaceDocumentSync } from './store/documentStateSync';
import { DEFAULT_AI_SETTINGS, DEFAULT_DESIGN_SYSTEM } from './store/defaults';
import type { FlowState } from './store/types';
import { createFlowPersistStorage } from '@/services/storage/flowPersistStorage';
import {
  createInitialFlowState,
  migratePersistedFlowState,
  partializePersistedFlowState,
} from './store/persistence';

export { DEFAULT_AI_SETTINGS, DEFAULT_DESIGN_SYSTEM };
export type {
  AIProvider,
  AISettings,
  AISettingsStorageMode,
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
      ...createWorkspaceDocumentActions(set, get),
      ...createTabActions(set, get),
      ...createDesignSystemActions(set),
      ...createViewActions(set),
      ...createLayerActions(set, get),
      ...createAIAndSelectionActions(set),
      updateLastSaveTime: () => set({ lastUpdateTime: Date.now() }),
    }),
    createFlowStorePersistOptions()
  )
);

installWorkspaceDocumentSync(useFlowStore);

function createFlowStorePersistOptions() {
  return {
    name: 'openflowkit-storage',
    storage: createFlowPersistStorage(),
    version: 2,
    migrate: (persistedState: unknown) => migratePersistedFlowState(persistedState),
    partialize: (state: FlowState) => partializePersistedFlowState(state),
  };
}
