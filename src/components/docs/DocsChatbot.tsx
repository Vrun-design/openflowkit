import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { AlertCircle, Loader2, Plus, Send, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFlowStore } from '../../store';
import { useBrandConfig } from '@/store/brandHooks';
import { OpenFlowLogo } from '../icons/OpenFlowLogo';
import { MarkdownComponents } from './MarkdownComponents';
import { useDocsChatbotState } from './chatbot/useDocsChatbotState';

export const DocsChatbot: React.FC = () => {
    const { t } = useTranslation();
    const brandConfig = useBrandConfig();
    const aiSettings = useFlowStore((state) => state.aiSettings);
    const {
        messages,
        input,
        setInput,
        isLoading,
        error,
        messagesEndRef,
        handleSend,
        resetChat,
    } = useDocsChatbotState({ aiSettings });
    const composerRef = useRef<HTMLTextAreaElement>(null);

    const suggestedPrompts = [
        {
            title: t('chatbot.prompts.keyboardShortcuts.title'),
            description: t('chatbot.prompts.keyboardShortcuts.description'),
            icon: t('chatbot.prompts.keyboardShortcuts.icon')
        },
        {
            title: t('chatbot.prompts.nodeTypes.title'),
            description: t('chatbot.prompts.nodeTypes.description'),
            icon: t('chatbot.prompts.nodeTypes.icon')
        },
        {
            title: t('chatbot.prompts.dslSyntax.title'),
            description: t('chatbot.prompts.dslSyntax.description'),
            icon: t('chatbot.prompts.dslSyntax.icon')
        }
    ];

    const renderLogo = (className: string) => {
        return brandConfig.faviconUrl ? (
            <img src={brandConfig.faviconUrl} alt={brandConfig.appName} className={`object-contain ${className}`} />
        ) : (
            <OpenFlowLogo className={className} />
        );
    };

    const handleKeyDown = (event: React.KeyboardEvent): void => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void handleSend();
        }
    };

    useEffect(() => {
        composerRef.current?.focus();
    }, [messages.length]);

    if (messages.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-4xl mx-auto w-full animate-in fade-in zoom-in-95 duration-500">
                <div className="w-16 h-16 flex items-center justify-center mb-8 transform transition-transform hover:scale-105 duration-300">
                    {renderLogo('w-full h-full drop-shadow-sm')}
                </div>

                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-4 text-center bg-clip-text">
                    {t('chatbot.greeting')}
                </h1>

                <p className="text-lg text-slate-500 mb-10 text-center max-w-2xl px-4">
                    {t('chatbot.tagline')} {brandConfig.appName}.
                </p>

                <div className="relative flex items-end gap-2 w-full max-w-2xl bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-200/50 p-1.5 focus-within:shadow-[0_8px_30px_rgb(0,0,0,0.08)] focus-within:ring-2 focus-within:ring-[var(--brand-primary)]/30 mb-10 transition-all">
                    <textarea
                        ref={composerRef}
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        onKeyDown={handleKeyDown}
                        aria-label={t('chatbot.messagePlaceholder')}
                        placeholder={`${t('chatbot.messagePlaceholder')} ${brandConfig.appName} ${t('chatbot.aiSuffix')}`}
                        className="w-full min-h-[52px] max-h-[200px] border-0 px-4 py-3.5 text-[15px] focus:ring-0 resize-none placeholder:text-slate-400 custom-scrollbar block bg-transparent leading-relaxed"
                        rows={1}
                    />
                    <button
                        onClick={() => {
                            void handleSend();
                        }}
                        disabled={!input.trim() || isLoading}
                        className="shrink-0 w-11 h-11 mb-1 mr-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:scale-95 shadow-sm"
                        aria-label={t('chatbot.sendMessage')}
                    >
                        <Send className="w-4 h-4 ml-0.5" />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-4xl px-4">
                    {suggestedPrompts.map((prompt, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                void handleSend(prompt.description);
                            }}
                            className="flex flex-col text-left p-5 rounded-2xl bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] ring-1 ring-slate-100 hover:ring-slate-200 hover:shadow-md transition-all group duration-300 transform hover:-translate-y-1"
                        >
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 mb-3 group-hover:bg-[var(--brand-primary)]/10 group-hover:text-[var(--brand-primary)] transition-colors text-sm font-medium">
                                {prompt.icon}
                            </div>
                            <h3 className="text-sm font-semibold text-slate-900 mb-1">{prompt.title}</h3>
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{prompt.description}</p>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[900px] max-w-5xl mx-auto w-full bg-white rounded-[2rem] shadow-[0_8px_40px_rgb(0,0,0,0.08)] ring-1 ring-slate-200/50 overflow-hidden animate-in fade-in duration-300">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white z-10 shadow-sm">
                <div className="flex items-center gap-3 bg-white">
                    <div className="w-8 h-8 flex items-center justify-center">
                        {renderLogo('w-full h-full drop-shadow-sm')}
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-slate-900 tracking-tight">{brandConfig.appName} {t('chatbot.docsTitle')}</h2>
                        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{t('chatbot.aiAssistant')}</p>
                    </div>
                </div>
                <button
                    onClick={resetChat}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                    <Plus className="w-3.5 h-3.5" />
                    {t('chatbot.newChat')}
                </button>
            </div>

            <div
                role="log"
                aria-live="polite"
                aria-relevant="additions text"
                className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar bg-slate-50/30"
            >
                <div className="flex gap-4 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="shrink-0 w-8 h-8 flex items-center justify-center">
                        {renderLogo('w-full h-full object-contain drop-shadow-sm')}
                    </div>
                    <div className="flex flex-col gap-1 items-start min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">{brandConfig.appName} {t('chatbot.aiName')}</span>
                        <div className="px-5 py-4 rounded-2xl text-sm shadow-sm bg-white border border-slate-100 rounded-tl-sm text-slate-700">
                            <p>{t('chatbot.welcomeMessage', { appName: brandConfig.appName })}</p>
                        </div>
                    </div>
                </div>

                {messages.map((message, index) => {
                    const isUser = message.role === 'user';
                    return (
                        <div key={index} className={`flex gap-4 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300 ${isUser ? 'ml-auto flex-row-reverse' : ''}`}>
                            <div className={`shrink-0 w-8 h-8 flex items-center justify-center ${isUser ? 'rounded-full bg-slate-200 text-slate-600 p-2 shadow-sm' : ''}`}>
                                {isUser ? <User className="w-4 h-4" /> : renderLogo('w-full h-full object-contain drop-shadow-sm')}
                            </div>
                            <div className={`flex flex-col gap-1 min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                                    {isUser ? t('chatbot.you') : `${brandConfig.appName} ${t('chatbot.aiName')}`}
                                </span>
                                <div className={`px-4 py-3 rounded-2xl text-sm shadow-sm ${isUser ? 'bg-[var(--brand-primary)] text-white rounded-tr-sm' : 'bg-white border border-slate-100 rounded-tl-sm text-slate-700'}`}>
                                    {isUser ? (
                                        <p className="whitespace-pre-wrap">{message.parts.map((part) => part.text).join('')}</p>
                                    ) : (
                                        <div className="prose prose-sm prose-slate max-w-none">
                                            <ReactMarkdown
                                                components={MarkdownComponents}
                                                remarkPlugins={[remarkGfm]}
                                                rehypePlugins={[rehypeRaw]}
                                            >
                                                {message.parts.map((part) => part.text).join('')}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {isLoading && (
                    <div className="flex gap-4 max-w-[85%] animate-in fade-in duration-300">
                        <div className="shrink-0 w-8 h-8 flex items-center justify-center">
                            {renderLogo('w-full h-full object-contain drop-shadow-sm')}
                        </div>
                        <div className="flex flex-col gap-1 items-start">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1">{brandConfig.appName} {t('chatbot.aiName')}</span>
                            <div className="px-5 py-4 rounded-2xl bg-white border border-slate-100 rounded-tl-sm text-slate-700 shadow-sm flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-[var(--brand-primary)]" />
                                <span className="text-sm text-slate-500">{t('chatbot.searchingDocs')}</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {error && (
                <div className="mx-6 p-3 bg-red-50 text-red-900 rounded-lg border border-red-200 flex items-start gap-3 mt-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p className="text-xs">{error}</p>
                </div>
            )}

            <div className="p-4 md:p-6 bg-white border-t border-slate-100 z-10">
                <div className="relative flex items-end gap-2 max-w-4xl mx-auto bg-slate-50 ring-1 ring-slate-200/50 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-[var(--brand-primary)]/40 focus-within:bg-white transition-all shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                    <textarea
                        ref={composerRef}
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        onKeyDown={handleKeyDown}
                        aria-label={t('chatbot.messagePlaceholder')}
                        placeholder={`${t('chatbot.messagePlaceholder')} ${brandConfig.appName} ${t('chatbot.aiSuffix')}`}
                        className="w-full max-h-32 min-h-[44px] bg-transparent border-0 px-4 py-3 text-[15px] focus:ring-0 resize-none custom-scrollbar leading-relaxed"
                        rows={1}
                        disabled={isLoading}
                    />
                    <button
                        onClick={() => {
                            void handleSend();
                        }}
                        disabled={!input.trim() || isLoading}
                        className="shrink-0 w-11 h-11 mb-0.5 mr-0.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:scale-95 shadow-sm"
                        aria-label={t('chatbot.sendMessage')}
                    >
                        <Send className="w-4 h-4 ml-0.5" />
                    </button>
                </div>
                <p className="text-[11px] text-center text-slate-400 mt-3 font-medium tracking-wide">
                    {t('chatbot.aiDisclaimer')}
                </p>
            </div>
        </div>
    );
};
