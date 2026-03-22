import React, { Suspense, lazy } from 'react';
import type { FlowTab } from '@/lib/types';
import type { NodeData } from '@/lib/types';
import type { FlowEditorPanelsProps } from '@/components/FlowEditorPanels';
import type {
    CollaborationRemotePresence,
    FlowEditorCollaborationTopNavState,
} from '@/hooks/useFlowEditorCollaboration';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const LazyFlowEditorPanels = lazy(async () => {
    const module = await import('@/components/FlowEditorPanels');
    return { default: module.FlowEditorPanels };
});

const LazyTopNav = lazy(async () => {
    const module = await import('@/components/TopNav');
    return { default: module.TopNav };
});

const LazyToolbar = lazy(async () => {
    const module = await import('@/components/Toolbar');
    return { default: module.Toolbar };
});

const LazyPlaybackControls = lazy(async () => {
    const module = await import('@/components/PlaybackControls');
    return { default: module.PlaybackControls };
});

const LazyFlowEditorLayoutOverlay = lazy(async () => {
    const module = await import('@/components/FlowEditorLayoutOverlay');
    return { default: module.FlowEditorLayoutOverlay };
});

const LazyFlowEditorEmptyState = lazy(async () => {
    const module = await import('@/components/FlowEditorEmptyState');
    return { default: module.FlowEditorEmptyState };
});

const LazyDiffModeBanner = lazy(async () => {
    const module = await import('@/components/diagram-diff/DiffModeBanner');
    return { default: module.DiffModeBanner };
});

const LazyCollaborationPresenceOverlay = lazy(async () => {
    const module = await import('@/components/flow-editor/CollaborationPresenceOverlay');
    return { default: module.CollaborationPresenceOverlay };
});

function TopNavFallback(): React.ReactElement {
    return (
        <div className="absolute top-0 left-0 right-0 z-50 h-16 border-b border-white/20 bg-white/70 shadow-sm backdrop-blur-md" />
    );
}

export interface FlowEditorChromeProps {
    tabs: FlowTab[];
    activeTabId: string;
    topNav: {
        onSwitchTab: (tabId: string) => void;
        onAddTab: () => void;
        onCloseTab: (tabId: string) => void;
        onRenameTab: (tabId: string, newName: string) => void;
        onExportPNG: (format?: 'png' | 'jpeg') => void;
        onExportSVG: () => void;
        onExportAnimated: (format: 'video' | 'gif') => void;
        onExportJSON: () => void;
        onExportMermaid: () => void;
        onExportPlantUML: () => void;
        onExportOpenFlowDSL: () => void;
        onExportFigma: () => void;
        onShare: () => void;
        onImportJSON: () => void;
        onHistory: () => void;
        onGoHome: () => void;
        onPlay: () => void;
        collaboration?: FlowEditorCollaborationTopNavState;
    };
    canvas: React.ReactNode;
    shouldRenderPanels: boolean;
    panels: FlowEditorPanelsProps;
    collaborationEnabled: boolean;
    remotePresence: CollaborationRemotePresence[];
    collaborationNodePositions?: Map<string, { x: number; y: number; width: number; height: number }>;
    layoutMessage: string;
    isLayouting: boolean;
    playback: {
        currentStepIndex: number;
        totalSteps: number;
        isPlaying: boolean;
        onPlayPause: () => void;
        onNext: () => void;
        onPrev: () => void;
        onStop: () => void;
    };
    toolbar: {
        isVisible: boolean;
        onCommandBar: () => void;
        onToggleStudio: () => void;
        isStudioOpen: boolean;
        onOpenAssets: () => void;
        onAddShape: (shape: NodeData['shape'], position: { x: number; y: number }) => void;
        onUndo: () => void;
        onRedo: () => void;
        onLayout: () => void;
        canUndo: boolean;
        canRedo: boolean;
        isSelectMode: boolean;
        onToggleSelectMode: () => void;
        isCommandBarOpen: boolean;
        onTogglePanMode: () => void;
        getCenter: () => { x: number; y: number };
    };
    emptyState?: {
        title: string;
        description: string;
        generateLabel: string;
        templatesLabel: string;
        addNodeLabel: string;
        onGenerate: () => void;
        onTemplates: () => void;
        onAddNode: () => void;
        onSuggestionClick?: (prompt: string) => void;
    };
}

export function FlowEditorChrome({
    tabs,
    activeTabId,
    topNav,
    canvas,
    shouldRenderPanels,
    panels,
    collaborationEnabled,
    remotePresence,
    collaborationNodePositions,
    layoutMessage,
    isLayouting,
    playback,
    toolbar,
    emptyState,
}: FlowEditorChromeProps): React.ReactElement {
    return (
        <>
            <Suspense fallback={<TopNavFallback />}>
                <LazyTopNav
                    tabs={tabs}
                    activeTabId={activeTabId}
                    onSwitchTab={topNav.onSwitchTab}
                    onAddTab={topNav.onAddTab}
                    onCloseTab={topNav.onCloseTab}
                    onRenameTab={topNav.onRenameTab}
                    onExportPNG={topNav.onExportPNG}
                    onExportSVG={topNav.onExportSVG}
                    onExportAnimated={topNav.onExportAnimated}
                    onExportJSON={topNav.onExportJSON}
                    onExportMermaid={topNav.onExportMermaid}
                    onExportPlantUML={topNav.onExportPlantUML}
                    onExportOpenFlowDSL={topNav.onExportOpenFlowDSL}
                    onExportFigma={topNav.onExportFigma}
                    onShare={topNav.onShare}
                    onImportJSON={topNav.onImportJSON}
                    onHistory={topNav.onHistory}
                    onGoHome={topNav.onGoHome}
                    onPlay={topNav.onPlay}
                    collaboration={topNav.collaboration}
                />
            </Suspense>

            <div className="flex min-h-0 flex-1 min-w-0 pt-16">
                <div className="relative min-w-0 flex-1">
                    <ErrorBoundary className="h-full">{canvas}</ErrorBoundary>
                    <Suspense fallback={null}>
                        <LazyDiffModeBanner />
                    </Suspense>
                </div>
                {shouldRenderPanels ? (
                    <Suspense fallback={null}>
                        <LazyFlowEditorPanels {...panels} />
                    </Suspense>
                ) : null}
            </div>

            {collaborationEnabled ? (
                <Suspense fallback={null}>
                    <LazyCollaborationPresenceOverlay
                        remotePresence={remotePresence}
                        nodePositions={collaborationNodePositions}
                    />
                </Suspense>
            ) : null}

            {isLayouting ? (
                <Suspense fallback={null}>
                    <LazyFlowEditorLayoutOverlay message={layoutMessage} />
                </Suspense>
            ) : null}

            {toolbar.isVisible ? (
                <Suspense fallback={null}>
                    <LazyToolbar
                        onCommandBar={toolbar.onCommandBar}
                        onToggleStudio={toolbar.onToggleStudio}
                        isStudioOpen={toolbar.isStudioOpen}
                        onOpenAssets={toolbar.onOpenAssets}
                        onAddShape={toolbar.onAddShape}
                        onUndo={toolbar.onUndo}
                        onRedo={toolbar.onRedo}
                        onLayout={toolbar.onLayout}
                        canUndo={toolbar.canUndo}
                        canRedo={toolbar.canRedo}
                        isSelectMode={toolbar.isSelectMode}
                        onToggleSelectMode={toolbar.onToggleSelectMode}
                        isCommandBarOpen={toolbar.isCommandBarOpen}
                        onTogglePanMode={toolbar.onTogglePanMode}
                        getCenter={toolbar.getCenter}
                    />
                </Suspense>
            ) : (
                <Suspense fallback={null}>
                    <LazyPlaybackControls
                        isPlaying={playback.isPlaying}
                        currentStepIndex={playback.currentStepIndex}
                        totalSteps={playback.totalSteps}
                        onPlayPause={playback.onPlayPause}
                        onNext={playback.onNext}
                        onPrev={playback.onPrev}
                        onStop={playback.onStop}
                    />
                </Suspense>
            )}

            {emptyState ? (
                <Suspense fallback={null}>
                    <LazyFlowEditorEmptyState
                        title={emptyState.title}
                        description={emptyState.description}
                        generateLabel={emptyState.generateLabel}
                        templatesLabel={emptyState.templatesLabel}
                        addNodeLabel={emptyState.addNodeLabel}
                        onGenerate={emptyState.onGenerate}
                        onTemplates={emptyState.onTemplates}
                        onAddNode={emptyState.onAddNode}
                        onSuggestionClick={emptyState.onSuggestionClick}
                    />
                </Suspense>
            ) : null}
        </>
    );
}
