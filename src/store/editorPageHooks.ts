import { useShallow } from 'zustand/react/shallow';
import { useFlowStore } from '../store';
import type { FlowTab } from '@/lib/types';
import { createTabByIdSelector, selectTabActions, selectTabsState } from './selectors';
import type { TabActionsSlice } from './types';

export type EditorPage = FlowTab;

export function useEditorPagesState(): {
    pages: EditorPage[];
    activePageId: string;
} {
    const state = useFlowStore(useShallow(selectTabsState));
    return {
        pages: state.tabs,
        activePageId: state.activeTabId,
    };
}

export function useActiveEditorPageId(): string {
    return useFlowStore((state) => state.activeTabId);
}

export function useEditorPageActions(): {
    setActivePageId: TabActionsSlice['setActiveTabId'];
    setPages: TabActionsSlice['setTabs'];
    addPage: TabActionsSlice['addTab'];
    duplicateActivePage: TabActionsSlice['duplicateActiveTab'];
    duplicatePage: TabActionsSlice['duplicateTab'];
    reorderPage: TabActionsSlice['reorderTab'];
    deletePage: TabActionsSlice['deleteTab'];
    closePage: TabActionsSlice['closeTab'];
    updatePage: TabActionsSlice['updateTab'];
    copySelectedToPage: TabActionsSlice['copySelectedToTab'];
    moveSelectedToPage: TabActionsSlice['moveSelectedToTab'];
} {
    const actions = useFlowStore(useShallow(selectTabActions));
    return {
        setActivePageId: actions.setActiveTabId,
        setPages: actions.setTabs,
        addPage: actions.addTab,
        duplicateActivePage: actions.duplicateActiveTab,
        duplicatePage: actions.duplicateTab,
        reorderPage: actions.reorderTab,
        deletePage: actions.deleteTab,
        closePage: actions.closeTab,
        updatePage: actions.updateTab,
        copySelectedToPage: actions.copySelectedToTab,
        moveSelectedToPage: actions.moveSelectedToTab,
    };
}

export function useEditorPageById(pageId: string): EditorPage | undefined {
    return useFlowStore(createTabByIdSelector(pageId));
}
