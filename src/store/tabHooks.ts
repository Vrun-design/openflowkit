import { useShallow } from 'zustand/react/shallow';
import { useFlowStore } from '../store';
import type { FlowTab } from '@/lib/types';
import { createTabByIdSelector, selectTabActions, selectTabsState } from './selectors';
import type { TabActionsSlice, TabStateSlice } from './types';

export function useTabsState(): TabStateSlice {
    return useFlowStore(useShallow(selectTabsState));
}

export function useActiveTabId(): string {
    return useFlowStore((state) => state.activeTabId);
}

export function useTabActions(): TabActionsSlice {
    return useFlowStore(useShallow(selectTabActions));
}

export function useTabById(tabId: string): FlowTab | undefined {
    return useFlowStore(createTabByIdSelector(tabId));
}
