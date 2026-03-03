import React from 'react';
import { FlowTab } from '@/lib/types';
import { FlowTabs } from './FlowTabs';
import { useFlowStore } from '../store';
import { SettingsModal } from './SettingsModal/SettingsModal';
import { trackEvent } from '../lib/analytics';
import { TopNavMenu } from './top-nav/TopNavMenu';
import { TopNavBrand } from './top-nav/TopNavBrand';
import { TopNavActions } from './top-nav/TopNavActions';
import { useTopNavState } from './top-nav/useTopNavState';

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
}

export const TopNav: React.FC<TopNavProps> = ({
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
}) => {
    const { brandConfig } = useFlowStore();
    const isBeveled = brandConfig.ui.buttonStyle === 'beveled';
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
            {/* Left: Brand */}
            {/* Left: Menu & Brand */}
            <div className="flex items-center gap-4 min-w-[240px]">
                <TopNavMenu
                    isOpen={isMenuOpen}
                    isBeveled={isBeveled}
                    onToggle={toggleMenu}
                    onClose={closeMenu}
                    onGoHome={onGoHome}
                    onOpenSettings={() => openSettings('general')}
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
                onHistory={onHistory}
                onImportJSON={onImportJSON}
                onPlay={onPlay}
                onExportPNG={(format) => {
                    trackEvent('export_png', { format });
                    onExportPNG(format);
                }}
                onExportJSON={() => {
                    trackEvent('export_json');
                    onExportJSON();
                }}
                onExportMermaid={() => {
                    trackEvent('export_mermaid');
                    onExportMermaid();
                }}
                onExportPlantUML={() => {
                    trackEvent('export_plantuml');
                    onExportPlantUML();
                }}
                onExportOpenFlowDSL={() => {
                    trackEvent('export_dsl');
                    onExportOpenFlowDSL();
                }}
                onExportFigma={() => {
                    trackEvent('export_figma');
                    onExportFigma();
                }}
            />

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={closeSettings}
                initialTab={activeSettingsTab}
            />
        </div>
    );
};
