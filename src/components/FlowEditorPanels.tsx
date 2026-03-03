import React from 'react';
import { CommandBar } from './CommandBar';
import { ErrorBoundary } from './ErrorBoundary';
import { PropertiesPanel } from './PropertiesPanel';
import { SnapshotsPanel } from './SnapshotsPanel';
import type { FlowSnapshot } from '@/lib/types';
import type { CommandBarView } from '@/hooks/useFlowEditorUIState';
import type { LayoutAlgorithm } from '@/services/elkLayout';
import type { FlowTemplate } from '@/services/templates';

interface FlowEditorPanelsProps {
    isCommandBarOpen: boolean;
    onCloseCommandBar: () => void;
    nodes: React.ComponentProps<typeof CommandBar>['nodes'];
    edges: React.ComponentProps<typeof CommandBar>['edges'];
    onCommandBarApply: React.ComponentProps<typeof CommandBar>['onApply'];
    onAIGenerate: React.ComponentProps<typeof CommandBar>['onAIGenerate'];
    isGenerating: boolean;
    chatMessages: NonNullable<React.ComponentProps<typeof CommandBar>['chatMessages']>;
    onClearChat: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onFitView: () => void;
    onLayout: (
        direction?: 'TB' | 'LR' | 'RL' | 'BT',
        algorithm?: LayoutAlgorithm,
        spacing?: 'compact' | 'normal' | 'loose'
    ) => Promise<void>;
    onSelectTemplate: (template: FlowTemplate) => void;
    commandBarView: CommandBarView;
    showGrid: boolean;
    onToggleGrid: () => void;
    snapToGrid: boolean;
    onToggleSnap: () => void;
    showMiniMap: boolean;
    onToggleMiniMap: () => void;
    isHistoryOpen: boolean;
    onCloseHistory: () => void;
    snapshots: FlowSnapshot[];
    onSaveSnapshot: (name: string) => void;
    onRestoreSnapshot: (snapshot: FlowSnapshot) => void;
    onDeleteSnapshot: (id: string) => void;
    selectedNode: React.ComponentProps<typeof PropertiesPanel>['selectedNode'];
    selectedEdge: React.ComponentProps<typeof PropertiesPanel>['selectedEdge'];
    onChangeNode: React.ComponentProps<typeof PropertiesPanel>['onChangeNode'];
    onChangeNodeType: React.ComponentProps<typeof PropertiesPanel>['onChangeNodeType'];
    onChangeEdge: React.ComponentProps<typeof PropertiesPanel>['onChangeEdge'];
    onDeleteNode: React.ComponentProps<typeof PropertiesPanel>['onDeleteNode'];
    onDuplicateNode: React.ComponentProps<typeof PropertiesPanel>['onDuplicateNode'];
    onDeleteEdge: React.ComponentProps<typeof PropertiesPanel>['onDeleteEdge'];
    onUpdateZIndex: React.ComponentProps<typeof PropertiesPanel>['onUpdateZIndex'];
    onCloseProperties: () => void;
}

export function FlowEditorPanels({
    isCommandBarOpen,
    onCloseCommandBar,
    nodes,
    edges,
    onCommandBarApply,
    onAIGenerate,
    isGenerating,
    chatMessages,
    onClearChat,
    onUndo,
    onRedo,
    onFitView,
    onLayout,
    onSelectTemplate,
    commandBarView,
    showGrid,
    onToggleGrid,
    snapToGrid,
    onToggleSnap,
    showMiniMap,
    onToggleMiniMap,
    isHistoryOpen,
    onCloseHistory,
    snapshots,
    onSaveSnapshot,
    onRestoreSnapshot,
    onDeleteSnapshot,
    selectedNode,
    selectedEdge,
    onChangeNode,
    onChangeNodeType,
    onChangeEdge,
    onDeleteNode,
    onDuplicateNode,
    onDeleteEdge,
    onUpdateZIndex,
    onCloseProperties,
}: FlowEditorPanelsProps): React.ReactElement {
    return (
        <>
            <ErrorBoundary className="h-auto">
                <CommandBar
                    isOpen={isCommandBarOpen}
                    onClose={onCloseCommandBar}
                    nodes={nodes}
                    edges={edges}
                    onApply={onCommandBarApply}
                    onAIGenerate={onAIGenerate}
                    isGenerating={isGenerating}
                    chatMessages={chatMessages}
                    onClearChat={onClearChat}
                    onUndo={onUndo}
                    onRedo={onRedo}
                    onFitView={onFitView}
                    onLayout={onLayout}
                    onSelectTemplate={onSelectTemplate}
                    initialView={commandBarView}
                    settings={{
                        showGrid,
                        onToggleGrid,
                        snapToGrid,
                        onToggleSnap,
                        showMiniMap,
                        onToggleMiniMap,
                    }}
                />
            </ErrorBoundary>

            <SnapshotsPanel
                isOpen={isHistoryOpen}
                onClose={onCloseHistory}
                snapshots={snapshots}
                onSaveSnapshot={onSaveSnapshot}
                onRestoreSnapshot={onRestoreSnapshot}
                onDeleteSnapshot={onDeleteSnapshot}
            />

            <ErrorBoundary className="h-full">
                <PropertiesPanel
                    selectedNode={selectedNode}
                    selectedEdge={selectedEdge}
                    onChangeNode={onChangeNode}
                    onChangeNodeType={onChangeNodeType}
                    onChangeEdge={onChangeEdge}
                    onDeleteNode={onDeleteNode}
                    onDuplicateNode={onDuplicateNode}
                    onDeleteEdge={onDeleteEdge}
                    onUpdateZIndex={onUpdateZIndex}
                    onClose={onCloseProperties}
                />
            </ErrorBoundary>
        </>
    );
}
