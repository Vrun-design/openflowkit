import React, { Suspense, lazy, useCallback, useEffect } from 'react';
import type { EditorPage } from '@/store/editorPageHooks';
import { FlowTabs } from './FlowTabs';
import { TopNavMenu } from './top-nav/TopNavMenu';
import { TopNavBrand } from './top-nav/TopNavBrand';
import { TopNavActions } from './top-nav/TopNavActions';
import { useTopNavState } from './top-nav/useTopNavState';
import { APP_NAME, IS_BEVELED } from '@/lib/brand';

const OPEN_AI_SETTINGS_EVENT = 'open-ai-settings';

const LazySettingsModal = lazy(async () => {
    const module = await import('./SettingsModal/SettingsModal');
    return { default: module.SettingsModal };
});

interface TopNavProps {
    pages: EditorPage[];
    activePageId: string;
    onSwitchPage: (pageId: string) => void;
    onAddPage: () => void;
    onClosePage: (pageId: string) => void;
    onRenamePage: (pageId: string, newName: string) => void;

    // Actions
    onExportPNG: (format?: 'png' | 'jpeg') => void;
    onCopyImage: (format?: 'png' | 'jpeg') => void;
    onExportSVG: () => void;
    onCopySVG: () => void;
    onExportPDF: () => void;
    onExportCinematic: (format: 'cinematic-video' | 'cinematic-gif') => void;
    onExportJSON: () => void;
    onCopyJSON: () => void;
    onExportMermaid: () => void;
    onDownloadMermaid: () => void;
    onExportPlantUML: () => void;
    onDownloadPlantUML: () => void;
    onExportOpenFlowDSL: () => void;
    onDownloadOpenFlowDSL: () => void;
    onExportFigma: () => void;
    onDownloadFigma: () => void;
    onShare: () => void;
    onImportJSON: () => void;
    onHistory: () => void;
    onGoHome: () => void;
    onPlay: () => void;
    collaboration?: {
        roomId: string;
        inviteUrl: string;
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
    pages,
    activePageId,
    onSwitchPage,
    onAddPage,
    onClosePage,
    onRenamePage,
    onExportPNG,
    onCopyImage,
    onExportSVG,
    onCopySVG,
    onExportPDF,
    onExportCinematic,
    onExportJSON,
    onCopyJSON,
    onExportMermaid,
    onDownloadMermaid,
    onExportPlantUML,
    onDownloadPlantUML,
    onExportOpenFlowDSL,
    onDownloadOpenFlowDSL,
    onExportFigma,
    onDownloadFigma,
    onShare,
    onImportJSON,
    onHistory,
    onGoHome,
    onPlay,
    collaboration,
}: TopNavProps): React.ReactElement {
    const isBeveled = IS_BEVELED;
    const {
        isMenuOpen,
        isSettingsOpen,
        activeSettingsTab,
        toggleMenu,
        closeMenu,
        openSettings,
        closeSettings,
    } = useTopNavState();
    const openCanvasSettings = useCallback(() => {
        openSettings('canvas');
    }, [openSettings]);
    const openAISettings = useCallback(() => {
        openSettings('ai');
    }, [openSettings]);

    useEffect(() => {
        window.addEventListener(OPEN_AI_SETTINGS_EVENT, openAISettings);
        return () => window.removeEventListener(OPEN_AI_SETTINGS_EVENT, openAISettings);
    }, [openAISettings]);

    return (
        <div className="absolute top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-[var(--color-brand-border)]/70 bg-[var(--brand-surface)]/70 px-3 shadow-sm backdrop-blur-md transition-all sm:px-4">
            {/* Left: Menu & Brand */}
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                <TopNavMenu
                    isOpen={isMenuOpen}
                    isBeveled={isBeveled}
                    onToggle={toggleMenu}
                    onClose={closeMenu}
                    onGoHome={onGoHome}
                    onOpenSettings={openCanvasSettings}
                    onHistory={onHistory}
                    onImportJSON={onImportJSON}
                />
                <TopNavBrand
                    appName={APP_NAME}
                    logoUrl={null}
                    logoStyle="text"
                    ui={{ showBeta: true }}
                />
            </div>

            {/* Center: Tabs */}
            <div className="flex min-w-0 flex-[1.2] justify-center px-2 sm:px-3">
                <FlowTabs
                    pages={pages}
                    activePageId={activePageId}
                    onSwitchPage={onSwitchPage}
                    onAddPage={onAddPage}
                    onClosePage={onClosePage}
                    onRenamePage={onRenamePage}
                />
            </div>

            <div className="flex min-w-0 flex-1 justify-end">
                <TopNavActions
                    onPlay={onPlay}
                    onExportPNG={onExportPNG}
                    onCopyImage={onCopyImage}
                    onExportSVG={onExportSVG}
                    onCopySVG={onCopySVG}
                    onExportPDF={onExportPDF}
                    onExportCinematic={onExportCinematic}
                    onExportJSON={onExportJSON}
                    onCopyJSON={onCopyJSON}
                    onExportMermaid={onExportMermaid}
                    onDownloadMermaid={onDownloadMermaid}
                    onExportPlantUML={onExportPlantUML}
                    onDownloadPlantUML={onDownloadPlantUML}
                    onExportOpenFlowDSL={onExportOpenFlowDSL}
                    onDownloadOpenFlowDSL={onDownloadOpenFlowDSL}
                    onExportFigma={onExportFigma}
                    onDownloadFigma={onDownloadFigma}
                    onShare={onShare}
                    collaboration={collaboration}
                    isBeveled={isBeveled}
                />
            </div>

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
