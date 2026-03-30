import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { installWorkspaceDocumentSync } from './documentStateSync';
import { createFlowStorePersistOptions } from './createFlowStorePersistOptions';
import { createFlowStoreState } from './createFlowStoreState';
import type { FlowState } from './types';

export function createFlowStore() {
  const store = create<FlowState>()(
    persist(
      (set, get) => createFlowStoreState(set, get),
      createFlowStorePersistOptions()
    )
  );

  installWorkspaceDocumentSync(store);
  return store;
}
