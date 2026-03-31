import type { TFunction } from 'i18next';
import type { FlowNode } from '@/lib/types';
import type { CinematicExportRequest } from '@/services/export/cinematicExport';
import type { FlowEditorChromeProps } from './FlowEditorChrome';

export interface BuildTopNavParams {
  handleSwitchPage: (pageId: string) => void;
  handleAddPage: () => void;
  handleClosePage: (pageId: string) => void;
  handleRenamePage: (pageId: string, newName: string) => void;
  handleReorderPage: (draggedPageId: string, targetPageId: string) => void;
  handleExport: (format?: 'png' | 'jpeg') => void;
  handleCopyImage: (format?: 'png' | 'jpeg') => void;
  handleSvgExport: () => void;
  handleCopySvg: () => void;
  handlePdfExport: () => void;
  handleCinematicExport: (request: CinematicExportRequest) => void;
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

export interface BuildToolbarParams {
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

export interface BuildPlaybackParams {
  currentStepIndex: number;
  totalSteps: number;
  isPlaying: boolean;
  togglePlay: () => void;
  nextStep: () => void;
  prevStep: () => void;
  stopPlayback: () => void;
}

export interface BuildEmptyStateParams {
  nodes: FlowNode[];
  t: TFunction;
  openStudioPanel: (tab: 'ai' | 'code' | 'playback') => void;
  openCommandBar: (
    view: 'root' | 'search' | 'assets' | 'templates' | 'layout' | 'design-system'
  ) => void;
  handleAddNode: (position?: { x: number; y: number }) => void;
  setPendingAIPrompt: (prompt: string) => void;
}

export interface UseFlowEditorChromePropsParams
  extends BuildTopNavParams, BuildToolbarParams, BuildPlaybackParams, BuildEmptyStateParams {}
