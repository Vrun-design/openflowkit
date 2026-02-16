import { useEffect, useRef } from 'react';
import { FlowTab, FlowNode, FlowEdge } from '@/lib/types';

const STORAGE_KEY = 'flowmind_app_state';

interface AutoSaveData {
    tabs: FlowTab[];
    activeTabId: string;
}

export const useAutoSave = (
    tabs: FlowTab[],
    activeTabId: string,
    currentNodes: FlowNode[],
    currentEdges: FlowEdge[],
    setTabs: (tabs: FlowTab[]) => void,
    setActiveTabId: (id: string) => void,
    setNodes: (nodes: FlowNode[]) => void,
    setEdges: (edges: FlowEdge[]) => void,
    setPast: (past: any[]) => void,
    setFuture: (future: any[]) => void
) => {
    const isLoaded = useRef(false);

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        // Only load if not already loaded (though strict mode might run this twice, ref guards it)
        if (saved && !isLoaded.current) {
            try {
                const data: AutoSaveData = JSON.parse(saved);
                if (data.tabs && data.activeTabId) {
                    console.log('Restoring auto-saved state...');

                    setTabs(data.tabs);
                    setActiveTabId(data.activeTabId);

                    const activeTab = data.tabs.find(t => t.id === data.activeTabId);
                    if (activeTab) {
                        setNodes(activeTab.nodes || []);
                        setEdges(activeTab.edges || []);

                        // Restore history if available
                        if (activeTab.history) {
                            setPast(activeTab.history.past || []);
                            setFuture(activeTab.history.future || []);
                        }
                    }
                }
            } catch (e) {
                console.error('Failed to load auto-save', e);
            }
            isLoaded.current = true;
        } else {
            // If no save found, mark as loaded so we can start saving new state
            isLoaded.current = true;
        }
    }, []);

    // Auto-save logic
    useEffect(() => {
        if (!isLoaded.current) return;

        const timeout = setTimeout(() => {
            // Create a copy of tabs with the current active tab's state updated
            const updatedTabs = tabs.map(t => {
                if (t.id === activeTabId) {
                    return {
                        ...t,
                        nodes: currentNodes,
                        edges: currentEdges,
                        // History intentionally omitted to save space
                    };
                }
                return t;
            });

            const data: AutoSaveData = {
                tabs: updatedTabs,
                activeTabId
            };

            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            } catch (e) {
                console.error('Auto-save failed', e);
            }
        }, 1000);

        return () => clearTimeout(timeout);
    }, [tabs, activeTabId, currentNodes, currentEdges]); // Removed past/future deps
};
