import type { TFunction } from 'i18next';
import type { FlowEdge, FlowNode, FlowSnapshot } from '@/lib/types';
import type { FlowEditorMode, StudioCodeMode, StudioTab } from '@/hooks/useFlowEditorUIState';
import type { DomainLibraryItem } from '@/services/domainLibrary';
import type { CinematicExportRequest } from '@/services/export/cinematicExport';
import type {
    UseFlowEditorChromeParams,
    UseFlowEditorPanelsParams,
    UseFlowEditorShellParams,
    UseFlowEditorStudioParams,
} from './useFlowEditorController';
import type { FlowEditorChromeProps } from './FlowEditorChrome';
import type { LayoutAlgorithm } from '@/services/elkLayout';
import type { Location, NavigateFunction } from 'react-router-dom';

interface BuildFlowEditorControllerShellParams {
    location: Location;
    navigate: NavigateFunction;
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
    isArchitectureRulesOpen: boolean;
    handleExportJSON: () => void;
    onLayout: (
        direction?: 'TB' | 'LR' | 'RL' | 'BT',
        algorithm?: LayoutAlgorithm,
        spacing?: 'compact' | 'normal' | 'loose'
    ) => Promise<void>;
}

interface BuildFlowEditorControllerStudioParams {
    editorMode: FlowEditorMode;
    studioTab: StudioTab;
    selectedNodeId: string | null;
    selectedEdgeId: string | null;
    setStudioTab: (tab: StudioTab) => void;
    setStudioCodeMode: (mode: StudioCodeMode) => void;
    setStudioMode: () => void;
    openArchitectureRulesPanel: () => void;
    closeCommandBar: () => void;
    setCanvasMode: () => void;
    setSelectedNodeId: (id: string | null) => void;
    setSelectedEdgeId: (id: string | null) => void;
}

type BuildFlowEditorControllerPanelsParams = UseFlowEditorPanelsParams;

interface BuildFlowEditorControllerChromeParams {
    handleSwitchPage: (pageId: string) => void;
    handleAddPage: () => void;
    handleClosePage: (pageId: string) => void;
    handleRenamePage: (pageId: string, newName: string) => void;
    handleReorderPage: (draggedPageId: string, targetPageId: string) => void;
    handleExport: (format?: 'png' | 'jpeg', options?: { transparentBackground?: boolean }) => void;
    handleCopyImage: (format?: 'png' | 'jpeg', options?: { transparentBackground?: boolean }) => void;
    handleSvgExport: () => void;
    handleCopySvg: () => void;
    handlePdfExport: () => void;
    handleCinematicExport: (request: CinematicExportRequest) => void;
    handleExportJSON: () => void;
    handleCopyJSON: () => void;
    handleExportMermaid: () => void;
    handleDownloadMermaid: () => void;
    handleDownloadPlantUML: () => void;
    handleExportOpenFlowDSL: () => void;
    handleDownloadOpenFlowDSL: () => void;
    handleExportFigma: () => void;
    handleDownloadFigma: () => void;
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

export function buildFlowEditorControllerShellParams(
    params: BuildFlowEditorControllerShellParams
): Omit<UseFlowEditorShellParams, 'fileInputRef'> {
    return params;
}

export function buildFlowEditorControllerStudioParams(
    params: BuildFlowEditorControllerStudioParams
): UseFlowEditorStudioParams {
    return params;
}

export function buildFlowEditorControllerPanelsParams(
    params: BuildFlowEditorControllerPanelsParams
): UseFlowEditorPanelsParams {
    return params;
}

export function buildFlowEditorControllerChromeParams(
    params: BuildFlowEditorControllerChromeParams
): UseFlowEditorChromeParams {
    return params;
}
