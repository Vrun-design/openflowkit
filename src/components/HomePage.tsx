import React, { useState } from 'react';
import { useFlowStore } from '../store';
import { useSnapshots } from '../hooks/useSnapshots';
import { FlowSnapshot } from '@/lib/types';
import { WelcomeModal } from './WelcomeModal';
import { trackEvent } from '../lib/analytics';
import { HomeDashboard } from './home/HomeDashboard';
import { HomeSettingsView } from './home/HomeSettingsView';
import { HomeSidebar } from './home/HomeSidebar';


interface HomePageProps {
    onLaunch: () => void;
    onImportJSON: () => void;
    onRestoreSnapshot: (snapshot: FlowSnapshot) => void;
    activeTab?: 'home' | 'settings';
    onSwitchTab?: (tab: 'home' | 'settings') => void;
}

export const HomePage: React.FC<HomePageProps> = ({
    onLaunch,
    onImportJSON,
    onRestoreSnapshot,
    activeTab: propActiveTab,
    onSwitchTab
}) => {
    const { brandConfig } = useFlowStore();
    const { snapshots, deleteSnapshot } = useSnapshots();
    const [internalActiveTab, setInternalActiveTab] = useState<'home' | 'settings'>('home');
    const [activeSettingsTab, setActiveSettingsTab] = useState<'brand' | 'general' | 'shortcuts' | 'privacy' | 'ai'>('brand');

    const activeTab = propActiveTab || internalActiveTab;

    const handleTabChange = (tab: 'home' | 'settings'): void => {
        if (onSwitchTab) {
            onSwitchTab(tab);
        } else {
            setInternalActiveTab(tab);
        }
    };

    const handleRestore = (snapshot: FlowSnapshot): void => {
        trackEvent('restore_snapshot_flow');
        onRestoreSnapshot(snapshot);
        onLaunch();
    };

    return (
        <div className="min-h-screen bg-[var(--brand-background)] flex text-[var(--brand-text)]">
            <HomeSidebar
                brandConfig={brandConfig}
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />

            {/* Main Content */}
            <main className="ml-64 flex-1 flex flex-col min-w-0 bg-[var(--brand-surface)]">

                {activeTab === 'home' && (
                    <HomeDashboard
                        snapshots={snapshots}
                        onCreateNew={() => {
                            trackEvent('create_new_flow');
                            onLaunch();
                        }}
                        onImportJSON={() => {
                            trackEvent('import_json_flow');
                            onImportJSON();
                        }}
                        onRestoreSnapshot={handleRestore}
                        onDeleteSnapshot={deleteSnapshot}
                    />
                )}

                {activeTab === 'settings' && (
                    <HomeSettingsView
                        activeSettingsTab={activeSettingsTab}
                        onSettingsTabChange={setActiveSettingsTab}
                    />
                )}
            </main>
            <WelcomeModal />
        </div>
    );
};
