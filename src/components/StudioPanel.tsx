import React, { lazy, Suspense } from 'react';
import { Code2, WandSparkles } from 'lucide-react';
import type { FlowEdge, FlowNode } from '@/lib/types';
import type { ChatMessage } from '@/services/aiService';
import type { StudioCodeMode, StudioTab } from '@/hooks/useFlowEditorUIState';
import { SidebarBody, SidebarHeader, SidebarSegmentedTabs, SidebarShell } from './SidebarShell';

const LazyStudioAIPanel = lazy(async () => {
    const module = await import('./StudioAIPanel');
    return { default: module.StudioAIPanel };
});

const LazyStudioCodePanel = lazy(async () => {
    const module = await import('./StudioCodePanel');
    return { default: module.StudioCodePanel };
});

const STUDIO_TABS = [
    { id: 'ai', label: 'FlowPilot', icon: WandSparkles },
    { id: 'code', label: 'Code', icon: Code2 },
] as const;

interface StudioPanelProps {
    onClose: () => void;
    nodes: FlowNode[];
    edges: FlowEdge[];
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

export function StudioPanel({
    onClose,
    nodes,
    edges,
    onApply,
    onAIGenerate,
    isGenerating,
    chatMessages,
    onClearChat,
    activeTab,
    onTabChange,
    codeMode,
    onCodeModeChange,
}: StudioPanelProps): React.ReactElement {
    return (
        <SidebarShell>
            <SidebarHeader
                title="Studio"
                onClose={onClose}
            />

            <div className="border-b border-slate-100 bg-[var(--brand-surface)] px-4 py-2.5">
                <SidebarSegmentedTabs
                    tabs={STUDIO_TABS.map(({ id, label, icon: Icon }) => ({
                        id,
                        label,
                        icon: <Icon className="h-3.5 w-3.5" />,
                    }))}
                    activeTab={activeTab}
                    onTabChange={(tab) => onTabChange(tab as StudioTab)}
                />
            </div>

            <SidebarBody>
                {activeTab === 'ai' ? (
                    <Suspense fallback={null}>
                        <LazyStudioAIPanel
                            onAIGenerate={onAIGenerate}
                            isGenerating={isGenerating}
                            chatMessages={chatMessages}
                            onClearChat={onClearChat}
                        />
                    </Suspense>
                ) : (
                    <Suspense fallback={null}>
                        <LazyStudioCodePanel
                            nodes={nodes}
                            edges={edges}
                            onApply={onApply}
                            mode={codeMode}
                            onModeChange={onCodeModeChange}
                        />
                    </Suspense>
                )}
            </SidebarBody>
        </SidebarShell>
    );
}
