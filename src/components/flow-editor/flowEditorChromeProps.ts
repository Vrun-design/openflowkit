import { useMemo } from 'react';
import type { TFunction } from 'i18next';
import type { FlowNode } from '@/lib/types';
import type { FlowEditorChromeProps } from './FlowEditorChrome';

interface BuildTopNavParams {
  handleSwitchPage: (pageId: string) => void;
  handleAddPage: () => void;
  handleClosePage: (pageId: string) => void;
  handleRenamePage: (pageId: string, newName: string) => void;
  handleExport: (format?: 'png' | 'jpeg') => void;
  handleCopyImage: (format?: 'png' | 'jpeg') => void;
  handleSvgExport: () => void;
  handleCopySvg: () => void;
  handlePdfExport: () => void;
  handleCinematicExport: (format: 'cinematic-video' | 'cinematic-gif') => void;
  handleExportJSON: () => void;
  handleCopyJSON: () => void;
  handleExportMermaid: () => void;
  handleDownloadMermaid: () => void;
  handleExportPlantUML: () => void;
  handleDownloadPlantUML: () => void;
  handleExportOpenFlowDSL: () => void;
  handleDownloadOpenFlowDSL: () => void;
  handleExportFigma: () => void;
  handleDownloadFigma: () => void;
  handleShare: () => void;
  handleImportJSON: () => void;
  openHistory: () => void;
  onGoHome: () => void;
  startPlayback: () => void;
  collaborationTopNavState?: FlowEditorChromeProps['topNav']['collaboration'];
}

interface BuildToolbarParams {
  currentStepIndex: number;
  openCommandBar: (
    view: 'root' | 'search' | 'assets' | 'templates' | 'layout' | 'design-system'
  ) => void;
  toggleStudioPanel: () => void;
  editorMode: 'canvas' | 'studio';
  handleAddShape: FlowEditorChromeProps['toolbar']['onAddShape'];
  handleAddAnnotation: (position: { x: number; y: number }) => void;
  handleAddSection: (position: { x: number; y: number }) => void;
  handleAddTextNode: (position: { x: number; y: number }) => void;
  handleAddClassNode: (position: { x: number; y: number }) => void;
  handleAddEntityNode: (position: { x: number; y: number }) => void;
  handleAddMindmapNode: (position: { x: number; y: number }) => void;
  handleAddJourneyNode: (position: { x: number; y: number }) => void;
  handleAddArchitectureNode: (position: { x: number; y: number }) => void;
  handleAddSequenceParticipant: (position: { x: number; y: number }) => void;
  handleAddWireframe: (variant: string, position: { x: number; y: number }) => void;
  undo: () => void;
  redo: () => void;
  handleLayoutWithContext: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isSelectMode: boolean;
  enableSelectMode: () => void;
  isCommandBarOpen: boolean;
  enablePanMode: () => void;
  getCenter: () => { x: number; y: number };
}

interface BuildPlaybackParams {
  currentStepIndex: number;
  totalSteps: number;
  isPlaying: boolean;
  togglePlay: () => void;
  nextStep: () => void;
  prevStep: () => void;
  stopPlayback: () => void;
}

interface BuildEmptyStateParams {
  nodes: FlowNode[];
  t: TFunction;
  openStudioPanel: (tab: 'ai' | 'code' | 'playback') => void;
  openCommandBar: (
    view: 'root' | 'search' | 'assets' | 'templates' | 'layout' | 'design-system'
  ) => void;
  handleAddNode: (position?: { x: number; y: number }) => void;
  setPendingAIPrompt: (prompt: string) => void;
}

export function buildFlowEditorTopNavProps({
  handleSwitchPage,
  handleAddPage,
  handleClosePage,
  handleRenamePage,
  handleExport,
  handleCopyImage,
  handleSvgExport,
  handleCopySvg,
  handlePdfExport,
  handleCinematicExport,
  handleExportJSON,
  handleCopyJSON,
  handleExportMermaid,
  handleDownloadMermaid,
  handleExportPlantUML,
  handleDownloadPlantUML,
  handleExportOpenFlowDSL,
  handleDownloadOpenFlowDSL,
  handleExportFigma,
  handleDownloadFigma,
  handleShare,
  handleImportJSON,
  openHistory,
  onGoHome,
  startPlayback,
  collaborationTopNavState,
}: BuildTopNavParams): FlowEditorChromeProps['topNav'] {
  return {
    onSwitchPage: handleSwitchPage,
    onAddPage: handleAddPage,
    onClosePage: handleClosePage,
    onRenamePage: handleRenamePage,
    onExportPNG: handleExport,
    onCopyImage: handleCopyImage,
    onExportSVG: handleSvgExport,
    onCopySVG: handleCopySvg,
    onExportPDF: handlePdfExport,
    onExportCinematic: handleCinematicExport,
    onExportJSON: handleExportJSON,
    onCopyJSON: handleCopyJSON,
    onExportMermaid: handleExportMermaid,
    onDownloadMermaid: handleDownloadMermaid,
    onExportPlantUML: handleExportPlantUML,
    onDownloadPlantUML: handleDownloadPlantUML,
    onExportOpenFlowDSL: handleExportOpenFlowDSL,
    onDownloadOpenFlowDSL: handleDownloadOpenFlowDSL,
    onExportFigma: handleExportFigma,
    onDownloadFigma: handleDownloadFigma,
    onShare: handleShare,
    onImportJSON: handleImportJSON,
    onHistory: openHistory,
    onGoHome,
    onPlay: startPlayback,
    collaboration: collaborationTopNavState,
  };
}

export function buildFlowEditorToolbarProps({
  currentStepIndex,
  openCommandBar,
  toggleStudioPanel,
  editorMode,
  handleAddShape,
  handleAddAnnotation,
  handleAddSection,
  handleAddTextNode,
  handleAddClassNode,
  handleAddEntityNode,
  handleAddMindmapNode,
  handleAddJourneyNode,
  handleAddArchitectureNode,
  handleAddSequenceParticipant,
  handleAddWireframe,
  undo,
  redo,
  handleLayoutWithContext,
  canUndo,
  canRedo,
  isSelectMode,
  enableSelectMode,
  isCommandBarOpen,
  enablePanMode,
  getCenter,
}: BuildToolbarParams): FlowEditorChromeProps['toolbar'] {
  return {
    isVisible: currentStepIndex === -1,
    onCommandBar: () => openCommandBar('root'),
    onToggleStudio: toggleStudioPanel,
    isStudioOpen: editorMode === 'studio',
    onOpenAssets: () => openCommandBar('assets'),
    onAddShape: handleAddShape,
    onAddAnnotation: handleAddAnnotation,
    onAddSection: handleAddSection,
    onAddTextNode: handleAddTextNode,
    onAddClassNode: handleAddClassNode,
    onAddEntityNode: handleAddEntityNode,
    onAddMindmapNode: handleAddMindmapNode,
    onAddJourneyNode: handleAddJourneyNode,
    onAddArchitectureNode: handleAddArchitectureNode,
    onAddSequenceParticipant: handleAddSequenceParticipant,
    onAddWireframe: handleAddWireframe,
    onUndo: undo,
    onRedo: redo,
    onLayout: handleLayoutWithContext,
    canUndo,
    canRedo,
    isSelectMode,
    onToggleSelectMode: enableSelectMode,
    isCommandBarOpen,
    onTogglePanMode: enablePanMode,
    getCenter,
  };
}

export function buildFlowEditorPlaybackProps({
  currentStepIndex,
  totalSteps,
  isPlaying,
  togglePlay,
  nextStep,
  prevStep,
  stopPlayback,
}: BuildPlaybackParams): FlowEditorChromeProps['playback'] {
  return {
    currentStepIndex,
    totalSteps,
    isPlaying,
    onPlayPause: togglePlay,
    onNext: nextStep,
    onPrev: prevStep,
    onStop: stopPlayback,
  };
}

export function buildFlowEditorEmptyStateProps({
  nodes,
  t,
  openStudioPanel,
  openCommandBar,
  handleAddNode,
  setPendingAIPrompt,
}: BuildEmptyStateParams): FlowEditorChromeProps['emptyState'] | undefined {
  if (nodes.length > 0) {
    return undefined;
  }

  return {
    title: t('flowEditor.emptyState.title', { defaultValue: 'Start your diagram' }),
    description: t('flowEditor.emptyState.description', {
      defaultValue:
        'Choose the fastest way to get a first draft on the canvas, then refine it with layout, properties, and Studio tools.',
    }),
    generateLabel: t('flowEditor.emptyState.generateWithFlowpilot', {
      defaultValue: 'Generate with Flowpilot',
    }),
    templatesLabel: t('flowEditor.emptyState.browseTemplates', {
      defaultValue: 'Browse templates',
    }),
    addNodeLabel: t('flowEditor.emptyState.addBlankNode', {
      defaultValue: 'Start from a blank node',
    }),
    onGenerate: () => openStudioPanel('ai'),
    onTemplates: () => openCommandBar('templates'),
    onAddNode: () => handleAddNode(),
    onSuggestionClick: (prompt) => {
      setPendingAIPrompt(prompt);
      openStudioPanel('ai');
    },
  };
}

interface UseFlowEditorChromePropsParams
  extends BuildTopNavParams, BuildToolbarParams, BuildPlaybackParams, BuildEmptyStateParams {}

export function useFlowEditorChromeProps(
  params: UseFlowEditorChromePropsParams
): Pick<FlowEditorChromeProps, 'topNav' | 'toolbar' | 'playback' | 'emptyState'> {
  const {
    handleSwitchPage,
    handleAddPage,
    handleClosePage,
    handleRenamePage,
    handleExport,
    handleCopyImage,
    handleSvgExport,
    handleCopySvg,
    handlePdfExport,
    handleCinematicExport,
    handleExportJSON,
    handleCopyJSON,
    handleExportMermaid,
    handleDownloadMermaid,
    handleExportPlantUML,
    handleDownloadPlantUML,
    handleExportOpenFlowDSL,
    handleDownloadOpenFlowDSL,
    handleExportFigma,
    handleDownloadFigma,
    handleShare,
    handleImportJSON,
    openHistory,
    onGoHome,
    startPlayback,
    collaborationTopNavState,
    currentStepIndex,
    toggleStudioPanel,
    editorMode,
    handleAddShape,
    handleAddAnnotation,
    handleAddSection,
    handleAddTextNode,
    handleAddClassNode,
    handleAddEntityNode,
    handleAddMindmapNode,
    handleAddJourneyNode,
    handleAddArchitectureNode,
    handleAddSequenceParticipant,
    handleAddWireframe,
    undo,
    redo,
    handleLayoutWithContext,
    canUndo,
    canRedo,
    isSelectMode,
    enableSelectMode,
    isCommandBarOpen,
    enablePanMode,
    getCenter,
    totalSteps,
    isPlaying,
    togglePlay,
    nextStep,
    prevStep,
    stopPlayback,
    nodes,
    t,
    openStudioPanel,
    openCommandBar,
    handleAddNode,
    setPendingAIPrompt,
  } = params;

  const topNav = useMemo(
    () =>
      buildFlowEditorTopNavProps({
        handleSwitchPage,
        handleAddPage,
        handleClosePage,
        handleRenamePage,
        handleExport,
        handleCopyImage,
        handleSvgExport,
        handleCopySvg,
        handlePdfExport,
        handleCinematicExport,
        handleExportJSON,
        handleCopyJSON,
        handleExportMermaid,
        handleDownloadMermaid,
        handleExportPlantUML,
        handleDownloadPlantUML,
        handleExportOpenFlowDSL,
        handleDownloadOpenFlowDSL,
        handleExportFigma,
        handleDownloadFigma,
        handleShare,
        handleImportJSON,
        openHistory,
        onGoHome,
        startPlayback,
        collaborationTopNavState,
      }),
    [
      handleSwitchPage,
      handleAddPage,
      handleClosePage,
      handleRenamePage,
      handleExport,
      handleCopyImage,
      handleSvgExport,
      handleCopySvg,
      handlePdfExport,
      handleCinematicExport,
      handleExportJSON,
      handleCopyJSON,
      handleExportMermaid,
      handleDownloadMermaid,
      handleExportPlantUML,
      handleDownloadPlantUML,
      handleExportOpenFlowDSL,
      handleDownloadOpenFlowDSL,
      handleExportFigma,
      handleDownloadFigma,
      handleShare,
      handleImportJSON,
      openHistory,
      onGoHome,
      startPlayback,
      collaborationTopNavState,
    ]
  );
  const toolbar = useMemo(
    () =>
      buildFlowEditorToolbarProps({
        currentStepIndex,
        openCommandBar,
        toggleStudioPanel,
        editorMode,
        handleAddShape,
        handleAddAnnotation,
        handleAddSection,
        handleAddTextNode,
        handleAddClassNode,
        handleAddEntityNode,
        handleAddMindmapNode,
        handleAddJourneyNode,
        handleAddArchitectureNode,
        handleAddSequenceParticipant,
        handleAddWireframe,
        undo,
        redo,
        handleLayoutWithContext,
        canUndo,
        canRedo,
        isSelectMode,
        enableSelectMode,
        isCommandBarOpen,
        enablePanMode,
        getCenter,
      }),
    [
      currentStepIndex,
      openCommandBar,
      toggleStudioPanel,
      editorMode,
      handleAddShape,
      handleAddAnnotation,
      handleAddSection,
      handleAddTextNode,
      handleAddClassNode,
      handleAddEntityNode,
      handleAddMindmapNode,
      handleAddJourneyNode,
      handleAddArchitectureNode,
      handleAddSequenceParticipant,
      handleAddWireframe,
      undo,
      redo,
      handleLayoutWithContext,
      canUndo,
      canRedo,
      isSelectMode,
      enableSelectMode,
      isCommandBarOpen,
      enablePanMode,
      getCenter,
    ]
  );
  const playback = useMemo(
    () =>
      buildFlowEditorPlaybackProps({
        currentStepIndex,
        totalSteps,
        isPlaying,
        togglePlay,
        nextStep,
        prevStep,
        stopPlayback,
      }),
    [currentStepIndex, totalSteps, isPlaying, togglePlay, nextStep, prevStep, stopPlayback]
  );
  const emptyState = useMemo(
    () =>
      buildFlowEditorEmptyStateProps({
        nodes,
        t,
        openStudioPanel,
        openCommandBar,
        handleAddNode,
        setPendingAIPrompt,
      }),
    [nodes, t, openStudioPanel, openCommandBar, handleAddNode, setPendingAIPrompt]
  );

  return {
    topNav,
    toolbar,
    playback,
    emptyState,
  };
}
