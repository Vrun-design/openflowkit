import type { PersistOptions, PersistStorage } from 'zustand/middleware';
import { createFlowPersistStorage } from '@/services/storage/flowPersistStorage';
import {
  type PersistedFlowStateHydration,
  migratePersistedFlowState,
  partializePersistedFlowState,
  type PersistedFlowStateSlice,
} from './persistence';
import type { FlowState } from './types';

export function createFlowStorePersistOptions(): PersistOptions<
  FlowState,
  PersistedFlowStateHydration
> {
  return {
    name: 'openflowkit-storage',
    storage: createFlowPersistStorage() as PersistStorage<PersistedFlowStateHydration>,
    version: 2,
    migrate: (persistedState: unknown) => migratePersistedFlowState(persistedState),
    partialize: (state: FlowState): PersistedFlowStateSlice => partializePersistedFlowState(state),
  };
}
