import { useRef, useState, useEffect } from 'react';
import { Sparkles, Loader2, ImagePlus, X, Send, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { ViewHeader } from './ViewHeader';
import { ChatMessage } from '../../services/geminiService';
import { useFlowStore } from '../../store';
import { trackEvent } from '../../lib/analytics';

interface AIViewProps {
    searchQuery: string;
    onAIGenerate: (prompt: string, imageBase64?: string) => Promise<void>;
    onClose: () => void;
    handleBack: () => void;
    isGenerating: boolean;
    chatMessages?: ChatMessage[];
    onClearChat?: () => void;
}

export const AIView = ({
    searchQuery,
    onAIGenerate,
    onClose,
    handleBack,
    isGenerating,
    chatMessages = [],
    onClearChat
}: AIViewProps) => {
    const { brandConfig } = useFlowStore();
    const isBeveled = brandConfig.ui.buttonStyle === 'beveled';
    const [prompt, setPrompt] = useState(searchQuery || '');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatMessages]);

    const handleGenerate = async (text?: string) => {
        const promptText = text || prompt;
        if ((!promptText.trim() && !selectedImage) || isGenerating) return;

        trackEvent('ai_generate', { has_image: !!selectedImage });
        await onAIGenerate(promptText, selectedImage || undefined);
        setPrompt('');
        setSelectedImage(null);
        // We close the modal to show results. User can re-open to continue chat.
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        e.stopPropagation();
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleGenerate();
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const EXAMPLES = [
        { label: "User Registration", prompt: "User registration flow with email verification" },
        { label: "E-Commerce Checkout", prompt: "E-commerce checkout process with payment gateway failure handling" },
        { label: "CI/CD Pipeline", prompt: "CI/CD pipeline architecture" },
        { label: "OAuth2 Login", prompt: "Oauth2 login flow" }
    ];

    const hasHistory = chatMessages.length > 0;

    return (
        <div className="flex flex-col h-full bg-slate-50 relative">
            <ViewHeader
                title="Ask Flowpilot"
                icon={<Sparkles className="w-4 h-4 text-[var(--brand-primary)]" />}
                onBack={handleBack}
            />

            {onClearChat && hasHistory && (
                <button
                    onClick={onClearChat}
                    className="absolute top-3 right-12 p-1.5 text-slate-400 hover:text-red-500 transition-colors bg-white/50 rounded-md z-10"
                    title="Clear Chat History"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            )}

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Chat History Area */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4"
                >
                    {!hasHistory ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4 p-8 opacity-50">
                            <div className="w-12 h-12 bg-[var(--brand-primary-100)] rounded-full flex items-center justify-center">
                                <Sparkles className="w-6 h-6 text-[var(--brand-primary)]" />
                            </div>
                            <div className="space-y-1">
                                <p className="font-medium text-slate-700">How can I help you build?</p>
                                <p className="text-sm text-slate-500">Describe a flow, process, or system architecture.</p>
                            </div>
                        </div>
                    ) : (
                        chatMessages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`
                                        max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap
                                        ${msg.role === 'user'
                                            ? 'bg-[var(--brand-primary)] text-white rounded-br-none shadow-md'
                                            : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'
                                        }
                                    `}
                                >
                                    {msg.parts.map((p, i) => (
                                        <div key={i}>
                                            {p.text}
                                            {/* Note: We could render image previews here if we stored them in history properly */}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-slate-200">
                    {/* Image Preview */}
                    {selectedImage && (
                        <div className="mb-3 relative h-16 w-16 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden group">
                            <img src={selectedImage} alt="Upload preview" className="h-full w-full object-cover" />
                            <button
                                onClick={() => setSelectedImage(null)}
                                className="absolute top-0.5 right-0.5 p-0.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    )}

                    {/* Examples (Only show if no history) */}
                    {!hasHistory && !selectedImage && !prompt && (
                        <div className="mb-4 overflow-x-auto no-scrollbar">
                            <div className="flex gap-2">
                                {EXAMPLES.map((ex, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { setPrompt(ex.prompt); handleGenerate(ex.prompt); }}
                                        className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95
                                            ${isBeveled
                                                ? 'bg-white border border-slate-200 text-slate-600 btn-beveled hover:border-[var(--brand-primary-200)] hover:text-[var(--brand-primary)]'
                                                : 'bg-slate-50 border border-slate-200 text-slate-600 hover:border-[var(--brand-primary-200)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-50)]'}
                                        `}
                                    >
                                        {ex.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2 items-end">
                        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-[var(--radius-lg)] focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all flex flex-col">
                            <textarea
                                value={prompt}
                                onChange={e => setPrompt(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Describe your flow..."
                                className="w-full bg-transparent border-none focus:ring-0 outline-none p-3 text-sm resize-none max-h-32 min-h-[44px]"
                                style={{ height: '44px' }}
                            />
                            <div className="px-2 pb-2 flex justify-between items-center">
                                <div className="flex gap-1">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handleImageSelect}
                                    />
                                    <Button
                                        onClick={() => fileInputRef.current?.click()}
                                        variant="ghost"
                                        className="h-8 px-2 flex items-center gap-2 transition-colors"
                                        style={{
                                            color: brandConfig.colors.secondary,
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.color = brandConfig.colors.primary;
                                            e.currentTarget.style.backgroundColor = `${brandConfig.colors.primary}10`; // 10% opacity
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.color = brandConfig.colors.secondary;
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        }}
                                        title="Attach Image"
                                    >
                                        <ImagePlus className="w-4 h-4" />
                                        <span className="text-[10px] font-medium">Add Image</span>
                                    </Button>
                                </div>
                                <span className="text-[10px] text-slate-400 font-medium">
                                    {isGenerating ? 'Thinking...' : 'Enter to send'}
                                </span>
                            </div>
                        </div>

                        <Button
                            onClick={() => handleGenerate()}
                            disabled={(!prompt.trim() && !selectedImage) || isGenerating}
                            variant="primary"
                            className={`h-11 w-11 p-0 rounded-xl flex-shrink-0 flex items-center justify-center shadow-lg transition-all ${isGenerating ? 'opacity-80' : ''}`}
                        >
                            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
