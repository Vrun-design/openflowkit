import { useEffect, useState, type ReactElement } from 'react';
import {
    ArrowUp, Database, Server, Cloud, Network,
    Loader2, Paperclip, Square, Trash2, WandSparkles, X, Crosshair, Edit3,
    CheckCircle2, Plus, Minus, RefreshCw, ExternalLink, Key,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FLOWPILOT_NAME, IS_BEVELED } from '@/lib/brand';
import type { ChatMessage } from '@/services/aiService';
import type { ImportDiff } from '@/hooks/useAIGeneration';
import type { AIReadinessState } from '@/hooks/ai-generation/readiness';
import type { AIProvider } from '@/store/types';
import { PROVIDERS } from '@/config/aiProviders';
import { useFlowStore } from '@/store';
import { useAIViewState } from './command-bar/useAIViewState';
import { SegmentedChoice } from './properties/SegmentedChoice';

interface AIStudioExample {
    label: string;
    icon: typeof Database;
    prompt: string;
}

const EMPTY_CANVAS_EXAMPLES: AIStudioExample[] = [
    { label: 'Microservices architecture', icon: Server, prompt: 'Generate a microservices architecture with API gateway, auth service, user service, order service, and a shared PostgreSQL database' },
    { label: 'AWS 3-tier webapp', icon: Cloud, prompt: 'Generate a 3-tier AWS architecture with CloudFront, ALB, ECS Fargate, RDS PostgreSQL, and ElastiCache Redis' },
    { label: 'User auth flow', icon: Network, prompt: 'Generate a user authentication flow showing login, registration, password reset, OAuth, and session management' },
    { label: 'CI/CD pipeline', icon: Database, prompt: 'Generate a CI/CD pipeline with GitHub, build, test, staging deploy, approval gate, and production deploy stages' },
];

const ITERATION_EXAMPLES: AIStudioExample[] = [
    { label: 'Add Database', icon: Database, prompt: 'Add a PostgreSQL database to the architecture' },
    { label: 'Add Server', icon: Server, prompt: 'Add a backend Node.js server service' },
    { label: 'Add Cloud Infrastructure', icon: Cloud, prompt: 'Deploy the main application to AWS' },
    { label: 'Add Load Balancer', icon: Network, prompt: 'Add a load balancer in front of the application' },
];

const EXAMPLE_ICON_COLORS = [
    'text-orange-500',
    'text-blue-500',
    'text-amber-500',
    'text-indigo-500',
    'text-teal-500',
    'text-rose-500',
];

function getExampleIconColor(index: number): string {
    return EXAMPLE_ICON_COLORS[index % EXAMPLE_ICON_COLORS.length];
}

interface StudioAIPanelProps {
    onAIGenerate: (prompt: string, imageBase64?: string) => Promise<boolean>;
    isGenerating: boolean;
    streamingText: string | null;
    retryCount: number;
    onCancelGeneration: () => void;
    pendingDiff: ImportDiff | null;
    onConfirmDiff: () => void;
    onDiscardDiff: () => void;
    aiReadiness: AIReadinessState;
    lastError: string | null;
    onClearError: () => void;
    chatMessages: ChatMessage[];
    onClearChat: () => void;
    nodeCount?: number;
    selectedNodeCount?: number;
    initialPrompt?: string;
    onInitialPromptConsumed?: () => void;
}

type AIGenerationMode = 'edit' | 'create';

const GENERATION_MODE_ITEMS = [
    { id: 'edit', label: 'Edit current' },
    { id: 'create', label: 'Create new' },
];

function buildGenerationPrompt(prompt: string, mode: AIGenerationMode, nodeCount: number): string {
    if (nodeCount === 0 || mode === 'edit') {
        return prompt;
    }

    return [
        'Create a brand new diagram from scratch.',
        'Ignore the existing canvas and replace it with a new diagram that matches the request.',
        '',
        prompt,
    ].join('\n');
}

function getPromptPlaceholder(
    generationMode: AIGenerationMode,
    nodeCount: number,
    selectedNodeCount: number,
): string {
    if (generationMode === 'create') {
        return 'Describe the diagram you want to create from scratch...';
    }

    if (selectedNodeCount > 0) {
        return `Describe what to change about the ${selectedNodeCount} selected node${selectedNodeCount > 1 ? 's' : ''}...`;
    }

    if (nodeCount > 0) {
        return "Describe a change, for example 'make auth service red' or 'add Redis between API and DB'";
    }

    return 'Describe a diagram to generate from scratch...';
}

const QUICK_PROVIDERS = PROVIDERS.filter((p) => p.id !== 'custom');

function InlineKeySetup(): ReactElement {
    const { aiSettings, setAISettings } = useFlowStore();
    const [provider, setProvider] = useState<AIProvider>(aiSettings.provider);
    const [apiKey, setApiKey] = useState('');
    const meta = PROVIDERS.find((p) => p.id === provider) ?? PROVIDERS[0];

    const handleSave = () => {
        const trimmed = apiKey.trim();
        if (!trimmed) return;
        setAISettings({ provider, apiKey: trimmed });
    };

    return (
        <div className="mx-auto mt-4 w-full max-w-[300px] rounded-[var(--radius-md)] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
                <Key className="h-4 w-4 text-[var(--brand-primary)]" />
                <span className="text-sm font-semibold text-slate-800">Add your AI key</span>
            </div>
            <div className="mb-3 flex flex-wrap gap-1.5">
                {QUICK_PROVIDERS.map((p) => (
                    <button
                        key={p.id}
                        onClick={() => setProvider(p.id)}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                            provider === p.id
                                ? 'bg-[var(--brand-primary)] text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        {p.name}
                    </button>
                ))}
            </div>
            <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                placeholder={meta.keyPlaceholder}
                className="mb-2 w-full rounded-[var(--radius-sm)] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary-100)]"
            />
            <div className="flex items-center gap-2">
                <button
                    onClick={handleSave}
                    disabled={!apiKey.trim()}
                    className="flex-1 rounded-[var(--radius-sm)] bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--brand-primary-600)] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    Save and try
                </button>
                {meta.keyLink && (
                    <a
                        href={meta.keyLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] font-medium text-[var(--brand-primary)] hover:underline"
                    >
                        Get key <ExternalLink className="h-3 w-3" />
                    </a>
                )}
            </div>
        </div>
    );
}

export function StudioAIPanel({
    onAIGenerate,
    isGenerating,
    streamingText,
    retryCount,
    onCancelGeneration,
    pendingDiff,
    onConfirmDiff,
    onDiscardDiff,
    aiReadiness,
    lastError,
    onClearError,
    chatMessages,
    onClearChat,
    nodeCount = 0,
    selectedNodeCount = 0,
    initialPrompt,
    onInitialPromptConsumed,
}: StudioAIPanelProps): ReactElement {
    const { t } = useTranslation();
    const isBeveled = IS_BEVELED;
    const [generationMode, setGenerationMode] = useState<AIGenerationMode>(nodeCount === 0 ? 'create' : 'edit');

    const {
        prompt,
        setPrompt,
        selectedImage,
        setSelectedImage,
        fileInputRef,
        scrollRef,
        handleGenerate,
        handleKeyDown,
        handleImageSelect,
    } = useAIViewState({
        searchQuery: '',
        isGenerating,
        onAIGenerate,
        onClose: () => undefined,
        chatMessageCount: chatMessages.length,
    });

    useEffect(() => {
        if (initialPrompt) {
            setPrompt(initialPrompt);
            onInitialPromptConsumed?.();
        }
    }, [initialPrompt, onInitialPromptConsumed, setPrompt]);

    const hasHistory = chatMessages.length > 0;
    const effectiveGenerationMode: AIGenerationMode = nodeCount === 0 ? 'create' : generationMode;

    async function submitPrompt(promptText?: string): Promise<void> {
        const resolvedPrompt = promptText ?? prompt;
        const finalPrompt = buildGenerationPrompt(resolvedPrompt, effectiveGenerationMode, nodeCount);
        await handleGenerate(finalPrompt);
    }

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
            {pendingDiff && (
                <div className="mx-1 mb-2 rounded-[var(--radius-md)] border border-emerald-200 bg-emerald-50 p-3">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                        <p className="text-xs font-semibold text-slate-700">Import ready — review changes</p>
                    </div>
                    <div className="flex items-center gap-3 mb-3 text-[11px]">
                        {pendingDiff.addedCount > 0 && (
                            <span className="flex items-center gap-1 text-emerald-700 font-medium">
                                <Plus className="h-3 w-3" />{pendingDiff.addedCount} added
                            </span>
                        )}
                        {pendingDiff.updatedCount > 0 && (
                            <span className="flex items-center gap-1 text-amber-700 font-medium">
                                <RefreshCw className="h-3 w-3" />{pendingDiff.updatedCount} updated
                            </span>
                        )}
                        {pendingDiff.removedCount > 0 && (
                            <span className="flex items-center gap-1 text-red-700 font-medium">
                                <Minus className="h-3 w-3" />{pendingDiff.removedCount} removed
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onDiscardDiff}
                            className="flex h-7 flex-1 items-center justify-center rounded border border-slate-200 bg-white text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                        >
                            Discard
                        </button>
                        <button
                            onClick={onConfirmDiff}
                            className="flex h-7 flex-1 items-center justify-center rounded bg-emerald-600 text-[11px] font-medium text-white hover:bg-emerald-700"
                        >
                            Apply to canvas
                        </button>
                    </div>
                </div>
            )}
            {hasHistory && (
                <div className="flex items-center justify-end px-1 pb-2">
                    <button
                        onClick={onClearChat}
                        className="rounded-full p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 active:scale-95"
                        title={t('commandBar.ai.clearChat')}
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            )}

            <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 py-2 custom-scrollbar">
                {!hasHistory ? (
                    <div className="flex h-full flex-col items-center justify-center py-8 text-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[var(--radius-md)] border border-[var(--brand-primary-100)] bg-[var(--brand-primary-50)] text-[var(--brand-primary)] shadow-sm">
                            <WandSparkles className="h-6 w-6" />
                        </div>
                        <h3 className="text-xl font-semibold tracking-tight text-slate-900">{FLOWPILOT_NAME}</h3>
                        <p className="mt-2 mb-6 max-w-[280px] text-sm leading-6 text-slate-500">
                            {nodeCount === 0
                                ? 'Use AI for first drafts, then refine the result. Be explicit about the systems, actors, and data flow you want.'
                                : `${FLOWPILOT_NAME} works best for targeted edits, additions, and quick first drafts. It is less reliable for rewriting a whole canvas in one shot.`}
                        </p>
                        {aiReadiness.canGenerate && (
                            <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-[320px] mx-auto">
                                {(nodeCount === 0 ? EMPTY_CANVAS_EXAMPLES : ITERATION_EXAMPLES).map((skill, index) => {
                                    const Icon = skill.icon;
                                    return (
                                        <button
                                            key={skill.label}
                                            onClick={() => {
                                                setPrompt(skill.prompt);
                                                void submitPrompt(skill.prompt);
                                            }}
                                            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[13px] font-medium text-slate-700 shadow-sm transition-all hover:border-[var(--brand-primary-200)] hover:text-[var(--brand-primary)] active:scale-95"
                                        >
                                            <Icon className={`h-3.5 w-3.5 ${getExampleIconColor(index)}`} />
                                            {skill.label}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        {!aiReadiness.canGenerate && <InlineKeySetup />}
                    </div>
                ) : (
                    <>
                        {chatMessages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`max-w-[88%] rounded-[var(--radius-md)] px-3.5 py-2.5 text-sm whitespace-pre-wrap ${msg.role === 'user'
                                        ? 'rounded-br-sm bg-[var(--brand-primary)] text-white shadow-sm'
                                        : 'rounded-bl-sm border border-slate-200/70 bg-white text-[var(--brand-text)] shadow-sm'
                                        }`}
                                >
                                    {msg.parts.map((part, index) => (
                                        <div key={index} className="leading-relaxed">{part.text}</div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {isGenerating && (
                            <div className="flex justify-start">
                                <div className="max-w-[88%] rounded-[var(--radius-md)] rounded-bl-sm border border-slate-200/70 bg-white px-3.5 py-2.5 text-sm text-[var(--brand-text)] shadow-sm">
                                    {streamingText
                                        ? <span className="whitespace-pre-wrap leading-relaxed">{streamingText}</span>
                                        : <span className="flex items-center gap-1.5 text-slate-400">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            {retryCount > 0 ? `Retrying (${retryCount} of 3)…` : 'Generating…'}
                                          </span>
                                    }
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
            <div className="shrink-0 border-t border-slate-100 px-3 py-3">
                {nodeCount > 0 ? (
                    <div className="mb-3 space-y-2">
                        <SegmentedChoice
                            items={GENERATION_MODE_ITEMS}
                            selectedId={effectiveGenerationMode}
                            onSelect={(mode) => setGenerationMode(mode as AIGenerationMode)}
                            columns={2}
                            size="sm"
                        />
                    </div>
                ) : null}

                {selectedNodeCount > 0 && effectiveGenerationMode === 'edit' ? (
                    <div className="mb-3 flex items-center gap-1.5 rounded-[var(--radius-xs)] bg-[var(--brand-primary-50)] px-2.5 py-1.5">
                        <Crosshair className="h-3 w-3 shrink-0 text-[var(--brand-primary)]" />
                        <span className="text-[11px] font-medium text-[var(--brand-primary)]">
                            Editing {selectedNodeCount} selected {selectedNodeCount === 1 ? 'node' : 'nodes'}
                        </span>
                    </div>
                ) : null}

                {selectedImage && (
                    <div className="group relative mb-3 h-16 w-16 overflow-hidden rounded-[var(--radius-md)] border border-slate-200 bg-slate-100 shadow-sm">
                        <img src={selectedImage} alt="Upload preview" className="h-full w-full object-cover" />
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                )}

                <div className="relative flex w-full flex-col rounded-[var(--radius-md)] border border-slate-200 bg-slate-50/70 transition-all focus-within:border-[var(--brand-primary)] focus-within:bg-white focus-within:ring-2 focus-within:ring-[var(--brand-primary-100)]">
                    <textarea
                        value={prompt}
                        onChange={(event) => {
                            if (lastError) {
                                onClearError();
                            }
                            setPrompt(event.target.value);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={getPromptPlaceholder(generationMode, nodeCount, selectedNodeCount)}
                        className="w-full resize-none rounded-t-[var(--radius-md)] bg-transparent p-4 text-sm text-[var(--brand-text)] placeholder-slate-400 outline-none custom-scrollbar"
                        style={{ minHeight: '60px', maxHeight: '160px' }}
                        rows={2}
                    />
                    <div className="flex items-center justify-between rounded-b-[var(--radius-md)] px-3 pb-3 pt-1">
                        <div className="flex items-center gap-2">
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleImageSelect}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                title="Attach Image"
                            >
                                <Paperclip className="h-4 w-4" />
                            </button>
                        </div>
                        {isGenerating ? (
                            <button
                                onClick={onCancelGeneration}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-all active:scale-95 flex-shrink-0"
                                aria-label="Cancel generation"
                            >
                                <Square className="h-3.5 w-3.5 fill-current" />
                            </button>
                        ) : (
                            <button
                                onClick={() => { void submitPrompt(); }}
                                disabled={(!prompt.trim() && !selectedImage) || !aiReadiness.canGenerate}
                                className={`flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-600)] disabled:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex-shrink-0 ${isBeveled ? 'btn-beveled' : ''}`}
                                aria-label={t('ai.generateWithFlowpilot', { defaultValue: 'Generate with Flowpilot' })}
                            >
                                {generationMode === 'edit' && nodeCount > 0 ? <Edit3 className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
