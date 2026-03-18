import React, { Suspense, lazy } from 'react';
import type { FlowTab } from '@/lib/types';
import { FlowTabs } from './FlowTabs';
import { TopNavMenu } from './top-nav/TopNavMenu';
import { TopNavBrand } from './top-nav/TopNavBrand';
import { TopNavActions } from './top-nav/TopNavActions';
import { useTopNavState } from './top-nav/useTopNavState';
import { APP_NAME, IS_BEVELED } from '@/lib/brand';

const LazySettingsModal = lazy(async () => {
    const module = await import('./SettingsModal/SettingsModal');
    return { default: module.SettingsModal };
});

interface TopNavProps {
    tabs: FlowTab[];
    activeTabId: string;
    onSwitchTab: (tabId: string) => void;
    onAddTab: () => void;
    onCloseTab: (tabId: string) => void;
    onRenameTab: (tabId: string, newName: string) => void;

    // Actions
    onExportPNG: (format?: 'png' | 'jpeg') => void;
    onExportAnimated: (format: 'video' | 'gif') => void;
    onExportJSON: () => void;
    onExportMermaid: () => void;
    onExportPlantUML: () => void;
    onExportOpenFlowDSL: () => void;
    onExportFigma: () => void;
    onImportJSON: () => void;
    onHistory: () => void;
    onGoHome: () => void;
    onPlay: () => void;
    collaboration?: {
        roomId: string;
        viewerCount: number;
        status: 'realtime' | 'waiting' | 'fallback';
        cacheState: 'unavailable' | 'syncing' | 'ready' | 'hydrated';
        participants: Array<{
            clientId: string;
            name: string;
            color: string;
            isLocal: boolean;
        }>;
        onCopyShareLink: () => void;
    };
}


export function TopNav({
    tabs,
    activeTabId,
    onSwitchTab,
    onAddTab,
    onCloseTab,
    onRenameTab,
    onExportPNG,
    onExportAnimated,
    onExportJSON,
    onExportMermaid,
    onExportPlantUML,
    onExportOpenFlowDSL,
    onExportFigma,
    onImportJSON,
    onHistory,
    onGoHome,
    onPlay,
    collaboration,
}: TopNavProps): React.ReactElement {
    const isBeveled = IS_BEVELED;
    const handleExportPNG = onExportPNG;
    const handleExportAnimated = onExportAnimated;
    const handleExportJSON = onExportJSON;
    const handleExportMermaid = onExportMermaid;
    const handleExportPlantUML = onExportPlantUML;
    const handleExportOpenFlowDSL = onExportOpenFlowDSL;
    const handleExportFigma = onExportFigma;
    const {
        isMenuOpen,
        isSettingsOpen,
        activeSettingsTab,
        toggleMenu,
        closeMenu,
        openSettings,
        closeSettings,
    } = useTopNavState();

    return (
        <div className="absolute top-0 left-0 right-0 z-50 h-16 bg-white/70 backdrop-blur-md border-b border-white/20 shadow-sm px-6 flex items-center justify-between transition-all">
            {/* Left: Menu & Brand */}
            <div className="flex items-center gap-4 min-w-[240px]">
                <TopNavMenu
                    isOpen={isMenuOpen}
                    isBeveled={isBeveled}
                    onToggle={toggleMenu}
                    onClose={closeMenu}
                    onGoHome={onGoHome}
                    onOpenSettings={() => openSettings('general')}
                    onHistory={onHistory}
                    onImportJSON={onImportJSON}
                />
                <TopNavBrand
                    appName={APP_NAME}
                    logoUrl={null}
                    logoStyle={'text'}
                    ui={{ showBeta: true }}
                />
            </div>

            {/* Center: Tabs */}
            <div className="flex-1 flex justify-center max-w-2xl">
                <div className="bg-slate-100/50 p-1 rounded-[var(--radius-lg)] border border-slate-200/60 backdrop-blur-sm">
                    <FlowTabs
                        tabs={tabs}
                        activeTabId={activeTabId}
                        onSwitchTab={onSwitchTab}
                        onAddTab={onAddTab}
                        onCloseTab={onCloseTab}
                        onRenameTab={onRenameTab}
                    />
                </div>
            </div>

            <TopNavActions
                onPlay={onPlay}
                onExportPNG={handleExportPNG}
                onExportAnimated={handleExportAnimated}
                onExportJSON={handleExportJSON}
                onExportMermaid={handleExportMermaid}
                onExportPlantUML={handleExportPlantUML}
                onExportOpenFlowDSL={handleExportOpenFlowDSL}
                onExportFigma={handleExportFigma}
                collaboration={collaboration}
                isBeveled={isBeveled}
            />

            {isSettingsOpen ? (
                <Suspense fallback={null}>
                    <LazySettingsModal
                        isOpen={isSettingsOpen}
                        onClose={closeSettings}
                        initialTab={activeSettingsTab}
                    />
                </Suspense>
            ) : null}
        </div>
    );
}
