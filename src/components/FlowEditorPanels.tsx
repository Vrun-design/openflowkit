import React, { Suspense, lazy } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { RightRail } from './RightRail';
import type { FlowEdge, FlowNode, FlowSnapshot } from '@/lib/types';
import type { ChatMessage } from '@/services/aiService';
import type { AssistantThreadItem } from '@/services/flowpilot/types';
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
import type { CodebaseAnalysis } from '@/hooks/ai-generation/codebaseAnalyzer';
import type { TerraformInputFormat } from '@/hooks/ai-generation/terraformToCloud';
import type { AIReadinessState } from '@/hooks/ai-generation/readiness';

import type { PropertiesPanel as PropertiesPanelComponent } from './PropertiesPanel';

interface PanelErrorFallbackProps {
  title: string;
  description: string;
  onClose?: () => void;
}

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

function RailPanelSkeleton(props: {
  title: string;
  lines?: number;
}): React.ReactElement {
  const { title, lines = 5 } = props;

  return (
    <div className="flex h-full w-full flex-col gap-4 p-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-4 w-24 rounded bg-[var(--brand-background)]" />
        <div className="h-3 w-40 rounded bg-[var(--brand-background)]" />
      </div>
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] p-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--brand-secondary)]">
          {title}
        </div>
        <div className="space-y-3">
          {Array.from({ length: lines }, (_, index) => (
            <div key={`${title}-${index}`} className="h-10 rounded-md bg-[var(--brand-background)]" />
          ))}
        </div>
      </div>
    </div>
  );
}

function PanelErrorFallback({
  title,
  description,
  onClose,
}: PanelErrorFallbackProps): React.ReactElement {
  return (
    <div className="flex h-full w-full flex-col items-start justify-center gap-4 rounded-[var(--radius-xl)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] p-5 shadow-[var(--shadow-sm)]">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[var(--brand-text)]">
          {title}
        </p>
        <p className="text-sm text-[var(--brand-secondary)]">
          {description}
        </p>
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-[var(--color-brand-border)] px-3 py-2 text-sm font-medium text-[var(--brand-text)] transition-colors hover:bg-[var(--brand-background)]"
        >
          Close panel
        </button>
      ) : null}
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

const LazyArchitectureRulesPanel = lazy(async () => {
  const module = await import('./ArchitectureRulesPanel');
  return { default: module.ArchitectureRulesPanel };
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
  onOpenArchitectureRules: () => void;
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
  onCodebaseAnalysis?: (analysis: CodebaseAnalysis) => Promise<void>;
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
  historyPastCount: number;
  historyFutureCount: number;
  onScrubHistoryTo: (index: number) => void;
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
  assistantThread: AssistantThreadItem[];
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
  architectureRules: {
    isOpen: boolean;
    onClose: () => void;
  };
  isHistoryOpen: boolean;
  editorMode: FlowEditorMode;
}

export function FlowEditorPanels({
  commandBar,
  snapshots,
  properties,
  studio,
  architectureRules,
  isHistoryOpen,
  editorMode,
}: FlowEditorPanelsProps): React.ReactElement {
  const showPropertiesRail =
    editorMode === 'canvas' &&
    Boolean(
      properties.selectedNode || properties.selectedEdge || properties.selectedNodes.length > 1
    );

  return (
    <>
      <ErrorBoundary
        className="h-auto"
        fallback={
          <PanelErrorFallback
            title="Command panel unavailable"
            description="The command panel hit an unexpected error. Close it and reopen when you are ready."
            onClose={commandBar.onClose}
          />
        }
      >
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
              onOpenArchitectureRules={commandBar.onOpenArchitectureRules}
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
        <ErrorBoundary
          className="h-full"
          fallback={
            <PanelErrorFallback
              title="Snapshots unavailable"
              description="History is still intact, but the snapshots panel failed to render. Close it and reopen after the current task."
              onClose={snapshots.onClose}
            />
          }
        >
          <Suspense fallback={<RailPanelSkeleton title="Snapshots" lines={4} />}>
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
              historyPastCount={snapshots.historyPastCount}
              historyFutureCount={snapshots.historyFutureCount}
              onScrubHistoryTo={snapshots.onScrubHistoryTo}
            />
          </Suspense>
        </ErrorBoundary>
      ) : null}

      {editorMode === 'studio' ? (
        <ErrorBoundary
          className="h-full"
          fallback={
            <RightRail>
              <PanelErrorFallback
                title="Studio unavailable"
                description="The studio panel hit an unexpected error. Close it and reopen when you need it again."
                onClose={studio.onClose}
              />
            </RightRail>
          }
        >
          <RightRail>
            <Suspense fallback={<RailPanelSkeleton title="Studio" lines={6} />}>
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
                assistantThread={studio.assistantThread}
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
          </RightRail>
        </ErrorBoundary>
      ) : null}

      {architectureRules.isOpen ? (
        <ErrorBoundary
          className="h-full"
          fallback={
            <RightRail>
              <PanelErrorFallback
                title="Architecture rules unavailable"
                description="The architecture rules panel failed to render. Close it and reopen when you need it again."
                onClose={architectureRules.onClose}
              />
            </RightRail>
          }
        >
          <RightRail>
            <Suspense fallback={<RailPanelSkeleton title="Architecture Rules" lines={6} />}>
              <LazyArchitectureRulesPanel onClose={architectureRules.onClose} />
            </Suspense>
          </RightRail>
        </ErrorBoundary>
      ) : null}

      {showPropertiesRail ? (
        <ErrorBoundary
          className="h-full"
          fallback={
            <RightRail>
              <PanelErrorFallback
                title="Properties unavailable"
                description="The properties rail failed to render. Close it and reopen after the current edit."
                onClose={properties.onClose}
              />
            </RightRail>
          }
        >
          <RightRail>
            <Suspense fallback={<RailPanelSkeleton title="Properties" lines={5} />}>
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
          </RightRail>
        </ErrorBoundary>
      ) : null}
    </>
  );
}
