import React, { Suspense, lazy } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { RightRail } from './RightRail';
import type { FlowEdge, FlowNode, FlowSnapshot } from '@/lib/types';
import type { ChatMessage } from '@/services/aiService';
import type { CommandBarView, FlowEditorMode, StudioCodeMode, StudioTab } from '@/hooks/useFlowEditorUIState';
import type { LayoutAlgorithm } from '@/services/elkLayout';
import type { FlowTemplate } from '@/services/templates';
import type { EdgeData, NodeData } from '@/lib/types';
import type { DomainLibraryItem } from '@/services/domainLibrary';
import type { PropertiesPanel as PropertiesPanelComponent } from './PropertiesPanel';

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
    onOpenStudioFlowMind: () => void;
    onOpenStudioMermaid: () => void;
    initialView: CommandBarView;
    onAddAnnotation: () => void;
    onAddSection: () => void;
    onAddText: () => void;
    onAddJourney?: () => void;
    onAddMindmap?: () => void;
    onAddArchitecture?: () => void;
    onAddImage: (imageUrl: string) => void;
    onAddBrowserWireframe: () => void;
    onAddMobileWireframe: () => void;
    onAddDomainLibraryItem?: (item: DomainLibraryItem) => void;
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
    onAddMindmapChild: React.ComponentProps<typeof PropertiesPanelComponent>['onAddMindmapChild'];
    onAddMindmapSibling: React.ComponentProps<typeof PropertiesPanelComponent>['onAddMindmapSibling'];
    onAddArchitectureService: React.ComponentProps<typeof PropertiesPanelComponent>['onAddArchitectureService'];
    onCreateArchitectureBoundary: React.ComponentProps<typeof PropertiesPanelComponent>['onCreateArchitectureBoundary'];
    onClose: () => void;
}

export interface StudioRailProps {
    onClose: () => void;
    onApply: (nodes: FlowNode[], edges: FlowEdge[]) => void;
    onAIGenerate: (prompt: string, imageBase64?: string) => Promise<void>;
    isGenerating: boolean;
    chatMessages: ChatMessage[];
    onClearChat: () => void;
    activeTab: StudioTab;
    onTabChange: (tab: StudioTab) => void;
    codeMode: StudioCodeMode;
    onCodeModeChange: (mode: StudioCodeMode) => void;
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
    const showPropertiesRail = editorMode === 'canvas' && Boolean(properties.selectedNode || properties.selectedEdge);
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
                chatMessages={studio.chatMessages}
                onClearChat={studio.onClearChat}
                activeTab={studio.activeTab}
                onTabChange={studio.onTabChange}
                codeMode={studio.codeMode}
                onCodeModeChange={studio.onCodeModeChange}
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
                onAddMindmapChild={properties.onAddMindmapChild}
                onAddMindmapSibling={properties.onAddMindmapSibling}
                onAddArchitectureService={properties.onAddArchitectureService}
                onCreateArchitectureBoundary={properties.onCreateArchitectureBoundary}
                onClose={properties.onClose}
            />
        </Suspense>
    ) : null;

    return (
        <>
            <ErrorBoundary className="h-auto">
                {commandBar.isOpen ? (
                    <Suspense fallback={null}>
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
                            onOpenStudioFlowMind={commandBar.onOpenStudioFlowMind}
                            onOpenStudioMermaid={commandBar.onOpenStudioMermaid}
                            initialView={commandBar.initialView}
                            onAddAnnotation={commandBar.onAddAnnotation}
                            onAddSection={commandBar.onAddSection}
                            onAddText={commandBar.onAddText}
                            onAddJourney={commandBar.onAddJourney}
                            onAddMindmap={commandBar.onAddMindmap}
                            onAddArchitecture={commandBar.onAddArchitecture}
                            onAddImage={commandBar.onAddImage}
                            onAddBrowserWireframe={commandBar.onAddBrowserWireframe}
                            onAddMobileWireframe={commandBar.onAddMobileWireframe}
                            onAddDomainLibraryItem={commandBar.onAddDomainLibraryItem}
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
                    />
                </Suspense>
            ) : null}

            <ErrorBoundary className="h-full">
                {railContent ? <RightRail>{railContent}</RightRail> : null}
            </ErrorBoundary>
        </>
    );
}
