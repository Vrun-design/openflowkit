import type { FlowTab } from '@/lib/types';
import { createId } from '@/lib/id';
import { DEFAULT_DIAGRAM_TYPE } from '@/services/diagramDocument';
import { clonePlaybackState } from '@/services/playback/model';
import type { FlowState } from '../types';
import { syncTabNodesEdges } from './syncTabNodesEdges';

type SetFlowState = (
  partial: Partial<FlowState> | ((state: FlowState) => Partial<FlowState>)
) => void;
type GetFlowState = () => FlowState;

export function createTabActions(
  set: SetFlowState,
  get: GetFlowState
): Pick<
  FlowState,
  | 'setActiveTabId'
  | 'setTabs'
  | 'addTab'
  | 'duplicateActiveTab'
  | 'duplicateTab'
  | 'deleteTab'
  | 'closeTab'
  | 'updateTab'
  | 'copySelectedToTab'
  | 'moveSelectedToTab'
> {
  function nowIso(): string {
    return new Date().toISOString();
  }

  function syncActiveTabContent(tabs: FlowTab[]): FlowTab[] {
    const { activeTabId, nodes, edges } = get();
    return syncTabNodesEdges(tabs, activeTabId, nodes, edges);
  }

  function cloneTabContent(tab: FlowTab): FlowTab {
    return {
      ...tab,
      nodes: tab.nodes.map((node) => ({
        ...node,
        selected: false,
        data: { ...node.data },
        position: { ...node.position },
        style: node.style ? { ...node.style } : node.style,
      })),
      edges: tab.edges.map((edge) => ({
        ...edge,
        selected: false,
        data: edge.data ? { ...edge.data } : edge.data,
        style: edge.style ? { ...edge.style } : edge.style,
      })),
      playback: clonePlaybackState(tab.playback),
      history: { past: [], future: [] },
      updatedAt: nowIso(),
    };
  }

  function createEmptyTab(name = 'New Flow'): FlowTab {
    return {
      id: createId('tab'),
      name,
      diagramType: DEFAULT_DIAGRAM_TYPE,
      updatedAt: nowIso(),
      nodes: [],
      edges: [],
      playback: undefined,
      history: { past: [], future: [] },
    };
  }

  return {
    setActiveTabId: (id) => {
      const { tabs, nodes, edges } = get();
      const currentTabId = get().activeTabId;
      if (id === currentTabId) return;

      const updatedTabs = tabs.map((tab) =>
        tab.id === currentTabId ? { ...tab, nodes, edges, updatedAt: nowIso() } : tab
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

      const newTab = createEmptyTab();
      const newTabId = newTab.id;

      set({
        tabs: [...updatedTabs, newTab],
        activeTabId: newTabId,
        nodes: newTab.nodes,
        edges: newTab.edges,
      });
      return newTabId;
    },

    duplicateActiveTab: () => {
      const { tabs, activeTabId } = get();
      const syncedTabs = syncActiveTabContent(tabs);
      const sourceTab = syncedTabs.find((tab) => tab.id === activeTabId);
      if (!sourceTab) return null;

      const newTabId = createId('tab');
      const duplicated = cloneTabContent(sourceTab);
      const newTab: FlowTab = {
        ...duplicated,
        id: newTabId,
        name: `${sourceTab.name} Copy`,
      };

      set({
        tabs: [...syncedTabs, newTab],
        activeTabId: newTabId,
        nodes: newTab.nodes,
        edges: newTab.edges,
      });
      return newTabId;
    },

    duplicateTab: (id) => {
      const { tabs } = get();
      const syncedTabs = syncActiveTabContent(tabs);
      const sourceTab = syncedTabs.find((tab) => tab.id === id);
      if (!sourceTab) return null;

      const newTabId = createId('tab');
      const duplicated = cloneTabContent(sourceTab);
      const newTab: FlowTab = {
        ...duplicated,
        id: newTabId,
        name: `${sourceTab.name} Copy`,
        updatedAt: nowIso(),
      };

      set({
        tabs: [...syncedTabs, newTab],
        activeTabId: newTabId,
        nodes: newTab.nodes,
        edges: newTab.edges,
      });
      return newTabId;
    },

    deleteTab: (id) => {
      const { tabs, activeTabId } = get();
      const nextTabs = tabs.filter((tab) => tab.id !== id);

      if (nextTabs.length === tabs.length) {
        return;
      }

      if (nextTabs.length === 0) {
        const fallbackTab = createEmptyTab('Page 1');
        set({
          tabs: [fallbackTab],
          activeTabId: fallbackTab.id,
          nodes: fallbackTab.nodes,
          edges: fallbackTab.edges,
        });
        return;
      }

      if (id !== activeTabId) {
        set({ tabs: nextTabs });
        return;
      }

      const deletedIndex = tabs.findIndex((tab) => tab.id === id);
      const nextActiveTab = nextTabs[deletedIndex] ?? nextTabs[deletedIndex - 1] ?? nextTabs[0];
      if (!nextActiveTab) {
        return;
      }

      set({
        tabs: nextTabs,
        activeTabId: nextActiveTab.id,
        nodes: nextActiveTab.nodes,
        edges: nextActiveTab.edges,
      });
    },

    closeTab: (id) => {
      const { tabs, activeTabId } = get();
      if (tabs.length === 1) {
        const fallbackTab = createEmptyTab();
        set({
          tabs: [fallbackTab],
          activeTabId: fallbackTab.id,
          nodes: fallbackTab.nodes,
          edges: fallbackTab.edges,
        });
        return;
      }

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
        tabs: state.tabs.map((tab) =>
          tab.id === id ? { ...tab, ...updates, updatedAt: nowIso() } : tab
        ),
      }));
    },

    copySelectedToTab: (targetTabId) => {
      const { tabs, activeTabId, nodes, edges } = get();
      if (targetTabId === activeTabId) return 0;
      const syncedTabs = syncActiveTabContent(tabs);
      const targetTab = syncedTabs.find((tab) => tab.id === targetTabId);
      if (!targetTab) return 0;

      const selectedNodes = nodes.filter((node) => node.selected);
      if (selectedNodes.length === 0) return 0;

      const selectedNodeIds = new Set(selectedNodes.map((node) => node.id));
      const selectedEdges = edges.filter(
        (edge) => selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target)
      );
      const targetNodeIds = new Set(targetTab.nodes.map((node) => node.id));
      const idMap = new Map<string, string>();

      const copiedNodes = selectedNodes.map((node) => {
        let nextId = createId();
        while (targetNodeIds.has(nextId)) {
          nextId = createId();
        }
        targetNodeIds.add(nextId);
        idMap.set(node.id, nextId);
        return {
          ...node,
          id: nextId,
          selected: false,
          data: { ...node.data },
          position: { ...node.position },
          style: node.style ? { ...node.style } : node.style,
        };
      });

      const copiedEdges = selectedEdges.map((edge) => ({
        ...edge,
        id: createId('e'),
        source: idMap.get(edge.source)!,
        target: idMap.get(edge.target)!,
        selected: false,
        data: edge.data ? { ...edge.data } : edge.data,
        style: edge.style ? { ...edge.style } : edge.style,
      }));

      set({
        tabs: syncedTabs.map((tab) =>
          tab.id === targetTabId
            ? { ...tab, nodes: tab.nodes.concat(copiedNodes), edges: tab.edges.concat(copiedEdges) }
            : tab
        ),
      });
      return copiedNodes.length;
    },

    moveSelectedToTab: (targetTabId) => {
      const { tabs, activeTabId, nodes, edges } = get();
      if (targetTabId === activeTabId) return 0;
      const syncedTabs = syncActiveTabContent(tabs);
      const targetTab = syncedTabs.find((tab) => tab.id === targetTabId);
      if (!targetTab) return 0;

      const selectedNodes = nodes.filter((node) => node.selected);
      if (selectedNodes.length === 0) return 0;

      const selectedNodeIds = new Set(selectedNodes.map((node) => node.id));
      const selectedEdges = edges.filter(
        (edge) => selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target)
      );
      const remainingNodes = nodes.filter((node) => !selectedNodeIds.has(node.id));
      const remainingEdges = edges.filter(
        (edge) => !selectedNodeIds.has(edge.source) && !selectedNodeIds.has(edge.target)
      );
      const targetNodeIds = new Set(targetTab.nodes.map((node) => node.id));
      const movedNodes = selectedNodes
        .filter((node) => !targetNodeIds.has(node.id))
        .map((node) => ({ ...node, selected: false }));
      const movedNodeIds = new Set(movedNodes.map((node) => node.id));
      const movedEdges = selectedEdges
        .filter((edge) => movedNodeIds.has(edge.source) && movedNodeIds.has(edge.target))
        .map((edge) => ({ ...edge, selected: false }));

      const updatedTabs = syncedTabs.map((tab) => {
        if (tab.id === targetTabId) {
          return {
            ...tab,
            nodes: tab.nodes.concat(movedNodes),
            edges: tab.edges.concat(movedEdges),
          };
        }
        if (tab.id === activeTabId) {
          return { ...tab, nodes: remainingNodes, edges: remainingEdges };
        }
        return tab;
      });

      set({
        tabs: updatedTabs,
        nodes: remainingNodes,
        edges: remainingEdges,
      });
      return movedNodes.length;
    },
  };
}
