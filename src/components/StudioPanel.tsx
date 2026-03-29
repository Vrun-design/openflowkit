import React, { lazy, Suspense } from 'react';
import { ArrowRight, Code2, Shield, WandSparkles } from 'lucide-react';
import { FLOWPILOT_NAME } from '@/lib/brand';
import type { FlowEdge, FlowNode } from '@/lib/types';
import type { ChatMessage } from '@/services/aiService';
import type { StudioCodeMode, StudioTab } from '@/hooks/useFlowEditorUIState';
import type { AIReadinessState } from '@/hooks/ai-generation/readiness';
import type { ImportDiff } from '@/hooks/useAIGeneration';
import { SidebarBody, SidebarHeader, SidebarSegmentedTabs, SidebarShell } from './SidebarShell';

const LazyStudioAIPanel = lazy(async () => {
    const module = await import('./StudioAIPanel');
    return { default: module.StudioAIPanel };
});

const LazyStudioCodePanel = lazy(async () => {
    const module = await import('./StudioCodePanel');
    return { default: module.StudioCodePanel };
});

const LazyLintRulesPanel = lazy(async () => {
    const module = await import('./architecture-lint/LintRulesPanel');
    return { default: module.LintRulesPanel };
});

const STUDIO_TABS: Array<{
    id: StudioTab;
    icon: typeof WandSparkles;
    label: string;
}> = [
    { id: 'ai', icon: WandSparkles, label: FLOWPILOT_NAME },
    { id: 'code', icon: Code2, label: 'Code' },
    { id: 'lint', icon: Shield, label: 'Lint Rules' },
];

function getEffectiveStudioTab(activeTab: StudioTab): 'ai' | 'code' | 'lint' {
    if (activeTab === 'infra' || activeTab === 'playback') {
        return 'ai';
    }

    return activeTab;
}

interface StudioPanelProps {
    onClose: () => void;
    nodes: FlowNode[];
    edges: FlowEdge[];
    onApply: (nodes: FlowNode[], edges: FlowEdge[]) => void;
    onAIGenerate: (prompt: string, imageBase64?: string) => Promise<boolean>;
    isGenerating: boolean;
    streamingText: string | null;
    retryCount: number;
    cancelGeneration: () => void;
    pendingDiff: ImportDiff | null;
    onConfirmDiff: () => void;
    onDiscardDiff: () => void;
    aiReadiness: AIReadinessState;
    lastAIError: string | null;
    onClearAIError: () => void;
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
    isGenerating,
    streamingText,
    retryCount,
    cancelGeneration,
    pendingDiff,
    onConfirmDiff,
    onDiscardDiff,
    aiReadiness,
    lastAIError,
    onClearAIError,
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
    const effectiveTab = getEffectiveStudioTab(activeTab);

    return (
        <SidebarShell>
            <SidebarHeader title="Studio" onClose={onClose} />

            <div className="border-b border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-4 py-2.5">
                <SidebarSegmentedTabs
                    tabs={STUDIO_TABS.map(({ id, icon: Icon, label }) => ({
                        id,
                        label,
                        icon: <Icon className="h-3.5 w-3.5" />,
                    }))}
                    activeTab={effectiveTab}
                    onTabChange={(tab) => onTabChange(tab as StudioTab)}
                />
            </div>

            {selectedNode && (
                <button
                    onClick={onViewProperties}
                    className="flex w-full items-center justify-between border-b border-[var(--color-brand-border)] bg-[var(--brand-background)] px-4 py-2 text-left transition-colors hover:bg-[var(--brand-primary-50)]"
                >
                    <span className="truncate text-xs font-medium text-[var(--brand-secondary)]">
                        {(selectedNode.data as { label?: string }).label?.trim() || 'Selected node'}
                    </span>
                    <span className="ml-2 flex shrink-0 items-center gap-1 text-[11px] font-medium text-[var(--brand-primary)]">
                        Properties <ArrowRight className="h-3 w-3" />
                    </span>
                </button>
            )}

            <SidebarBody scrollable={false} className="px-4 py-3">
                {effectiveTab === 'ai' ? (
                    <Suspense fallback={null}>
                        <LazyStudioAIPanel
                            onAIGenerate={onAIGenerate}
                            isGenerating={isGenerating}
                            streamingText={streamingText}
                            retryCount={retryCount}
                            onCancelGeneration={cancelGeneration}
                            pendingDiff={pendingDiff}
                            onConfirmDiff={onConfirmDiff}
                            onDiscardDiff={onDiscardDiff}
                            aiReadiness={aiReadiness}
                            lastError={lastAIError}
                            onClearError={onClearAIError}
                            chatMessages={chatMessages}
                            onClearChat={onClearChat}
                            nodeCount={nodes.length}
                            selectedNodeCount={selectedNodeCount}
                            initialPrompt={initialPrompt}
                            onInitialPromptConsumed={onInitialPromptConsumed}
                        />
                    </Suspense>
                ) : effectiveTab === 'code' ? (
                    <Suspense fallback={null}>
                        <LazyStudioCodePanel
                            nodes={nodes}
                            edges={edges}
                            onApply={onApply}
                            mode={codeMode}
                            onModeChange={onCodeModeChange}
                        />
                    </Suspense>
                ) : effectiveTab === 'lint' ? (
                    <Suspense fallback={null}>
                        <LazyLintRulesPanel />
                    </Suspense>
                ) : null}
            </SidebarBody>
        </SidebarShell>
    );
}
