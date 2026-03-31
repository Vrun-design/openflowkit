import React, { Suspense, lazy } from 'react';
import type { NodeData } from '@/lib/types';
import type { FlowEditorPanelsProps } from '@/components/FlowEditorPanels';
import type { CinematicExportRequest } from '@/services/export/cinematicExport';
import type {
  CollaborationRemotePresence,
  FlowEditorCollaborationTopNavState,
} from '@/hooks/useFlowEditorCollaboration';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { EditorPage } from '@/store/editorPageHooks';

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
    <div className="absolute top-0 left-0 right-0 z-50 h-14 border-b border-[var(--color-brand-border)]/20 bg-[var(--brand-surface)]/70 shadow-sm backdrop-blur-md" />
  );
}

export interface FlowEditorChromeProps {
  pages: EditorPage[];
  activePageId: string;
  topNav: {
    onSwitchPage: (pageId: string) => void;
    onAddPage: () => void;
    onClosePage: (pageId: string) => void;
    onRenamePage: (pageId: string, newName: string) => void;
    onReorderPage: (draggedPageId: string, targetPageId: string) => void;
    onExportPNG: (format?: 'png' | 'jpeg') => void;
    onCopyImage: (format?: 'png' | 'jpeg') => void;
    onExportSVG: () => void;
    onCopySVG: () => void;
    onExportPDF: () => void;
    onExportCinematic: (request: CinematicExportRequest) => void;
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
    onAddAnnotation: (position: { x: number; y: number }) => void;
    onAddSection: (position: { x: number; y: number }) => void;
    onAddTextNode: (position: { x: number; y: number }) => void;
    onAddClassNode: (position: { x: number; y: number }) => void;
    onAddEntityNode: (position: { x: number; y: number }) => void;
    onAddMindmapNode: (position: { x: number; y: number }) => void;
    onAddJourneyNode: (position: { x: number; y: number }) => void;
    onAddArchitectureNode: (position: { x: number; y: number }) => void;
    onAddSequenceParticipant: (position: { x: number; y: number }) => void;
    onAddWireframe: (variant: string, position: { x: number; y: number }) => void;
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
  pages,
  activePageId,
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
  const topNavProps = {
    pages,
    activePageId,
    collaboration: topNav.collaboration,
    onSwitchPage: topNav.onSwitchPage,
    onAddPage: topNav.onAddPage,
    onClosePage: topNav.onClosePage,
    onRenamePage: topNav.onRenamePage,
    onReorderPage: topNav.onReorderPage,
    onExportPNG: topNav.onExportPNG,
    onCopyImage: topNav.onCopyImage,
    onExportSVG: topNav.onExportSVG,
    onCopySVG: topNav.onCopySVG,
    onExportPDF: topNav.onExportPDF,
    onExportCinematic: topNav.onExportCinematic,
    onExportJSON: topNav.onExportJSON,
    onCopyJSON: topNav.onCopyJSON,
    onExportMermaid: topNav.onExportMermaid,
    onDownloadMermaid: topNav.onDownloadMermaid,
    onExportPlantUML: topNav.onExportPlantUML,
    onDownloadPlantUML: topNav.onDownloadPlantUML,
    onExportOpenFlowDSL: topNav.onExportOpenFlowDSL,
    onDownloadOpenFlowDSL: topNav.onDownloadOpenFlowDSL,
    onExportFigma: topNav.onExportFigma,
    onDownloadFigma: topNav.onDownloadFigma,
    onShare: topNav.onShare,
    onImportJSON: topNav.onImportJSON,
    onHistory: topNav.onHistory,
    onGoHome: topNav.onGoHome,
    onPlay: topNav.onPlay,
  };
  const toolbarProps = {
    onCommandBar: toolbar.onCommandBar,
    onToggleStudio: toolbar.onToggleStudio,
    isStudioOpen: toolbar.isStudioOpen,
    onOpenAssets: toolbar.onOpenAssets,
    onAddShape: toolbar.onAddShape,
    onAddAnnotation: toolbar.onAddAnnotation,
    onAddSection: toolbar.onAddSection,
    onAddTextNode: toolbar.onAddTextNode,
    onAddClassNode: toolbar.onAddClassNode,
    onAddEntityNode: toolbar.onAddEntityNode,
    onAddMindmapNode: toolbar.onAddMindmapNode,
    onAddJourneyNode: toolbar.onAddJourneyNode,
    onAddArchitectureNode: toolbar.onAddArchitectureNode,
    onAddSequenceParticipant: toolbar.onAddSequenceParticipant,
    onAddWireframe: toolbar.onAddWireframe,
    onUndo: toolbar.onUndo,
    onRedo: toolbar.onRedo,
    onLayout: toolbar.onLayout,
    canUndo: toolbar.canUndo,
    canRedo: toolbar.canRedo,
    isSelectMode: toolbar.isSelectMode,
    onToggleSelectMode: toolbar.onToggleSelectMode,
    isCommandBarOpen: toolbar.isCommandBarOpen,
    onTogglePanMode: toolbar.onTogglePanMode,
    getCenter: toolbar.getCenter,
  };
  const playbackProps = {
    isPlaying: playback.isPlaying,
    currentStepIndex: playback.currentStepIndex,
    totalSteps: playback.totalSteps,
    onPlayPause: playback.onPlayPause,
    onNext: playback.onNext,
    onPrev: playback.onPrev,
    onStop: playback.onStop,
  };
  const emptyStateProps = emptyState
    ? {
        title: emptyState.title,
        description: emptyState.description,
        generateLabel: emptyState.generateLabel,
        templatesLabel: emptyState.templatesLabel,
        addNodeLabel: emptyState.addNodeLabel,
        onGenerate: emptyState.onGenerate,
        onTemplates: emptyState.onTemplates,
        onAddNode: emptyState.onAddNode,
        onSuggestionClick: emptyState.onSuggestionClick,
      }
    : null;

  return (
    <>
      <Suspense fallback={<TopNavFallback />}>
        <LazyTopNav {...topNavProps} />
      </Suspense>

      <div className="flex min-h-0 flex-1 min-w-0 pt-14">
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
          <LazyToolbar {...toolbarProps} />
        </Suspense>
      ) : (
        <Suspense fallback={null}>
          <LazyPlaybackControls {...playbackProps} />
        </Suspense>
      )}

      {emptyStateProps ? (
        <Suspense fallback={null}>
          <LazyFlowEditorEmptyState {...emptyStateProps} />
        </Suspense>
      ) : null}
    </>
  );
}
