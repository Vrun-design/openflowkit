import { useCallback, useEffect } from 'react';
import {
    getInitialFlowEditorTemplateId,
    shouldOpenFlowEditorAI,
    shouldOpenFlowEditorTemplates,
} from '@/app/routeState';
import { getFlowTemplates } from '@/services/templates';
import type { FlowEdge, FlowNode, FlowSnapshot } from '@/lib/types';
import type { FlowEditorMode, StudioCodeMode, StudioTab } from '@/hooks/useFlowEditorUIState';
import type { DomainLibraryItem } from '@/services/domainLibrary';
import type { LayoutAlgorithm } from '@/services/elkLayout';
import type { Location, NavigateFunction } from 'react-router-dom';
import type { TFunction } from 'i18next';
import type { FlowEditorChromeProps } from './FlowEditorChrome';
import type {
    BuildFlowEditorPanelsPropsParams,
    CommandBarPanelBuilderParams,
    PropertiesRailBuilderParams,
    SnapshotsPanelBuilderParams,
    StudioRailBuilderParams,
} from './panelProps';
import { useFlowEditorShellController } from './useFlowEditorShellController';
import { useFlowEditorStudioController } from './useFlowEditorStudioController';
import { useFlowEditorPanelProps } from './useFlowEditorPanelProps';
import { useFlowEditorChromeProps } from './flowEditorChromeProps';

export interface UseFlowEditorShellParams {
    location: Location;
    navigate: NavigateFunction;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    pages: Array<{ id: string; name: string }>;
    activePageId: string | null;
    snapshots: FlowSnapshot[];
    nodes: FlowNode[];
    edges: FlowEdge[];
    selectedNodeId: string | null;
    selectedEdgeId: string | null;
    isCommandBarOpen: boolean;
    isHistoryOpen: boolean;
    editorMode: FlowEditorMode;
    handleExportJSON: () => void;
    onLayout: (
        direction?: 'TB' | 'LR' | 'RL' | 'BT',
        algorithm?: LayoutAlgorithm,
        spacing?: 'compact' | 'normal' | 'loose'
    ) => Promise<void>;
}

export interface UseFlowEditorStudioParams {
    editorMode: FlowEditorMode;
    studioTab: StudioTab;
    selectedNodeId: string | null;
    selectedEdgeId: string | null;
    setStudioTab: (tab: StudioTab) => void;
    setStudioCodeMode: (mode: StudioCodeMode) => void;
    setStudioMode: () => void;
    closeCommandBar: () => void;
    setCanvasMode: () => void;
    setSelectedNodeId: (id: string | null) => void;
    setSelectedEdgeId: (id: string | null) => void;
}

type FlowEditorCommandBarConfig = Omit<
    CommandBarPanelBuilderParams,
    | 'isCommandBarOpen'
    | 'closeCommandBar'
    | 'nodes'
    | 'edges'
    | 'onLayout'
    | 'openStudioAI'
    | 'openStudioCode'
    | 'openStudioPlayback'
    | 'handleAddAnnotation'
    | 'handleAddSection'
    | 'handleAddTextNode'
    | 'handleAddJourneyNode'
    | 'handleAddMindmapNode'
    | 'handleAddArchitectureNode'
    | 'handleAddSequenceParticipant'
    | 'handleAddClassNode'
    | 'handleAddEntityNode'
    | 'handleAddImage'
    | 'handleAddWireframe'
    | 'handleAddDomainLibraryItem'
>;

type FlowEditorSnapshotsConfig = Omit<
    SnapshotsPanelBuilderParams,
    'isHistoryOpen' | 'snapshots' | 'nodes' | 'edges' | 'handleCompareSnapshot'
> & {
    setDiffBaseline: NonNullable<SnapshotsPanelBuilderParams['handleCompareSnapshot']>;
};

type FlowEditorPropertiesConfig = Omit<
    PropertiesRailBuilderParams,
    'selectedNode' | 'selectedNodes' | 'selectedEdge' | 'clearSelection'
>;

type FlowEditorStudioConfig = Omit<
    StudioRailBuilderParams,
    | 'closeStudioPanel'
    | 'selectedNode'
    | 'selectedNodeCount'
    | 'setCanvasMode'
    | 'studioTab'
    | 'setStudioTab'
    | 'setStudioCodeMode'
    | 'playback'
    | 'initialPrompt'
    | 'onInitialPromptConsumed'
> & {
    playback: {
        currentStepIndex: number;
        totalSteps: number;
        isPlaying: boolean;
        startPlayback: () => void;
        togglePlay: () => void;
        stopPlayback: () => void;
        jumpToStep: (stepIndex: number) => void;
        nextStep: () => void;
        prevStep: () => void;
        playbackSpeed: number;
        setPlaybackSpeed: (speed: number) => void;
    };
    pendingAIPrompt?: string;
    clearPendingAIPrompt: () => void;
};

export interface UseFlowEditorPanelsParams {
    commandBar: FlowEditorCommandBarConfig;
    snapshots: FlowEditorSnapshotsConfig;
    properties: FlowEditorPropertiesConfig;
    studio: FlowEditorStudioConfig;
    isHistoryOpen: BuildFlowEditorPanelsPropsParams['isHistoryOpen'];
    editorMode: BuildFlowEditorPanelsPropsParams['editorMode'];
}

export interface UseFlowEditorChromeParams {
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
    collaborationTopNavState?: FlowEditorChromeProps['topNav']['collaboration'];
    openCommandBar: (view: 'root' | 'search' | 'assets' | 'templates' | 'layout' | 'design-system') => void;
    handleAddShape: (shapeType: string, position?: { x: number; y: number }) => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    isSelectMode: boolean;
    enableSelectMode: () => void;
    enablePanMode: () => void;
    getCenter: () => { x: number; y: number };
    t: TFunction;
    handleAddNode: (position?: { x: number; y: number }) => void;
    setPendingAIPrompt: (prompt: string | undefined) => void;
    startPlayback: () => void;
    totalSteps: number;
    isPlaying: boolean;
    togglePlay: () => void;
    nextStep: () => void;
    prevStep: () => void;
    stopPlayback: () => void;
    handleAddAnnotation: () => void;
    handleAddSection: () => void;
    handleAddTextNode: () => void;
    handleAddJourneyNode: () => void;
    handleAddMindmapNode: () => void;
    handleAddArchitectureNode: () => void;
    handleAddSequenceParticipant: () => void;
    handleAddClassNode: () => void;
    handleAddEntityNode: () => void;
    handleAddImage: (imageUrl: string) => void;
    handleAddWireframe: (surface: 'browser' | 'mobile') => void;
    handleAddDomainLibraryItem: (item: DomainLibraryItem) => void;
}

export interface UseFlowEditorControllerParams {
    shell: UseFlowEditorShellParams;
    studio: UseFlowEditorStudioParams;
    panels: UseFlowEditorPanelsParams;
    chrome: UseFlowEditorChromeParams;
}

export function useFlowEditorController({
    shell,
    studio,
    panels: panelParams,
    chrome: chromeParams,
}: UseFlowEditorControllerParams) {
    const {
        handleLayoutWithContext,
        selectedNode,
        selectedNodes,
        selectedEdge,
        shouldRenderPanels,
    } = useFlowEditorShellController(shell);

    const {
        openStudioPanel,
        openStudioAI,
        openStudioCode,
        openStudioPlayback,
        toggleStudioPanel,
        closeStudioPanel,
        handleCanvasEntityIntent,
    } = useFlowEditorStudioController(studio);

    const clearSelection = useCallback(() => {
        studio.setSelectedNodeId(null);
        studio.setSelectedEdgeId(null);
    }, [studio]);

    const panels = useFlowEditorPanelProps({
        commandBar: {
            ...panelParams.commandBar,
            isCommandBarOpen: shell.isCommandBarOpen,
            closeCommandBar: studio.closeCommandBar,
            nodes: shell.nodes,
            edges: shell.edges,
            onLayout: shell.onLayout,
            openStudioAI,
            openStudioCode,
            openStudioPlayback,
            handleAddAnnotation: chromeParams.handleAddAnnotation,
            handleAddSection: chromeParams.handleAddSection,
            handleAddTextNode: chromeParams.handleAddTextNode,
            handleAddJourneyNode: chromeParams.handleAddJourneyNode,
            handleAddMindmapNode: chromeParams.handleAddMindmapNode,
            handleAddArchitectureNode: chromeParams.handleAddArchitectureNode,
            handleAddSequenceParticipant: chromeParams.handleAddSequenceParticipant,
            handleAddClassNode: chromeParams.handleAddClassNode,
            handleAddEntityNode: chromeParams.handleAddEntityNode,
            handleAddImage: chromeParams.handleAddImage,
            handleAddWireframe: chromeParams.handleAddWireframe,
            handleAddDomainLibraryItem: chromeParams.handleAddDomainLibraryItem,
        },
        snapshots: {
            ...panelParams.snapshots,
            isHistoryOpen: shell.isHistoryOpen,
            snapshots: shell.snapshots,
            handleCompareSnapshot: panelParams.snapshots.setDiffBaseline,
            nodes: shell.nodes,
            edges: shell.edges,
        },
        properties: {
            ...panelParams.properties,
            selectedNode,
            selectedNodes,
            selectedEdge,
            clearSelection,
        },
        studio: {
            ...panelParams.studio,
            closeStudioPanel,
            selectedNode,
            selectedNodeCount: selectedNodes.length,
            setCanvasMode: studio.setCanvasMode,
            studioTab: studio.studioTab,
            setStudioTab: studio.setStudioTab,
            setStudioCodeMode: studio.setStudioCodeMode,
            playback: {
                currentStepIndex: panelParams.studio.playback.currentStepIndex,
                totalSteps: panelParams.studio.playback.totalSteps,
                isPlaying: panelParams.studio.playback.isPlaying,
                onStartPlayback: panelParams.studio.playback.startPlayback,
                onPlayPause: panelParams.studio.playback.togglePlay,
                onStop: panelParams.studio.playback.stopPlayback,
                onScrubToStep: panelParams.studio.playback.jumpToStep,
                onNext: panelParams.studio.playback.nextStep,
                onPrev: panelParams.studio.playback.prevStep,
                playbackSpeed: panelParams.studio.playback.playbackSpeed,
                onPlaybackSpeedChange: panelParams.studio.playback.setPlaybackSpeed,
            },
            initialPrompt: panelParams.studio.pendingAIPrompt,
            onInitialPromptConsumed: panelParams.studio.clearPendingAIPrompt,
        },
        isHistoryOpen: shell.isHistoryOpen,
        editorMode: shell.editorMode,
    });

    const chrome = useFlowEditorChromeProps({
        ...chromeParams,
        handleExportJSON: shell.handleExportJSON,
        currentStepIndex: panelParams.studio.playback.currentStepIndex,
        toggleStudioPanel,
        editorMode: shell.editorMode,
        handleLayoutWithContext,
        openStudioPanel,
        isCommandBarOpen: shell.isCommandBarOpen,
        nodes: shell.nodes,
        undo: panelParams.commandBar.undo,
        redo: panelParams.commandBar.redo,
    });

    useEffect(() => {
        if (!shouldOpenFlowEditorTemplates(shell.location.state)) return;
        chromeParams.openCommandBar('templates');
        shell.navigate(
            { pathname: shell.location.pathname, search: shell.location.search, hash: shell.location.hash },
            { replace: true, state: null }
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!shouldOpenFlowEditorAI(shell.location.state)) return;
        openStudioAI();
        shell.navigate(
            { pathname: shell.location.pathname, search: shell.location.search, hash: shell.location.hash },
            { replace: true, state: null }
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const initialTemplateId = getInitialFlowEditorTemplateId(shell.location.state);
        if (!initialTemplateId) return;

        const template = getFlowTemplates().find((candidate) => candidate.id === initialTemplateId);
        if (!template) {
            shell.navigate(
                { pathname: shell.location.pathname, search: shell.location.search, hash: shell.location.hash },
                { replace: true, state: null }
            );
            return;
        }

        panelParams.commandBar.handleInsertTemplate(template);
        shell.navigate(
            { pathname: shell.location.pathname, search: shell.location.search, hash: shell.location.hash },
            { replace: true, state: null }
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        shouldRenderPanels,
        handleCanvasEntityIntent,
        panels,
        chrome,
    };
}
