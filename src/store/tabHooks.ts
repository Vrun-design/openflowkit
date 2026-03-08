import { useShallow } from 'zustand/react/shallow';
import { useFlowStore } from '../store';
import type { FlowStoreState } from '../store';
import type { FlowTab } from '@/lib/types';

export function useTabsState(): Pick<FlowStoreState, 'tabs' | 'activeTabId'> {
    return useFlowStore(
        useShallow((state) => ({
            tabs: state.tabs,
            activeTabId: state.activeTabId,
        }))
    );
}

export function useActiveTabId(): string {
    return useFlowStore((state) => state.activeTabId);
}

export function useTabActions(): Pick<
    FlowStoreState,
    | 'setActiveTabId'
    | 'setTabs'
    | 'addTab'
    | 'duplicateActiveTab'
    | 'duplicateTab'
    | 'closeTab'
    | 'updateTab'
    | 'copySelectedToTab'
    | 'moveSelectedToTab'
> {
    return useFlowStore(
        useShallow((state) => ({
            setActiveTabId: state.setActiveTabId,
            setTabs: state.setTabs,
            addTab: state.addTab,
            duplicateActiveTab: state.duplicateActiveTab,
            duplicateTab: state.duplicateTab,
            closeTab: state.closeTab,
            updateTab: state.updateTab,
            copySelectedToTab: state.copySelectedToTab,
            moveSelectedToTab: state.moveSelectedToTab,
        }))
    );
}

export function useTabById(tabId: string): FlowTab | undefined {
    return useFlowStore((state) => state.tabs.find((tab) => tab.id === tabId));
}
