import React, { Suspense, lazy, useState } from 'react';
import { useFlowStore } from '../store';
import { useTabActions, useTabsState } from '@/store/tabHooks';
import { FlowSnapshot } from '@/lib/types';
import { HomeDashboard, type HomeFlowCard } from './home/HomeDashboard';
import { HomeFlowDeleteDialog, HomeFlowRenameDialog } from './home/HomeFlowDialogs';
import { HomeSettingsView } from './home/HomeSettingsView';
import { HomeSidebar } from './home/HomeSidebar';
import { shouldShowWelcomeModal } from './home/welcomeModalState';

const LazyWelcomeModal = lazy(async () => {
    const module = await import('./WelcomeModal');
    return { default: module.WelcomeModal };
});

interface HomePageProps {
    onLaunch: () => void;
    onImportJSON: () => void;
    onRestoreSnapshot: (snapshot: FlowSnapshot) => void;
    onOpenFlow: (flowId: string) => void;
    activeTab?: 'home' | 'settings';
    onSwitchTab?: (tab: 'home' | 'settings') => void;
}

export const HomePage: React.FC<HomePageProps> = ({
    onLaunch,
    onImportJSON,
    onRestoreSnapshot: _onRestoreSnapshot,
    onOpenFlow,
    activeTab: propActiveTab,
    onSwitchTab
}) => {
    const { tabs, activeTabId } = useTabsState();
    const { updateTab, closeTab, duplicateTab } = useTabActions();
    const { nodes, edges } = useFlowStore();
    const [internalActiveTab, setInternalActiveTab] = useState<'home' | 'settings'>('home');
    const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'shortcuts' | 'ai'>('general');
    const [flowPendingRename, setFlowPendingRename] = useState<HomeFlowCard | null>(null);
    const [flowPendingDelete, setFlowPendingDelete] = useState<HomeFlowCard | null>(null);
    const showWelcomeModal = shouldShowWelcomeModal();

    const activeTab = propActiveTab || internalActiveTab;
    const flows: HomeFlowCard[] = tabs.map((tab) => {
        const liveNodes = tab.id === activeTabId ? nodes : tab.nodes;
        const liveEdges = tab.id === activeTabId ? edges : tab.edges;

        return {
            id: tab.id,
            name: tab.name,
            nodeCount: liveNodes.length,
            edgeCount: liveEdges.length,
            updatedAt: tab.updatedAt,
            isActive: tab.id === activeTabId,
        };
    }).sort((left, right) => {
        if (left.isActive && !right.isActive) return -1;
        if (!left.isActive && right.isActive) return 1;
        const leftTime = Date.parse(left.updatedAt || '');
        const rightTime = Date.parse(right.updatedAt || '');
        return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
    });

    const handleTabChange = (tab: 'home' | 'settings'): void => {
        if (onSwitchTab) {
            onSwitchTab(tab);
        } else {
            setInternalActiveTab(tab);
        }
    };

    const handleRenameFlow = (flowId: string): void => {
        const flow = flows.find((entry) => entry.id === flowId);
        if (!flow) {
            return;
        }
        setFlowPendingRename(flow);
    };

    const handleDeleteFlow = (flowId: string): void => {
        if (tabs.length <= 1) {
            return;
        }
        const flow = flows.find((entry) => entry.id === flowId);
        if (!flow) {
            return;
        }
        setFlowPendingDelete(flow);
    };

    const submitFlowRename = (nextName: string): void => {
        if (!flowPendingRename) {
            return;
        }

        const trimmedName = nextName.trim();
        if (!trimmedName || trimmedName === flowPendingRename.name) {
            setFlowPendingRename(null);
            return;
        }

        updateTab(flowPendingRename.id, { name: trimmedName });
        setFlowPendingRename(null);
    };

    const confirmFlowDelete = (): void => {
        if (!flowPendingDelete) {
            return;
        }

        closeTab(flowPendingDelete.id);
        setFlowPendingDelete(null);
    };

    return (
        <div className="min-h-screen bg-[var(--brand-background)] flex text-[var(--brand-text)]">
            <HomeSidebar
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />

            {/* Main Content */}
            <main className="ml-64 flex-1 flex flex-col min-w-0 bg-[var(--brand-surface)]">

                {activeTab === 'home' && (
                    <HomeDashboard
                        flows={flows}
                        onCreateNew={() => {
                            onLaunch();
                        }}
                        onImportJSON={() => {
                            onImportJSON();
                        }}
                        onOpenFlow={(flowId) => {
                            onOpenFlow(flowId);
                        }}
                        onRenameFlow={handleRenameFlow}
                        onDuplicateFlow={(flowId) => {
                            const newFlowId = duplicateTab(flowId);
                            if (newFlowId) {
                                onOpenFlow(newFlowId);
                            }
                        }}
                        onDeleteFlow={handleDeleteFlow}
                    />
                )}

                {activeTab === 'settings' && (
                    <HomeSettingsView
                        activeSettingsTab={activeSettingsTab}
                        onSettingsTabChange={setActiveSettingsTab}
                    />
                )}
            </main>
            <HomeFlowRenameDialog
                key={flowPendingRename?.id ?? 'rename-closed'}
                flowName={flowPendingRename?.name ?? ''}
                isOpen={flowPendingRename !== null}
                onClose={() => setFlowPendingRename(null)}
                onSubmit={submitFlowRename}
            />
            <HomeFlowDeleteDialog
                key={flowPendingDelete?.id ?? 'delete-closed'}
                flowName={flowPendingDelete?.name ?? ''}
                isOpen={flowPendingDelete !== null}
                onClose={() => setFlowPendingDelete(null)}
                onConfirm={confirmFlowDelete}
            />
            {showWelcomeModal ? (
                <Suspense fallback={null}>
                    <LazyWelcomeModal />
                </Suspense>
            ) : null}
        </div>
    );
};
