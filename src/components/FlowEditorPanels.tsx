import React, { Suspense, lazy } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { RightRail } from './RightRail';
import type { FlowEdge, FlowNode, FlowSnapshot } from '@/lib/types';
import type { ChatMessage } from '@/services/aiService';
import type {
  CommandBarView,
  FlowEditorMode,
  StudioCodeMode,
  StudioTab,
} from '@/hooks/useFlowEditorUIState';
import type { LayoutAlgorithm } from '@/services/elkLayout';
import type { FlowTemplate } from '@/services/templates';
import type { EdgeData, NodeData } from '@/lib/types';
import type { DomainLibraryItem } from '@/services/domainLibrary';
import type { SupportedLanguage } from '@/hooks/ai-generation/codeToArchitecture';
import type { TerraformInputFormat } from '@/hooks/ai-generation/terraformToCloud';
import type { AIReadinessState } from '@/hooks/ai-generation/readiness';

import type { PropertiesPanel as PropertiesPanelComponent } from './PropertiesPanel';

function CommandBarSkeleton(): React.ReactElement {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 animate-pulse">
      <div className="h-9 w-full max-w-sm rounded-lg bg-[var(--brand-background)]" />
      <div className="h-4 w-3/4 max-w-xs rounded bg-[var(--brand-background)]" />
      <div className="mt-2 flex w-full max-w-sm flex-col gap-2">
        <div className="h-10 rounded-lg bg-[var(--brand-surface)]" />
        <div className="h-10 rounded-lg bg-[var(--brand-surface)]" />
        <div className="h-10 rounded-lg bg-[var(--brand-surface)]" />
      </div>
    </div>
  );
}

const LazyCommandBar = lazy(async () => {
  const module = await import('./CommandBar');
  return { default: module.CommandBar };
});

const LazyPropertiesPanel = lazy(async () => {
  const module = await import('./PropertiesPanel');
  return { default: module.PropertiesPanel };
});

const LazySnapshotsPanel = lazy(async () => {
  const module = await import('./SnapshotsPanel');
  return { default: module.SnapshotsPanel };
});

const LazyStudioPanel = lazy(async () => {
  const module = await import('./StudioPanel');
  return { default: module.StudioPanel };
});

export interface CommandBarPanelProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: FlowNode[];
  edges: FlowEdge[];
  onUndo: () => void;
  onRedo: () => void;
  onLayout: (
    direction?: 'TB' | 'LR' | 'RL' | 'BT',
    algorithm?: LayoutAlgorithm,
    spacing?: 'compact' | 'normal' | 'loose'
  ) => Promise<void>;
  onSelectTemplate: (template: FlowTemplate) => void;
  onOpenStudioAI: () => void;
  onOpenStudioOpenFlow: () => void;
  onOpenStudioMermaid: () => void;
  onOpenStudioPlayback: () => void;
  initialView: CommandBarView;
  onAddAnnotation: () => void;
  onAddSection: () => void;
  onAddText: () => void;
  onAddJourney?: () => void;
  onAddMindmap?: () => void;
  onAddArchitecture?: () => void;
  onAddSequence?: () => void;
  onAddClassNode?: () => void;
  onAddEntityNode?: () => void;
  onAddImage: (imageUrl: string) => void;
  onAddBrowserWireframe: () => void;
  onAddMobileWireframe: () => void;
  onAddDomainLibraryItem?: (item: DomainLibraryItem) => void;
  onCodeAnalysis?: (code: string, language: SupportedLanguage) => Promise<void>;
  onSqlAnalysis?: (sql: string) => Promise<void>;
  onTerraformAnalysis?: (input: string, format: TerraformInputFormat) => Promise<void>;
  onOpenApiAnalysis?: (spec: string) => Promise<void>;
  onApplyDsl?: (dsl: string) => void;
  onCodebaseAnalysis?: (summary: string) => Promise<void>;
  showGrid: boolean;
  onToggleGrid: () => void;
  snapToGrid: boolean;
  onToggleSnap: () => void;
}

export interface SnapshotsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots: FlowSnapshot[];
  manualSnapshots: FlowSnapshot[];
  autoSnapshots: FlowSnapshot[];
  onSaveSnapshot: (name: string) => void;
  onRestoreSnapshot: (snapshot: FlowSnapshot) => void;
  onDeleteSnapshot: (id: string) => void;
  onCompareSnapshot?: (snapshot: FlowSnapshot) => void;
}

export interface PropertiesRailProps {
  selectedNode: FlowNode | null;
  selectedNodes: FlowNode[];
  selectedEdge: FlowEdge | null;
  onChangeNode: (id: string, data: Partial<NodeData>) => void;
  onBulkChangeNodes: React.ComponentProps<typeof PropertiesPanelComponent>['onBulkChangeNodes'];
  onChangeNodeType: (id: string, type: string) => void;
  onChangeEdge: (id: string, data: Partial<EdgeData>) => void;
  onDeleteNode: (id: string) => void;
  onDuplicateNode: (id: string) => void;
  onDeleteEdge: (id: string) => void;
  onUpdateZIndex: (id: string, action: 'front' | 'back') => void;
  onFitSectionToContents: (id: string) => void;
  onReleaseFromSection: (id: string) => void;
  onBringContentsIntoSection: (id: string) => void;
  onAddMindmapChild: React.ComponentProps<typeof PropertiesPanelComponent>['onAddMindmapChild'];
  onAddMindmapSibling: React.ComponentProps<typeof PropertiesPanelComponent>['onAddMindmapSibling'];
  onAddArchitectureService: React.ComponentProps<
    typeof PropertiesPanelComponent
  >['onAddArchitectureService'];
  onCreateArchitectureBoundary: React.ComponentProps<
    typeof PropertiesPanelComponent
  >['onCreateArchitectureBoundary'];
  onApplyArchitectureTemplate: React.ComponentProps<
    typeof PropertiesPanelComponent
  >['onApplyArchitectureTemplate'];
  onGenerateEntityFields: React.ComponentProps<
    typeof PropertiesPanelComponent
  >['onGenerateEntityFields'];
  onSuggestArchitectureNode: React.ComponentProps<
    typeof PropertiesPanelComponent
  >['onSuggestArchitectureNode'];
  onConvertEntitySelectionToClassDiagram: React.ComponentProps<
    typeof PropertiesPanelComponent
  >['onConvertEntitySelectionToClassDiagram'];
  onOpenMermaidCodeEditor: React.ComponentProps<
    typeof PropertiesPanelComponent
  >['onOpenMermaidCodeEditor'];
  onClose: () => void;
}

export interface StudioRailProps {
  onClose: () => void;
  onApply: (nodes: FlowNode[], edges: FlowEdge[]) => void;
  onAIGenerate: (prompt: string, imageBase64?: string) => Promise<boolean>;
  isGenerating: boolean;
  streamingText: string | null;
  retryCount: number;
  cancelGeneration: () => void;
  pendingDiff: import('@/hooks/useAIGeneration').ImportDiff | null;
  onConfirmDiff: () => void;
  onDiscardDiff: () => void;
  aiReadiness: AIReadinessState;
  lastAIError: string | null;
  onClearAIError: () => void;
  selectedNode: FlowNode | null;
  selectedNodeCount: number;
  onViewProperties: () => void;
  chatMessages: ChatMessage[];
  onClearChat: () => void;
  activeTab: StudioTab;
  onTabChange: (tab: StudioTab) => void;
  codeMode: StudioCodeMode;
  onCodeModeChange: (mode: StudioCodeMode) => void;
  playback: {
    currentStepIndex: number;
    totalSteps: number;
    isPlaying: boolean;
    onStartPlayback: () => void;
    onPlayPause: () => void;
    onStop: () => void;
    onScrubToStep: (index: number) => void;
    onNext: () => void;
    onPrev: () => void;
    playbackSpeed: number;
    onPlaybackSpeedChange: (durationMs: number) => void;
  };
  initialPrompt?: string;
  onInitialPromptConsumed?: () => void;
}

export interface FlowEditorPanelsProps {
  commandBar: CommandBarPanelProps;
  snapshots: SnapshotsPanelProps;
  properties: PropertiesRailProps;
  studio: StudioRailProps;
  isHistoryOpen: boolean;
  editorMode: FlowEditorMode;
}

export function FlowEditorPanels({
  commandBar,
  snapshots,
  properties,
  studio,
  isHistoryOpen,
  editorMode,
}: FlowEditorPanelsProps): React.ReactElement {
  const showPropertiesRail =
    editorMode === 'canvas' &&
    Boolean(
      properties.selectedNode || properties.selectedEdge || properties.selectedNodes.length > 1
    );
  const showStudioRail = editorMode === 'studio';
  const railContent = showStudioRail ? (
    <Suspense fallback={null}>
      <LazyStudioPanel
        onClose={studio.onClose}
        nodes={commandBar.nodes}
        edges={commandBar.edges}
        onApply={studio.onApply}
        onAIGenerate={studio.onAIGenerate}
        isGenerating={studio.isGenerating}
        streamingText={studio.streamingText}
        retryCount={studio.retryCount}
        cancelGeneration={studio.cancelGeneration}
        pendingDiff={studio.pendingDiff}
        onConfirmDiff={studio.onConfirmDiff}
        onDiscardDiff={studio.onDiscardDiff}
        aiReadiness={studio.aiReadiness}
        lastAIError={studio.lastAIError}
        onClearAIError={studio.onClearAIError}
        selectedNode={studio.selectedNode}
        selectedNodeCount={studio.selectedNodeCount}
        onViewProperties={studio.onViewProperties}
        chatMessages={studio.chatMessages}
        onClearChat={studio.onClearChat}
        activeTab={studio.activeTab}
        onTabChange={studio.onTabChange}
        codeMode={studio.codeMode}
        onCodeModeChange={studio.onCodeModeChange}
        playback={studio.playback}
        initialPrompt={studio.initialPrompt}
        onInitialPromptConsumed={studio.onInitialPromptConsumed}
      />
    </Suspense>
  ) : showPropertiesRail ? (
    <Suspense fallback={null}>
      <LazyPropertiesPanel
        selectedNodes={properties.selectedNodes}
        selectedNode={properties.selectedNode}
        selectedEdge={properties.selectedEdge}
        onChangeNode={properties.onChangeNode}
        onBulkChangeNodes={properties.onBulkChangeNodes}
        onChangeNodeType={properties.onChangeNodeType}
        onChangeEdge={properties.onChangeEdge}
        onDeleteNode={properties.onDeleteNode}
        onDuplicateNode={properties.onDuplicateNode}
        onDeleteEdge={properties.onDeleteEdge}
        onUpdateZIndex={properties.onUpdateZIndex}
        onFitSectionToContents={properties.onFitSectionToContents}
        onReleaseFromSection={properties.onReleaseFromSection}
        onBringContentsIntoSection={properties.onBringContentsIntoSection}
        onAddMindmapChild={properties.onAddMindmapChild}
        onAddMindmapSibling={properties.onAddMindmapSibling}
        onAddArchitectureService={properties.onAddArchitectureService}
        onCreateArchitectureBoundary={properties.onCreateArchitectureBoundary}
        onApplyArchitectureTemplate={properties.onApplyArchitectureTemplate}
        onGenerateEntityFields={properties.onGenerateEntityFields}
        onSuggestArchitectureNode={properties.onSuggestArchitectureNode}
        onConvertEntitySelectionToClassDiagram={properties.onConvertEntitySelectionToClassDiagram}
        onOpenMermaidCodeEditor={properties.onOpenMermaidCodeEditor}
        onClose={properties.onClose}
      />
    </Suspense>
  ) : null;

  return (
    <>
      <ErrorBoundary className="h-auto">
        {commandBar.isOpen ? (
          <Suspense fallback={<CommandBarSkeleton />}>
            <LazyCommandBar
              isOpen={commandBar.isOpen}
              onClose={commandBar.onClose}
              nodes={commandBar.nodes}
              edges={commandBar.edges}
              onUndo={commandBar.onUndo}
              onRedo={commandBar.onRedo}
              onLayout={commandBar.onLayout}
              onSelectTemplate={commandBar.onSelectTemplate}
              onOpenStudioAI={commandBar.onOpenStudioAI}
              onOpenStudioOpenFlow={commandBar.onOpenStudioOpenFlow}
              onOpenStudioMermaid={commandBar.onOpenStudioMermaid}
              onOpenStudioPlayback={commandBar.onOpenStudioPlayback}
              initialView={commandBar.initialView}
              onAddAnnotation={commandBar.onAddAnnotation}
              onAddSection={commandBar.onAddSection}
              onAddText={commandBar.onAddText}
              onAddJourney={commandBar.onAddJourney}
              onAddMindmap={commandBar.onAddMindmap}
              onAddArchitecture={commandBar.onAddArchitecture}
              onAddSequence={commandBar.onAddSequence}
              onAddClassNode={commandBar.onAddClassNode}
              onAddEntityNode={commandBar.onAddEntityNode}
              onAddImage={commandBar.onAddImage}
              onAddBrowserWireframe={commandBar.onAddBrowserWireframe}
              onAddMobileWireframe={commandBar.onAddMobileWireframe}
              onAddDomainLibraryItem={commandBar.onAddDomainLibraryItem}
              onCodeAnalysis={commandBar.onCodeAnalysis}
              onSqlAnalysis={commandBar.onSqlAnalysis}
              onTerraformAnalysis={commandBar.onTerraformAnalysis}
              onOpenApiAnalysis={commandBar.onOpenApiAnalysis}
              onApplyDsl={commandBar.onApplyDsl}
              onCodebaseAnalysis={commandBar.onCodebaseAnalysis}
              settings={{
                showGrid: commandBar.showGrid,
                onToggleGrid: commandBar.onToggleGrid,
                snapToGrid: commandBar.snapToGrid,
                onToggleSnap: commandBar.onToggleSnap,
              }}
            />
          </Suspense>
        ) : null}
      </ErrorBoundary>

      {isHistoryOpen ? (
        <Suspense fallback={null}>
          <LazySnapshotsPanel
            isOpen={isHistoryOpen}
            onClose={snapshots.onClose}
            snapshots={snapshots.snapshots}
            manualSnapshots={snapshots.manualSnapshots}
            autoSnapshots={snapshots.autoSnapshots}
            onSaveSnapshot={snapshots.onSaveSnapshot}
            onRestoreSnapshot={snapshots.onRestoreSnapshot}
            onDeleteSnapshot={snapshots.onDeleteSnapshot}
            onCompareSnapshot={snapshots.onCompareSnapshot}
          />
        </Suspense>
      ) : null}

      <ErrorBoundary className="h-full">
        {railContent ? <RightRail>{railContent}</RightRail> : null}
      </ErrorBoundary>
    </>
  );
}
