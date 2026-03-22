import { useEffect, useRef, useState, type ReactElement } from 'react';
import {
    ArrowUp, Code2, Database, Server, Cloud, Network,
    Loader2, Paperclip, Trash2, WandSparkles, X, FileCode, Crosshair, Import, Edit3,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ChatMessage } from '@/services/aiService';
import { IS_BEVELED } from '@/lib/brand';
import { useAIViewState } from './command-bar/useAIViewState';
import {
    LANGUAGE_LABELS,
    FILE_EXTENSION_TO_LANGUAGE,
    type SupportedLanguage,
} from '@/hooks/ai-generation/codeToArchitecture';
import { TERRAFORM_FORMAT_LABELS, type TerraformInputFormat } from '@/hooks/ai-generation/terraformToCloud';

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

type ImportType = 'sql' | 'terraform' | 'openapi';

const IMPORT_TYPE_LABELS: Record<ImportType, string> = {
    sql: 'SQL DDL → ERD',
    terraform: 'Terraform / K8s → Cloud',
    openapi: 'OpenAPI → Sequence',
};

const IMPORT_TYPE_PLACEHOLDERS: Record<ImportType, string> = {
    sql: 'Paste CREATE TABLE statements here...',
    terraform: 'Paste Terraform HCL, Kubernetes YAML, or Docker Compose here...',
    openapi: 'Paste your OpenAPI / Swagger YAML or JSON here...',
};

interface StudioAIPanelProps {
    onAIGenerate: (prompt: string, imageBase64?: string) => Promise<void>;
    isGenerating: boolean;
    chatMessages: ChatMessage[];
    onClearChat: () => void;
    onCodeAnalysis?: (code: string, language: SupportedLanguage) => Promise<void>;
    onSqlAnalysis?: (sql: string) => Promise<void>;
    onTerraformAnalysis?: (input: string, format: TerraformInputFormat) => Promise<void>;
    onOpenApiAnalysis?: (spec: string) => Promise<void>;
    nodeCount?: number;
    selectedNodeCount?: number;
    initialPrompt?: string;
    onInitialPromptConsumed?: () => void;
}

type AIMode = 'chat' | 'code' | 'import';

const AI_MODES: AIMode[] = ['chat', 'code', 'import'];

const AI_MODE_COPY: Record<AIMode, { label: string; caption: string }> = {
    chat: {
        label: 'AI Studio',
        caption: 'Prompt targeted edits, additions, and refinements.',
    },
    code: {
        label: 'From code',
        caption: 'Paste source files to generate an architecture draft.',
    },
    import: {
        label: 'Structured import',
        caption: 'Turn SQL, Terraform, or OpenAPI into a canvas.',
    },
};

export function StudioAIPanel({
    onAIGenerate,
    isGenerating,
    chatMessages,
    onClearChat,
    onCodeAnalysis,
    onSqlAnalysis,
    onTerraformAnalysis,
    onOpenApiAnalysis,
    nodeCount = 0,
    selectedNodeCount = 0,
    initialPrompt,
    onInitialPromptConsumed,
}: StudioAIPanelProps): ReactElement {
    const { t } = useTranslation();
    const isBeveled = IS_BEVELED;
    const codeFileInputRef = useRef<HTMLInputElement | null>(null);
    const [aiMode, setAiMode] = useState<AIMode>('chat');
    const [codeInput, setCodeInput] = useState('');
    const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('typescript');
    const showCodeTab = Boolean(onCodeAnalysis);
    const showImportTab = Boolean(onSqlAnalysis) || Boolean(onTerraformAnalysis) || Boolean(onOpenApiAnalysis);
    const [importType, setImportType] = useState<ImportType>('sql');
    const [importInput, setImportInput] = useState('');
    const [terraformFormat, setTerraformFormat] = useState<TerraformInputFormat>('terraform');

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

    const handleCodeFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
        const detectedLanguage = FILE_EXTENSION_TO_LANGUAGE[ext];
        if (detectedLanguage) setSelectedLanguage(detectedLanguage);
        const reader = new FileReader();
        reader.onload = (e) => setCodeInput(e.target?.result as string ?? '');
        reader.readAsText(file);
        event.target.value = '';
    };

    const handleAnalyzeCode = async () => {
        if (!codeInput.trim() || !onCodeAnalysis) return;
        await onCodeAnalysis(codeInput, selectedLanguage);
    };

    const handleImport = async () => {
        if (!importInput.trim()) return;
        if (importType === 'sql' && onSqlAnalysis) {
            await onSqlAnalysis(importInput);
        } else if (importType === 'terraform' && onTerraformAnalysis) {
            await onTerraformAnalysis(importInput, terraformFormat);
        } else if (importType === 'openapi' && onOpenApiAnalysis) {
            await onOpenApiAnalysis(importInput);
        }
    };

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
            {(showCodeTab || showImportTab) && (
                <div className="shrink-0 border-b border-slate-100 px-3 pb-3 pt-2">
                    <div className="mb-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Studio actions</p>
                        <p className="mt-1 text-xs text-slate-500">{AI_MODE_COPY[aiMode].caption}</p>
                    </div>
                    <div className="flex gap-1">
                        {AI_MODES.filter((mode) => {
                        if (mode === 'code') return showCodeTab;
                        if (mode === 'import') return showImportTab;
                        return true;
                    }).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setAiMode(mode)}
                            className={`flex items-center gap-1.5 rounded-t px-3 py-2 text-xs font-semibold transition-colors border-b-2 -mb-px ${
                                aiMode === mode
                                    ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                                    : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {mode === 'chat' && <WandSparkles className="h-3.5 w-3.5" />}
                            {mode === 'code' && <Code2 className="h-3.5 w-3.5" />}
                            {mode === 'import' && <Import className="h-3.5 w-3.5" />}
                            {AI_MODE_COPY[mode].label}
                        </button>
                    ))}
                    </div>
                </div>
            )}

            {aiMode === 'import' && showImportTab ? (
                <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3 custom-scrollbar">
                    <div className="rounded-[var(--radius-md)] border border-slate-200 bg-[var(--brand-primary-50)] p-3">
                        <p className="text-xs font-medium text-[var(--brand-primary)]">Import structured data</p>
                        <p className="mt-0.5 text-[11px] leading-5 text-slate-500">Paste SQL, Terraform, Kubernetes, Docker Compose, or OpenAPI specs to generate an editable draft.</p>
                    </div>

                    <div className="flex gap-1.5 flex-wrap">
                        {(Object.entries(IMPORT_TYPE_LABELS) as [ImportType, string][]).map(([key, label]) => (
                            <button
                                key={key}
                                onClick={() => { setImportType(key); setImportInput(''); }}
                                className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                                    importType === key
                                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-50)] text-[var(--brand-primary)]'
                                        : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {importType === 'terraform' && (
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-slate-600 shrink-0">Format</label>
                            <select
                                value={terraformFormat}
                                onChange={(e) => setTerraformFormat(e.target.value as TerraformInputFormat)}
                                className="flex-1 rounded-[var(--radius-sm)] border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary-100)]"
                            >
                                {(Object.entries(TERRAFORM_FORMAT_LABELS) as [TerraformInputFormat, string][]).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <textarea
                        value={importInput}
                        onChange={(e) => setImportInput(e.target.value)}
                        placeholder={IMPORT_TYPE_PLACEHOLDERS[importType]}
                        className="min-h-[240px] flex-1 resize-none rounded-[var(--radius-md)] border border-slate-200 bg-white px-3 py-3 font-mono text-xs text-slate-700 outline-none placeholder-slate-300 focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary-100)] custom-scrollbar"
                    />

                    <button
                        onClick={() => void handleImport()}
                        disabled={!importInput.trim() || isGenerating}
                        className={`flex h-9 w-full items-center justify-center gap-2 rounded-[var(--brand-radius)] bg-[var(--brand-primary)] text-sm font-medium text-white transition-all hover:bg-[var(--brand-primary-600)] disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98] ${isBeveled ? 'btn-beveled' : ''}`}
                    >
                        {isGenerating ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Generating draft...</>
                        ) : (
                            <><WandSparkles className="h-4 w-4" /> Generate from import</>
                        )}
                    </button>
                </div>
            ) : aiMode === 'code' && showCodeTab ? (
                <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3 custom-scrollbar">
                    <div className="rounded-[var(--radius-md)] border border-slate-200 bg-[var(--brand-primary-50)] p-3">
                        <p className="text-xs font-medium text-[var(--brand-primary)]">Generate from source code</p>
                        <p className="mt-0.5 text-[11px] leading-5 text-slate-500">Paste source files or upload a snippet. AI Studio will analyze the structure and build an architecture draft on the canvas.</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-slate-600 shrink-0">Language</label>
                        <select
                            value={selectedLanguage}
                            onChange={(e) => setSelectedLanguage(e.target.value as SupportedLanguage)}
                            className="flex-1 rounded-[var(--radius-sm)] border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary-100)]"
                        >
                            {(Object.entries(LANGUAGE_LABELS) as [SupportedLanguage, string][]).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                        <input
                            type="file"
                            accept=".ts,.tsx,.js,.jsx,.mjs,.py,.go,.java,.rb,.cs,.cpp,.cc,.cxx,.rs"
                            className="hidden"
                            ref={codeFileInputRef}
                            onChange={handleCodeFileSelect}
                        />
                        <button
                            onClick={() => codeFileInputRef.current?.click()}
                            title="Upload source file"
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors shrink-0"
                        >
                            <FileCode className="h-4 w-4" />
                        </button>
                    </div>

                    <textarea
                        value={codeInput}
                        onChange={(e) => setCodeInput(e.target.value)}
                        placeholder="Paste your source code here..."
                        className="min-h-[240px] flex-1 resize-none rounded-[var(--radius-md)] border border-slate-200 bg-white px-3 py-3 font-mono text-xs text-slate-700 outline-none placeholder-slate-300 focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary-100)] custom-scrollbar"
                    />

                    <button
                        onClick={() => void handleAnalyzeCode()}
                        disabled={!codeInput.trim() || isGenerating}
                        className={`flex h-9 w-full items-center justify-center gap-2 rounded-[var(--brand-radius)] bg-[var(--brand-primary)] text-sm font-medium text-white transition-all hover:bg-[var(--brand-primary-600)] disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98] ${isBeveled ? 'btn-beveled' : ''}`}
                    >
                        {isGenerating ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing code...</>
                        ) : (
                            <><WandSparkles className="h-4 w-4" /> Generate from code</>
                        )}
                    </button>
                </div>
            ) : (
                <>
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

                    <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 py-4 custom-scrollbar">
                        {!hasHistory ? (
                            <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[var(--radius-md)] border border-[var(--brand-primary-100)] bg-[var(--brand-primary-50)] text-[var(--brand-primary)] shadow-sm">
                                    <WandSparkles className="h-6 w-6" />
                                </div>
                                <h3 className="text-xl font-semibold tracking-tight text-slate-900">AI Studio</h3>
                                <p className="mt-2 mb-6 max-w-[280px] text-sm leading-6 text-slate-500">
                                    {nodeCount === 0
                                        ? 'Start with a template or describe your diagram from scratch.'
                                        : 'Describe the change you want. AI Studio works best for targeted edits, additions, and quick first drafts.'}
                                </p>
                                <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-[320px] mx-auto">
                                    {(nodeCount === 0 ? EMPTY_CANVAS_EXAMPLES : ITERATION_EXAMPLES).map((skill, index) => {
                                        const Icon = skill.icon;
                                        return (
                                            <button
                                                key={skill.label}
                                                onClick={() => {
                                                    setPrompt(skill.prompt);
                                                    void handleGenerate(skill.prompt);
                                                }}
                                                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[13px] font-medium text-slate-700 shadow-sm transition-all hover:border-[var(--brand-primary-200)] hover:text-[var(--brand-primary)] active:scale-95"
                                            >
                                                <Icon className={`h-3.5 w-3.5 ${getExampleIconColor(index)}`} />
                                                {skill.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            chatMessages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                        className={`max-w-[88%] rounded-[var(--radius-lg)] px-3.5 py-2.5 text-sm whitespace-pre-wrap ${msg.role === 'user'
                                            ? 'rounded-br-sm bg-[var(--brand-primary)] text-white shadow-sm'
                                            : 'rounded-bl-sm border border-slate-200/70 bg-white text-[var(--brand-text)] shadow-sm'
                                            }`}
                                    >
                                        {msg.parts.map((part, index) => (
                                            <div key={index} className="leading-relaxed">{part.text}</div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="border-t border-slate-100 px-1 pt-3">
                        {selectedNodeCount > 0 ? (
                            <div className="mb-2 flex items-center gap-1.5 rounded-md bg-[var(--brand-primary-50)] px-2.5 py-1.5">
                                <Crosshair className="h-3 w-3 shrink-0 text-[var(--brand-primary)]" />
                                <span className="text-[11px] font-medium text-[var(--brand-primary)]">
                                    Targeting {selectedNodeCount} selected {selectedNodeCount === 1 ? 'node' : 'nodes'}
                                </span>
                            </div>
                        ) : nodeCount > 0 ? (
                            <div className="mb-2 flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                                <Edit3 className="h-3 w-3 shrink-0 text-slate-500" />
                                <span className="text-[11px] font-medium text-slate-500">
                                    Editing existing diagram
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

                        <div className="relative flex w-full flex-col rounded-[var(--brand-radius)] border border-slate-200 bg-white shadow-sm transition-all focus-within:border-[var(--brand-primary)] focus-within:ring-2 focus-within:ring-[var(--brand-primary-100)]">
                            <textarea
                                value={prompt}
                                onChange={(event) => setPrompt(event.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={
                                    selectedNodeCount > 0
                                        ? `Describe what to change about the ${selectedNodeCount} selected node${selectedNodeCount > 1 ? 's' : ''}...`
                                        : nodeCount > 0
                                            ? "Describe a change \u2014 e.g. 'make auth service red' or 'add Redis between API and DB'"
                                            : 'Describe a diagram to generate from scratch...'
                                }
                                className="w-full resize-none rounded-t-[var(--brand-radius)] bg-transparent p-4 text-sm text-[var(--brand-text)] placeholder-[var(--brand-secondary-light)] outline-none custom-scrollbar"
                                style={{ minHeight: '60px', maxHeight: '160px' }}
                                rows={2}
                            />
                            <div className="flex items-center justify-between rounded-b-[var(--brand-radius)] px-3 pb-3 pt-1">
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
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => { void handleGenerate(); }}
                                        disabled={(!prompt.trim() && !selectedImage) || isGenerating}
                                        className={`flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-600)] disabled:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex-shrink-0 ${isBeveled ? 'btn-beveled' : ''}`}
                                    >
                                        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : nodeCount > 0 ? <Edit3 className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
