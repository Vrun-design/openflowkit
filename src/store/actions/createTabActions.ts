import type { FlowTab } from '@/lib/types';
import type { FlowState } from '../types';

type SetFlowState = (partial: Partial<FlowState> | ((state: FlowState) => Partial<FlowState>)) => void;
type GetFlowState = () => FlowState;

export function createTabActions(set: SetFlowState, get: GetFlowState): Pick<
    FlowState,
    'setActiveTabId' | 'setTabs' | 'addTab' | 'closeTab' | 'updateTab'
> {
    return {
        setActiveTabId: (id) => {
            const { tabs, nodes, edges } = get();
            const currentTabId = get().activeTabId;

            const updatedTabs = tabs.map((tab) =>
                tab.id === currentTabId
                    ? { ...tab, nodes, edges }
                    : tab
            );

            const newTab = updatedTabs.find((tab) => tab.id === id);
            if (!newTab) return;

            set({
                tabs: updatedTabs,
                activeTabId: id,
                nodes: newTab.nodes,
                edges: newTab.edges,
            });
        },

        setTabs: (tabs) => set({ tabs }),

        addTab: () => {
            const { tabs, activeTabId } = get();

            const updatedTabs = tabs.map((tab) =>
                tab.id === activeTabId ? { ...tab, nodes: get().nodes, edges: get().edges } : tab
            );

            const newTabId = `tab-${crypto.randomUUID()}`;
            const newTab: FlowTab = {
                id: newTabId,
                name: 'New Flow',
                nodes: [],
                edges: [],
                history: { past: [], future: [] },
            };

            set({
                tabs: [...updatedTabs, newTab],
                activeTabId: newTabId,
                nodes: newTab.nodes,
                edges: newTab.edges,
            });
            return newTabId;
        },

        closeTab: (id) => {
            const { tabs, activeTabId } = get();
            if (tabs.length === 1) return;

            let newActiveTabId = activeTabId;

            if (id === activeTabId) {
                const index = tabs.findIndex((tab) => tab.id === id);
                const nextTab = tabs[index + 1] || tabs[index - 1];
                if (nextTab) {
                    newActiveTabId = nextTab.id;
                    set({
                        nodes: nextTab.nodes,
                        edges: nextTab.edges,
                        activeTabId: newActiveTabId,
                    });
                }
            }

            set((state) => ({
                tabs: state.tabs.filter((tab) => tab.id !== id),
                activeTabId: newActiveTabId === activeTabId ? activeTabId : newActiveTabId,
            }));
        },

        updateTab: (id, updates) => {
            set((state) => ({
                tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, ...updates } : tab)),
            }));
        },
    };
}
