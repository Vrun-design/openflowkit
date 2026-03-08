import React, { Suspense, lazy } from 'react';
import type { FlowTab } from '@/lib/types';
import { FlowTabs } from './FlowTabs';
import { useFlowStore } from '../store';
import { trackEvent } from '../lib/analytics';
import { TopNavMenu } from './top-nav/TopNavMenu';
import { TopNavBrand } from './top-nav/TopNavBrand';
import { TopNavActions } from './top-nav/TopNavActions';
import { useTopNavState } from './top-nav/useTopNavState';
import { useBrandButtonStyle, useBrandConfig } from '@/store/brandHooks';

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

function trackAndRun(eventName: string, action: () => void): () => void {
    return () => {
        trackEvent(eventName);
        action();
    };
}

function trackAndRunExport(
    action: (format?: 'png' | 'jpeg') => void
): (format?: 'png' | 'jpeg') => void {
    return (format) => {
        trackEvent('export_png', { format });
        action(format);
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
    const brandConfig = useBrandConfig();
    const isBeveled = useBrandButtonStyle() === 'beveled';
    const handleExportPNG = trackAndRunExport(onExportPNG);
    const handleExportJSON = trackAndRun('export_json', onExportJSON);
    const handleExportMermaid = trackAndRun('export_mermaid', onExportMermaid);
    const handleExportPlantUML = trackAndRun('export_plantuml', onExportPlantUML);
    const handleExportOpenFlowDSL = trackAndRun('export_dsl', onExportOpenFlowDSL);
    const handleExportFigma = trackAndRun('export_figma', onExportFigma);
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
                    appName={brandConfig.appName}
                    logoUrl={brandConfig.logoUrl}
                    logoStyle={brandConfig.logoStyle}
                    ui={brandConfig.ui}
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
