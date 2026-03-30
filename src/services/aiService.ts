import { getSystemInstruction, ChatMessage, generateDiagramFromChat as generateDiagramFromChatGemini, chatWithDocsGemini } from './geminiService';
import { DEFAULT_MODELS, PROVIDER_BASE_URLS } from '@/config/aiProviders';
import { err, ok, type Result } from '@/lib/result';
import {
    getClaudeContent,
    getOpenAICompatibleContent,
    parseClaudeStreamDelta,
    parseOpenAIStreamDelta,
} from './aiServiceSchemas';

export type AIProvider = 'gemini' | 'openai' | 'claude' | 'groq' | 'nvidia' | 'cerebras' | 'mistral' | 'openrouter' | 'custom';

interface AiServiceError {
    code:
        | 'missing_api_key'
        | 'unknown_provider'
        | 'network_error'
        | 'bad_response';
    message: string;
    status?: number;
}

type TextMessage = { role: string; content: string };

function getEnvApiKey(provider: AIProvider): string | undefined {
    switch (provider) {
        case 'gemini': return import.meta.env.VITE_GEMINI_API_KEY;
        case 'openai': return import.meta.env.VITE_OPENAI_API_KEY;
        case 'claude': return import.meta.env.VITE_CLAUDE_API_KEY;
        case 'groq': return import.meta.env.VITE_GROQ_API_KEY;
        case 'nvidia': return import.meta.env.VITE_NVIDIA_API_KEY;
        case 'cerebras': return import.meta.env.VITE_CEREBRAS_API_KEY;
        case 'mistral': return import.meta.env.VITE_MISTRAL_API_KEY;
        case 'openrouter': return import.meta.env.VITE_OPENROUTER_API_KEY;
        case 'custom': return import.meta.env.VITE_CUSTOM_AI_API_KEY;
        default: return undefined;
    }
}

function historyToMessages(history: ChatMessage[]): TextMessage[] {
    return history.map(h => ({
        role: h.role === 'model' ? 'assistant' : 'user',
        content: h.parts.map(p => p.text || '').join(''),
    }));
}

function resolveApiKey(provider: AIProvider, apiKeySetting?: string): string {
    const apiKey = apiKeySetting || getEnvApiKey(provider);
    if (!apiKey) {
        throw new Error('API key is missing. Add it in Settings → AI or in your .env.local file.');
    }
    return apiKey;
}

function resolveModelId(provider: AIProvider, modelIdSetting?: string): string | undefined {
    return modelIdSetting || (provider === 'custom' ? import.meta.env.VITE_CUSTOM_AI_MODEL : undefined);
}

function resolveOpenAICompatibleBaseUrl(provider: AIProvider, customBaseUrlSetting?: string): string {
    if (provider === 'custom') {
        return customBaseUrlSetting || import.meta.env.VITE_CUSTOM_AI_BASE_URL || PROVIDER_BASE_URLS.openai;
    }

    const baseUrl = PROVIDER_BASE_URLS[provider as keyof typeof PROVIDER_BASE_URLS];
    if (!baseUrl) {
        throw new Error(`Unknown provider: ${provider}`);
    }
    return baseUrl;
}

function toAiServiceError(error: AiServiceError): Error {
    return new Error(error.message);
}

function parseOpenAICompatibleContent(data: unknown): Result<string, AiServiceError> {
    const text = getOpenAICompatibleContent(data);
    if (typeof text !== 'string' || text.trim().length === 0) {
        return err({
            code: 'bad_response',
            message: 'No content in response from AI provider.',
        });
    }

    return ok(text);
}

function parseClaudeContent(data: unknown): Result<string, AiServiceError> {
    const text = getClaudeContent(data);
    if (typeof text !== 'string' || text.trim().length === 0) {
        return err({
            code: 'bad_response',
            message: 'No content in Anthropic response.',
        });
    }

    return ok(text);
}

async function parseFailedResponse(response: Response, prefix: string): Promise<AiServiceError> {
    const errorText = await response.text();
    return {
        code: 'network_error',
        status: response.status,
        message: `${prefix} (${response.status}): ${errorText}`,
    };
}

async function readSSEStream(
    response: Response,
    extractDelta: (data: string) => string | undefined,
    onChunk: (delta: string) => void,
): Promise<string> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';
    let done = false;

    while (!done) {
        const chunk = await reader.read();
        done = chunk.done;
        if (chunk.value) buffer += decoder.decode(chunk.value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') return fullText;
            try {
                const delta = extractDelta(data);
                if (delta) {
                    fullText += delta;
                    onChunk(delta);
                }
            } catch { /* skip malformed SSE lines */ }
        }
    }
    return fullText;
}

function extractOpenAIDelta(data: string): string | undefined {
    return parseOpenAIStreamDelta(data);
}

function extractClaudeDelta(data: string): string | undefined {
    return parseClaudeStreamDelta(data);
}

function extractImageParts(imageBase64: string): { mimeType: string; cleanBase64: string } {
    const match = imageBase64.match(/^data:image\/([^;]+);base64,/);
    return {
        mimeType: match ? `image/${match[1]}` : 'image/png',
        cleanBase64: imageBase64.replace(/^data:image\/[^;]+;base64,/, ''),
    };
}

function withOpenAIImage(messages: TextMessage[], imageBase64: string): unknown[] {
    const { mimeType, cleanBase64 } = extractImageParts(imageBase64);
    return messages.map((m, i) => {
        if (i !== messages.length - 1 || m.role !== 'user') return m;
        return {
            role: 'user',
            content: [
                { type: 'image_url', image_url: { url: `data:${mimeType};base64,${cleanBase64}` } },
                { type: 'text', text: m.content },
            ],
        };
    });
}

function withClaudeImage(messages: TextMessage[], imageBase64: string): unknown[] {
    const { mimeType, cleanBase64 } = extractImageParts(imageBase64);
    return messages.map((m, i) => {
        if (i !== messages.length - 1 || m.role !== 'user') return m;
        return {
            role: 'user',
            content: [
                { type: 'image', source: { type: 'base64', media_type: mimeType, data: cleanBase64 } },
                { type: 'text', text: m.content },
            ],
        };
    });
}

async function callOpenAICompatible(
    baseUrl: string,
    apiKey: string,
    model: string,
    messages: TextMessage[],
    onChunk?: (delta: string) => void,
    signal?: AbortSignal,
    imageBase64?: string,
    temperature?: number,
): Promise<string> {
    const body = imageBase64 ? withOpenAIImage(messages, imageBase64) : messages;
    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages: body,
            temperature: temperature ?? 0.2,
            max_tokens: 4096,
            stream: true,
        }),
        signal,
    });

    if (!response.ok) {
        throw toAiServiceError(await parseFailedResponse(response, 'API error'));
    }

    return readSSEStream(response, extractOpenAIDelta, onChunk ?? (() => undefined));
}

async function callClaude(
    apiKey: string,
    model: string,
    messages: TextMessage[],
    systemInstruction: string,
    onChunk?: (delta: string) => void,
    signal?: AbortSignal,
    imageBase64?: string,
    temperature?: number,
): Promise<string> {
    const body = imageBase64 ? withClaudeImage(messages, imageBase64) : messages;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model,
            system: systemInstruction,
            messages: body,
            max_tokens: 4096,
            temperature: temperature ?? 0.2,
            stream: true,
        }),
        signal,
    });

    if (!response.ok) {
        throw toAiServiceError(await parseFailedResponse(response, 'Anthropic API error'));
    }

    return readSSEStream(response, extractClaudeDelta, onChunk ?? (() => undefined));
}

export async function generateDiagramFromChat(
    history: ChatMessage[],
    newMessage: string,
    currentDSL?: string,
    imageBase64?: string,
    apiKeySetting?: string,
    modelIdSetting?: string,
    provider: AIProvider = 'gemini',
    customBaseUrlSetting?: string,
    isEditMode = false,
    onChunk?: (delta: string) => void,
    signal?: AbortSignal,
    temperature?: number,
): Promise<string> {
    const apiKey = resolveApiKey(provider, apiKeySetting);
    const modelId = resolveModelId(provider, modelIdSetting);

    const userPrompt = isEditMode && currentDSL
        ? `User Request: ${newMessage}\n\nCURRENT DIAGRAM — output the complete updated OpenFlow DSL:\n${currentDSL}\n\nIMPORTANT: Preserve ALL unchanged node IDs and attributes exactly. Only modify what was requested.`
        : `User Request: ${newMessage}\n\nGenerate a new OpenFlow DSL diagram.`;

    if (provider === 'gemini') {
        return generateDiagramFromChatGemini(history, newMessage, currentDSL, imageBase64, apiKey, modelId, isEditMode, onChunk, signal, temperature);
    }

    const systemInstruction = getSystemInstruction(isEditMode ? 'edit' : 'create');

    if (provider === 'claude') {
        const messages: TextMessage[] = [
            ...historyToMessages(history),
            { role: 'user', content: userPrompt },
        ];
        return callClaude(apiKey, modelId || DEFAULT_MODELS.claude, messages, systemInstruction, onChunk, signal, imageBase64, temperature);
    }

    const messages: TextMessage[] = [
        { role: 'system', content: systemInstruction },
        ...historyToMessages(history),
        { role: 'user', content: userPrompt },
    ];

    return callOpenAICompatible(
        resolveOpenAICompatibleBaseUrl(provider, customBaseUrlSetting),
        apiKey,
        modelId || DEFAULT_MODELS[provider],
        messages,
        onChunk,
        signal,
        imageBase64,
        temperature,
    );
}

export async function chatWithDocs(
    history: ChatMessage[],
    newMessage: string,
    docsContext: string,
    apiKeySetting?: string,
    modelIdSetting?: string,
    provider: AIProvider = 'gemini',
    customBaseUrlSetting?: string
): Promise<string> {
    const apiKey = resolveApiKey(provider, apiKeySetting);
    const modelId = resolveModelId(provider, modelIdSetting);

    if (provider === 'gemini') {
        return chatWithDocsGemini(history, newMessage, docsContext, apiKey, modelId);
    }

    const systemInstruction = `
You are an expert support assistant for OpenFlowKit, a local-first node-based diagramming tool.
Your job is to answer user questions accurately based ONLY on the provided documentation.
Be helpful, concise, and use formatting (bold, code blocks) to make your answers easy to read.
If the answer is not in the documentation, politely inform the user that you don't know based on the current docs.

DOCUMENTATION REPOSITORY:
---
${docsContext}
---
`;

    if (provider === 'claude') {
        const messages: TextMessage[] = [
            ...historyToMessages(history),
            { role: 'user', content: newMessage },
        ];
        return callClaude(apiKey, modelId || DEFAULT_MODELS.claude, messages, systemInstruction);
    }

    const messages: TextMessage[] = [
        { role: 'system', content: systemInstruction },
        ...historyToMessages(history),
        { role: 'user', content: newMessage },
    ];

    return callOpenAICompatible(
        resolveOpenAICompatibleBaseUrl(provider, customBaseUrlSetting),
        apiKey,
        modelId || DEFAULT_MODELS[provider],
        messages
    );
}
export type { ChatMessage };
export { parseClaudeContent, parseOpenAICompatibleContent };
