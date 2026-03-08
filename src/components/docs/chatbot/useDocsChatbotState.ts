import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { chatWithDocs } from '@/services/aiService';
import type { ChatMessage } from '@/services/aiService';
import type { AISettings } from '@/store';
import { docsMarkdownLoaders } from '../docsMarkdownLoaders';

interface UseDocsChatbotStateParams {
    aiSettings: AISettings;
}

interface UseDocsChatbotStateResult {
    messages: ChatMessage[];
    input: string;
    setInput: (value: string) => void;
    isLoading: boolean;
    error: string | null;
    messagesEndRef: RefObject<HTMLDivElement>;
    handleSend: (overrideMsg?: string) => Promise<void>;
    resetChat: () => void;
}

const DOCS_CONTEXT_ERROR = 'Documentation context is unavailable. Please refresh or rebuild docs.';
const AI_RESPONSE_ERROR = 'Failed to get a response. Please check your API key settings.';

export function useDocsChatbotState({ aiSettings }: UseDocsChatbotStateParams): UseDocsChatbotStateResult {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [docsContext, setDocsContext] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function loadDocsContext(): Promise<void> {
            const entries = await Promise.all(
                Object.entries(docsMarkdownLoaders).map(async ([path, loader]) => {
                    const content = await loader();
                    const filename = path.split('/').pop()?.replace('.md', '') || '';
                    return `--- FILE: ${filename} ---\n${content}\n`;
                })
            );
            const merged = entries.join('\n');
            setDocsContext(merged);
            if (!merged.trim()) {
                setError(DOCS_CONTEXT_ERROR);
            }
        }

        loadDocsContext().catch(() => {
            setError(DOCS_CONTEXT_ERROR);
        });
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const resetChat = useCallback(() => {
        setMessages([]);
        setInput('');
        setError(null);
    }, []);

    const handleSend = useCallback(async (overrideMsg?: string) => {
        const msgToSend = overrideMsg || input.trim();
        if (!msgToSend || isLoading || !docsContext.trim()) return;

        setInput('');
        setError(null);

        const userMessage: ChatMessage = { role: 'user', parts: [{ text: msgToSend }] };
        const newHistory = [...messages, userMessage];
        setMessages(newHistory);
        setIsLoading(true);

        try {
            const responseText = await chatWithDocs(
                newHistory.slice(0, -1),
                msgToSend,
                docsContext,
                aiSettings.apiKey,
                aiSettings.model,
                aiSettings.provider,
                aiSettings.customBaseUrl
            );
            setMessages([...newHistory, { role: 'model', parts: [{ text: responseText }] }]);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : AI_RESPONSE_ERROR;
            setError(message || AI_RESPONSE_ERROR);
        } finally {
            setIsLoading(false);
        }
    }, [aiSettings, docsContext, input, isLoading, messages]);

    return {
        messages,
        input,
        setInput,
        isLoading,
        error,
        messagesEndRef,
        handleSend,
        resetChat,
    };
}
