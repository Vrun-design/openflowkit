import { useMemo } from 'react';
import type { TFunction } from 'i18next';
import type { FlowNode } from '@/lib/types';
import type { FlowEditorChromeProps } from './FlowEditorChrome';

interface BuildTopNavParams {
    handleSwitchTab: (tabId: string) => void;
    handleAddTab: () => void;
    handleCloseTab: (tabId: string) => void;
    handleRenameTab: (tabId: string, newName: string) => void;
    handleExport: (format?: 'png' | 'jpeg') => void;
    handleSvgExport: () => void;
    handleAnimatedExport: (format: 'video' | 'gif') => void;
    handleExportJSON: () => void;
    handleExportMermaid: () => void;
    handleExportPlantUML: () => void;
    handleExportOpenFlowDSL: () => void;
    handleExportFigma: () => void;
    handleShare: () => void;
    handleImportJSON: () => void;
    openHistory: () => void;
    onGoHome: () => void;
    startPlayback: () => void;
    collaborationTopNavState?: FlowEditorChromeProps['topNav']['collaboration'];
}

interface BuildToolbarParams {
    currentStepIndex: number;
    openCommandBar: (view: 'root' | 'search' | 'assets' | 'templates' | 'layout' | 'design-system') => void;
    toggleStudioPanel: () => void;
    editorMode: 'canvas' | 'studio';
    handleAddShape: FlowEditorChromeProps['toolbar']['onAddShape'];
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
    openCommandBar: (view: 'root' | 'search' | 'assets' | 'templates' | 'layout' | 'design-system') => void;
    handleAddNode: (position?: { x: number; y: number }) => void;
    setPendingAIPrompt: (prompt: string) => void;
}

export function buildFlowEditorTopNavProps({
    handleSwitchTab,
    handleAddTab,
    handleCloseTab,
    handleRenameTab,
    handleExport,
    handleSvgExport,
    handleAnimatedExport,
    handleExportJSON,
    handleExportMermaid,
    handleExportPlantUML,
    handleExportOpenFlowDSL,
    handleExportFigma,
    handleShare,
    handleImportJSON,
    openHistory,
    onGoHome,
    startPlayback,
    collaborationTopNavState,
}: BuildTopNavParams): FlowEditorChromeProps['topNav'] {
    return {
        onSwitchTab: handleSwitchTab,
        onAddTab: handleAddTab,
        onCloseTab: handleCloseTab,
        onRenameTab: handleRenameTab,
        onExportPNG: handleExport,
        onExportSVG: handleSvgExport,
        onExportAnimated: handleAnimatedExport,
        onExportJSON: handleExportJSON,
        onExportMermaid: handleExportMermaid,
        onExportPlantUML: handleExportPlantUML,
        onExportOpenFlowDSL: handleExportOpenFlowDSL,
        onExportFigma: handleExportFigma,
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
        description: t('flowEditor.emptyState.description', { defaultValue: 'Choose the fastest way to get a first draft on the canvas, then refine it with layout, properties, and Studio tools.' }),
        generateLabel: t('flowEditor.emptyState.generateWithAIStudio', { defaultValue: 'Generate with AI Studio' }),
        templatesLabel: t('flowEditor.emptyState.browseTemplates', { defaultValue: 'Browse templates' }),
        addNodeLabel: t('flowEditor.emptyState.addBlankNode', { defaultValue: 'Start from a blank node' }),
        onGenerate: () => openStudioPanel('ai'),
        onTemplates: () => openCommandBar('templates'),
        onAddNode: () => handleAddNode(),
        onSuggestionClick: (prompt) => {
            setPendingAIPrompt(prompt);
            openStudioPanel('ai');
        },
    };
}

interface UseFlowEditorChromePropsParams extends BuildTopNavParams, BuildToolbarParams, BuildPlaybackParams, BuildEmptyStateParams {}

export function useFlowEditorChromeProps(params: UseFlowEditorChromePropsParams): Pick<FlowEditorChromeProps, 'topNav' | 'toolbar' | 'playback' | 'emptyState'> {
    const {
        handleSwitchTab,
        handleAddTab,
        handleCloseTab,
        handleRenameTab,
        handleExport,
        handleSvgExport,
        handleAnimatedExport,
        handleExportJSON,
        handleExportMermaid,
        handleExportPlantUML,
        handleExportOpenFlowDSL,
        handleExportFigma,
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

    const topNav = useMemo(() => buildFlowEditorTopNavProps({
        handleSwitchTab,
        handleAddTab,
        handleCloseTab,
        handleRenameTab,
        handleExport,
        handleSvgExport,
        handleAnimatedExport,
        handleExportJSON,
        handleExportMermaid,
        handleExportPlantUML,
        handleExportOpenFlowDSL,
        handleExportFigma,
        handleShare,
        handleImportJSON,
        openHistory,
        onGoHome,
        startPlayback,
        collaborationTopNavState,
    }), [
        handleSwitchTab,
        handleAddTab,
        handleCloseTab,
        handleRenameTab,
        handleExport,
        handleSvgExport,
        handleAnimatedExport,
        handleExportJSON,
        handleExportMermaid,
        handleExportPlantUML,
        handleExportOpenFlowDSL,
        handleExportFigma,
        handleShare,
        handleImportJSON,
        openHistory,
        onGoHome,
        startPlayback,
        collaborationTopNavState,
    ]);
    const toolbar = useMemo(() => buildFlowEditorToolbarProps({
        currentStepIndex,
        openCommandBar,
        toggleStudioPanel,
        editorMode,
        handleAddShape,
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
    }), [
        currentStepIndex,
        openCommandBar,
        toggleStudioPanel,
        editorMode,
        handleAddShape,
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
    ]);
    const playback = useMemo(() => buildFlowEditorPlaybackProps({
        currentStepIndex,
        totalSteps,
        isPlaying,
        togglePlay,
        nextStep,
        prevStep,
        stopPlayback,
    }), [currentStepIndex, totalSteps, isPlaying, togglePlay, nextStep, prevStep, stopPlayback]);
    const emptyState = useMemo(() => buildFlowEditorEmptyStateProps({
        nodes,
        t,
        openStudioPanel,
        openCommandBar,
        handleAddNode,
        setPendingAIPrompt,
    }), [nodes, t, openStudioPanel, openCommandBar, handleAddNode, setPendingAIPrompt]);

    return {
        topNav,
        toolbar,
        playback,
        emptyState,
    };
}
