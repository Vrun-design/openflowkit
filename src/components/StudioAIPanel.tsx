import type { ReactElement } from 'react';
import {
    ArrowUp, Database, Server, Cloud, Network, Shield, Workflow,
    Loader2, Paperclip, Trash2, WandSparkles, X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ChatMessage } from '@/services/aiService';
import { useBrandConfig } from '@/store/brandHooks';
import { useAIViewState } from './command-bar/useAIViewState';

interface FlowPilotExample {
    label: string;
    icon: typeof Database;
    prompt: string;
}

const FLOWPILOT_EXAMPLES: FlowPilotExample[] = [
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
    onAIGenerate: (prompt: string, imageBase64?: string) => Promise<void>;
    isGenerating: boolean;
    chatMessages: ChatMessage[];
    onClearChat: () => void;
}

export function StudioAIPanel({
    onAIGenerate,
    isGenerating,
    chatMessages,
    onClearChat,
}: StudioAIPanelProps): ReactElement {
    const { t } = useTranslation();
    const brandConfig = useBrandConfig();
    const isBeveled = brandConfig.ui.buttonStyle === 'beveled';
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

    const hasHistory = chatMessages.length > 0;

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
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
                        <h3 className="text-xl font-semibold tracking-tight text-slate-900">FlowPilot</h3>
                        <p className="mt-2 mb-6 max-w-[280px] text-sm leading-6 text-slate-500">
                            Describe the changes you want and FlowPilot will update the graph for you.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-[320px] mx-auto">
                            {FLOWPILOT_EXAMPLES.map((skill, index) => {
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
                        placeholder="Describe your edits..."
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
                                onClick={() => {
                                    void handleGenerate();
                                }}
                                disabled={(!prompt.trim() && !selectedImage) || isGenerating}
                                className={`flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-600)] disabled:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex-shrink-0 ${isBeveled ? 'btn-beveled' : ''}`}
                            >
                                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
