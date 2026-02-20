import { getSystemInstruction, ChatMessage, generateDiagramFromChat as generateDiagramFromChatGemini } from './geminiService';

export type AIProvider = 'gemini' | 'openai' | 'claude' | 'groq' | 'nvidia' | 'cerebras' | 'mistral' | 'custom';

const PROVIDER_BASE_URLS: Record<string, string> = {
    openai: 'https://api.openai.com/v1',
    groq: 'https://api.groq.com/openai/v1',
    nvidia: 'https://integrate.api.nvidia.com/v1',
    cerebras: 'https://api.cerebras.ai/v1',
    mistral: 'https://api.mistral.ai/v1',
};

const DEFAULT_MODELS: Record<string, string> = {
    gemini: 'gemini-2.5-flash-lite',
    openai: 'gpt-5-mini',
    claude: 'claude-sonnet-4-6',
    groq: 'meta-llama/llama-4-scout-17b-16e-instruct',
    nvidia: 'meta/llama-4-scout-17b-16e-instruct',
    cerebras: 'gpt-oss-120b',
    mistral: 'mistral-medium-latest',
    custom: 'gpt-4o',
};

/** Convert FlowMind chat history to OpenAI-compatible message format */
function historyToMessages(history: ChatMessage[]): { role: string; content: string }[] {
    return history.map(h => ({
        role: h.role === 'model' ? 'assistant' : 'user',
        content: h.parts.map(p => p.text || '').join(''),
    }));
}

// --- OpenAI-compatible REST call (used by OpenAI, Groq, NVIDIA, Cerebras, Mistral, Custom) ---
async function callOpenAICompatible(
    baseUrl: string,
    apiKey: string,
    model: string,
    messages: { role: string; content: string }[]
): Promise<string> {
    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages,
            temperature: 0.2,
            max_tokens: 4096,
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`API error (${response.status}): ${err}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('No content in response from AI provider.');
    return text;
}

// --- Anthropic Claude REST call ---
async function callClaude(
    apiKey: string,
    model: string,
    messages: { role: string; content: string }[]
): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model,
            system: getSystemInstruction(),
            messages,
            max_tokens: 4096,
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Anthropic API error (${response.status}): ${err}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text;
    if (!text) throw new Error('No content in Anthropic response.');
    return text;
}

// --- Primary exported function ---
export async function generateDiagramFromChat(
    history: ChatMessage[],
    newMessage: string,
    currentDSL?: string,
    imageBase64?: string,
    apiKey?: string,
    modelId?: string,
    provider: AIProvider = 'gemini',
    customBaseUrl?: string
): Promise<string> {
    if (!apiKey) {
        throw new Error("API Key is missing. Please add it in Settings → Brand → Flowpilot.");
    }

    const userPrompt = `User Request: ${newMessage}${currentDSL ? `\n\nCURRENT CONTENT (The user wants to update this):\n${currentDSL}` : ''}\n\nGenerate or update the FlowMind DSL based on this request.`;

    // Gemini uses its own SDK with different prompt structure — delegate directly
    if (provider === 'gemini') {
        return generateDiagramFromChatGemini(history, newMessage, currentDSL, imageBase64, apiKey, modelId);
    }


    // Claude uses Anthropic's message format
    if (provider === 'claude') {
        const messages = [
            ...historyToMessages(history),
            { role: 'user', content: userPrompt },
        ];
        return callClaude(apiKey, modelId || DEFAULT_MODELS.claude, messages);
    }

    // All remaining providers (OpenAI, Groq, NVIDIA, Cerebras, Mistral, Custom) share the OpenAI wire format
    const baseUrl = provider === 'custom'
        ? (customBaseUrl || PROVIDER_BASE_URLS.openai)
        : PROVIDER_BASE_URLS[provider];

    if (!baseUrl) throw new Error(`Unknown provider: ${provider}`);

    const messages = [
        { role: 'system', content: getSystemInstruction() },
        ...historyToMessages(history),
        { role: 'user', content: userPrompt },
    ];

    return callOpenAICompatible(baseUrl, apiKey, modelId || DEFAULT_MODELS[provider] || 'gpt-4o', messages);
}

// Re-export for compatibility
export type { ChatMessage };
