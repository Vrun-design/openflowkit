import type { FlowHistoryState } from '@/lib/types';
import type { GetFlowState, SetFlowState } from '../actionFactory';
import type { FlowState } from '../types';

const MAX_HISTORY = 20;
const MAX_HISTORY_ESTIMATED_BYTES = 220_000;
const FALLBACK_SNAPSHOT_ESTIMATED_BYTES = 50_000;

type SnapshotDirection = 'past' | 'future';

const snapshotSizeCache = new WeakMap<FlowHistoryState, number>();

function buildSnapshot(state: FlowState): FlowHistoryState {
    return {
        nodes: state.nodes,
        edges: state.edges,
    };
}

function findActiveTabIndex(state: FlowState): number {
    return state.tabs.findIndex((tab) => tab.id === state.activeTabId);
}

function estimateSnapshotBytes(snapshot: FlowHistoryState): number {
    const cached = snapshotSizeCache.get(snapshot);
    if (typeof cached === 'number') {
        return cached;
    }

    try {
        const estimatedBytes = JSON.stringify(snapshot).length * 2;
        snapshotSizeCache.set(snapshot, estimatedBytes);
        return estimatedBytes;
    } catch {
        // Fallback bias toward conservative trimming when serialization fails.
        snapshotSizeCache.set(snapshot, FALLBACK_SNAPSHOT_ESTIMATED_BYTES);
        return FALLBACK_SNAPSHOT_ESTIMATED_BYTES;
    }
}

function trimSnapshots(
    snapshots: FlowHistoryState[],
    direction: SnapshotDirection
): FlowHistoryState[] {
    const trimmed = direction === 'past'
        ? snapshots.slice(-MAX_HISTORY)
        : snapshots.slice(0, MAX_HISTORY);
    let estimatedBytes = trimmed.reduce((sum, snapshot) => sum + estimateSnapshotBytes(snapshot), 0);

    while (trimmed.length > 1 && estimatedBytes > MAX_HISTORY_ESTIMATED_BYTES) {
        const removed = direction === 'past' ? trimmed.shift() : trimmed.pop();
        if (removed) {
            estimatedBytes -= estimateSnapshotBytes(removed);
        }
    }

    return trimmed;
}

function trimPastSnapshots(snapshots: FlowHistoryState[]): FlowHistoryState[] {
    return trimSnapshots(snapshots, 'past');
}

function trimFutureSnapshots(snapshots: FlowHistoryState[]): FlowHistoryState[] {
    return trimSnapshots(snapshots, 'future');
}

export function createHistoryActions(set: SetFlowState, get: GetFlowState): Pick<
    FlowState,
    'recordHistoryV2' | 'undoV2' | 'redoV2' | 'canUndoV2' | 'canRedoV2'
> {
    return {
        recordHistoryV2: () => {
            set((state) => {
                const activeTabIndex = findActiveTabIndex(state);
                if (activeTabIndex < 0) return {};

                const activeTab = state.tabs[activeTabIndex];
                const snapshot = buildSnapshot(state);
                const updatedTab = {
                    ...activeTab,
                    history: {
                        past: trimPastSnapshots([...activeTab.history.past, snapshot]),
                        future: [],
                    },
                };

                const tabs = [...state.tabs];
                tabs[activeTabIndex] = updatedTab;
                return { tabs };
            });
        },

        undoV2: () => {
            set((state) => {
                const activeTabIndex = findActiveTabIndex(state);
                if (activeTabIndex < 0) return {};

                const activeTab = state.tabs[activeTabIndex];
                if (activeTab.history.past.length === 0) return {};

                const previous = activeTab.history.past[activeTab.history.past.length - 1];
                const current = buildSnapshot(state);
                const updatedTab = {
                    ...activeTab,
                    history: {
                        past: trimPastSnapshots(activeTab.history.past.slice(0, -1)),
                        future: trimFutureSnapshots([current, ...activeTab.history.future]),
                    },
                    nodes: previous.nodes,
                    edges: previous.edges,
                };

                const tabs = [...state.tabs];
                tabs[activeTabIndex] = updatedTab;

                return {
                    tabs,
                    nodes: previous.nodes,
                    edges: previous.edges,
                };
            });
        },

        redoV2: () => {
            set((state) => {
                const activeTabIndex = findActiveTabIndex(state);
                if (activeTabIndex < 0) return {};

                const activeTab = state.tabs[activeTabIndex];
                if (activeTab.history.future.length === 0) return {};

                const next = activeTab.history.future[0];
                const current = buildSnapshot(state);
                const updatedTab = {
                    ...activeTab,
                    history: {
                        past: trimPastSnapshots([...activeTab.history.past, current]),
                        future: trimFutureSnapshots(activeTab.history.future.slice(1)),
                    },
                    nodes: next.nodes,
                    edges: next.edges,
                };

                const tabs = [...state.tabs];
                tabs[activeTabIndex] = updatedTab;

                return {
                    tabs,
                    nodes: next.nodes,
                    edges: next.edges,
                };
            });
        },

        canUndoV2: () => {
            const state = get();
            const activeTabIndex = findActiveTabIndex(state);
            if (activeTabIndex < 0) return false;
            return state.tabs[activeTabIndex].history.past.length > 0;
        },

        canRedoV2: () => {
            const state = get();
            const activeTabIndex = findActiveTabIndex(state);
            if (activeTabIndex < 0) return false;
            return state.tabs[activeTabIndex].history.future.length > 0;
        },
    };
}
