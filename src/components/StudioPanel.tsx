import React, { lazy, Suspense } from 'react';
import { ArrowRight, Code2, Server, Shield, WandSparkles } from 'lucide-react';
import type { FlowEdge, FlowNode } from '@/lib/types';
import type { ChatMessage } from '@/services/aiService';
import type { StudioCodeMode, StudioTab } from '@/hooks/useFlowEditorUIState';
import type { SupportedLanguage } from '@/hooks/ai-generation/codeToArchitecture';
import type { TerraformInputFormat } from '@/hooks/ai-generation/terraformToCloud';
import { SidebarBody, SidebarHeader, SidebarSegmentedTabs, SidebarShell } from './SidebarShell';

const LazyStudioAIPanel = lazy(async () => {
    const module = await import('./StudioAIPanel');
    return { default: module.StudioAIPanel };
});

const LazyStudioCodePanel = lazy(async () => {
    const module = await import('./StudioCodePanel');
    return { default: module.StudioCodePanel };
});

const LazyInfraSyncPanel = lazy(async () => {
    const module = await import('./infra-sync/InfraSyncPanel');
    return { default: module.InfraSyncPanel };
});

const LazyLintRulesPanel = lazy(async () => {
    const module = await import('./architecture-lint/LintRulesPanel');
    return { default: module.LintRulesPanel };
});

interface StudioPanelProps {
    onClose: () => void;
    nodes: FlowNode[];
    edges: FlowEdge[];
    onApply: (nodes: FlowNode[], edges: FlowEdge[]) => void;
    onAIGenerate: (prompt: string, imageBase64?: string) => Promise<void>;
    onCodeAnalysis?: (code: string, language: SupportedLanguage) => Promise<void>;
    onSqlAnalysis?: (sql: string) => Promise<void>;
    onTerraformAnalysis?: (input: string, format: TerraformInputFormat) => Promise<void>;
    onOpenApiAnalysis?: (spec: string) => Promise<void>;
    onApplyInfraDsl?: (dsl: string) => void;
    isGenerating: boolean;
    chatMessages: ChatMessage[];
    onClearChat: () => void;
    activeTab: StudioTab;
    onTabChange: (tab: StudioTab) => void;
    codeMode: StudioCodeMode;
    onCodeModeChange: (mode: StudioCodeMode) => void;
    selectedNode: FlowNode | null;
    selectedNodeCount: number;
    onViewProperties: () => void;
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

export function StudioPanel({
    onClose,
    nodes,
    edges,
    onApply,
    onAIGenerate,
    onCodeAnalysis,
    onSqlAnalysis,
    onTerraformAnalysis,
    onOpenApiAnalysis,
    onApplyInfraDsl,
    isGenerating,
    chatMessages,
    onClearChat,
    activeTab,
    onTabChange,
    codeMode,
    onCodeModeChange,
    selectedNode,
    selectedNodeCount,
    onViewProperties,
    playback: _playback,
    initialPrompt,
    onInitialPromptConsumed,
}: StudioPanelProps): React.ReactElement {
    const showInfraTab = Boolean(onApplyInfraDsl);

    const studioTabs = [
        { id: 'ai', label: 'AI Studio', icon: WandSparkles },
        { id: 'code', label: 'Code', icon: Code2 },
        ...(showInfraTab ? [{ id: 'infra', label: 'Infra', icon: Server }] : []),
        { id: 'lint', label: 'Lint', icon: Shield },
    ] as const;

    return (
        <SidebarShell>
            <SidebarHeader
                title="Studio"
                onClose={onClose}
            />

            <div className="border-b border-slate-100 bg-[var(--brand-surface)] px-4 py-2.5">
                <SidebarSegmentedTabs
                    tabs={studioTabs.map(({ id, label, icon: Icon }) => ({
                        id,
                        label,
                        icon: <Icon className="h-3.5 w-3.5" />,
                    }))}
                    activeTab={activeTab}
                    onTabChange={(tab) => onTabChange(tab as StudioTab)}
                />
            </div>

            {selectedNode && (
                <button
                    onClick={onViewProperties}
                    className="flex w-full items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2 text-left transition-colors hover:bg-[var(--brand-primary-50)]"
                >
                    <span className="truncate text-xs font-medium text-slate-600">
                        {(selectedNode.data as { label?: string }).label?.trim() || 'Selected node'}
                    </span>
                    <span className="ml-2 flex shrink-0 items-center gap-1 text-[11px] font-medium text-[var(--brand-primary)]">
                        Properties <ArrowRight className="h-3 w-3" />
                    </span>
                </button>
            )}

            <SidebarBody>
                {activeTab === 'ai' ? (
                    <Suspense fallback={null}>
                        <LazyStudioAIPanel
                            onAIGenerate={onAIGenerate}
                            onCodeAnalysis={onCodeAnalysis}
                            onSqlAnalysis={onSqlAnalysis}
                            onTerraformAnalysis={onTerraformAnalysis}
                            onOpenApiAnalysis={onOpenApiAnalysis}
                            isGenerating={isGenerating}
                            chatMessages={chatMessages}
                            onClearChat={onClearChat}
                            nodeCount={nodes.length}
                            selectedNodeCount={selectedNodeCount}
                            initialPrompt={initialPrompt}
                            onInitialPromptConsumed={onInitialPromptConsumed}
                        />
                    </Suspense>
                ) : activeTab === 'code' ? (
                    <Suspense fallback={null}>
                        <LazyStudioCodePanel
                            nodes={nodes}
                            edges={edges}
                            onApply={onApply}
                            mode={codeMode}
                            onModeChange={onCodeModeChange}
                        />
                    </Suspense>
                ) : activeTab === 'infra' && showInfraTab && onApplyInfraDsl ? (
                    <Suspense fallback={null}>
                        <LazyInfraSyncPanel
                            onApplyDsl={onApplyInfraDsl}
                            onTerraformAnalysis={onTerraformAnalysis}
                        />
                    </Suspense>
                ) : activeTab === 'lint' ? (
                    <Suspense fallback={null}>
                        <LazyLintRulesPanel />
                    </Suspense>
                ) : null}
            </SidebarBody>
        </SidebarShell>
    );
}
