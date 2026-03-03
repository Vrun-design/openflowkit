import { AIProvider } from '@/store';

export const PROVIDER_BASE_URLS: Record<Exclude<AIProvider, 'gemini' | 'claude' | 'custom'>, string> = {
    openai: 'https://api.openai.com/v1',
    groq: 'https://api.groq.com/openai/v1',
    nvidia: 'https://integrate.api.nvidia.com/v1',
    cerebras: 'https://api.cerebras.ai/v1',
    mistral: 'https://api.mistral.ai/v1',
    openrouter: 'https://openrouter.ai/api/v1',
};

export const DEFAULT_MODELS: Record<AIProvider, string> = {
    gemini: 'gemini-2.5-flash-lite',
    openai: 'gpt-5-mini',
    claude: 'claude-sonnet-4-6',
    groq: 'meta-llama/llama-4-scout-17b-16e-instruct',
    nvidia: 'meta/llama-4-scout-17b-16e-instruct',
    cerebras: 'gpt-oss-120b',
    mistral: 'mistral-medium-latest',
    openrouter: 'google/gemini-2.5-flash',
    custom: 'gpt-4o',
};

export interface ProviderMeta {
    id: AIProvider;
    name: string;
    icon: string;
    color: string;
    logoPath: string;
    keyPlaceholder: string;
    keyLink: string;
    consoleName: string;
    defaultModel: string;
}

function getDefaultModel(provider: AIProvider): string {
    if (provider === 'custom') return 'your-model-id';
    return DEFAULT_MODELS[provider] ?? 'gpt-4o';
}

export const PROVIDERS: ProviderMeta[] = [
    {
        id: 'gemini',
        name: 'Gemini',
        icon: '✦',
        color: '#4285F4',
        logoPath: '/logos/Gemini.svg',
        keyPlaceholder: 'AIzaSy...',
        keyLink: 'https://aistudio.google.com/app/apikey',
        consoleName: 'Google AI Studio',
        defaultModel: getDefaultModel('gemini'),
    },
    {
        id: 'openai',
        name: 'OpenAI',
        icon: '⬡',
        color: '#10a37f',
        logoPath: '/logos/Openai.svg',
        keyPlaceholder: 'sk-...',
        keyLink: 'https://platform.openai.com/api-keys',
        consoleName: 'OpenAI Platform',
        defaultModel: getDefaultModel('openai'),
    },
    {
        id: 'claude',
        name: 'Claude',
        icon: '◆',
        color: '#cc785c',
        logoPath: '/logos/claude.svg',
        keyPlaceholder: 'sk-ant-...',
        keyLink: 'https://console.anthropic.com/settings/keys',
        consoleName: 'Anthropic Console',
        defaultModel: getDefaultModel('claude'),
    },
    {
        id: 'groq',
        name: 'Groq',
        icon: '⚡',
        color: '#f55036',
        logoPath: '/logos/Groq.svg',
        keyPlaceholder: 'gsk_...',
        keyLink: 'https://console.groq.com/keys',
        consoleName: 'Groq Console',
        defaultModel: getDefaultModel('groq'),
    },
    {
        id: 'nvidia',
        name: 'NVIDIA',
        icon: '▶',
        color: '#76b900',
        logoPath: '/logos/Nvidia.svg',
        keyPlaceholder: 'nvapi-...',
        keyLink: 'https://build.nvidia.com',
        consoleName: 'NVIDIA Build',
        defaultModel: getDefaultModel('nvidia'),
    },
    {
        id: 'cerebras',
        name: 'Cerebras',
        icon: '🧠',
        color: '#7c3aed',
        logoPath: '/logos/cerebras.svg',
        keyPlaceholder: 'csk-...',
        keyLink: 'https://cloud.cerebras.ai',
        consoleName: 'Cerebras Cloud',
        defaultModel: getDefaultModel('cerebras'),
    },
    {
        id: 'mistral',
        name: 'Mistral',
        icon: '▣',
        color: '#FF7000',
        logoPath: '/logos/Mistral.svg',
        keyPlaceholder: 'your-mistral-key...',
        keyLink: 'https://console.mistral.ai/api-keys',
        consoleName: 'Mistral Console (La Plateforme)',
        defaultModel: getDefaultModel('mistral'),
    },
    {
        id: 'openrouter',
        name: 'OpenRouter',
        icon: '↔',
        color: '#111827',
        logoPath: '/logos/custom.svg',
        keyPlaceholder: 'sk-or-v1-...',
        keyLink: 'https://openrouter.ai/settings/keys',
        consoleName: 'OpenRouter Dashboard',
        defaultModel: getDefaultModel('openrouter'),
    },
    {
        id: 'custom',
        name: 'Custom',
        icon: '⚙',
        color: '#64748b',
        logoPath: '/logos/custom.svg',
        keyPlaceholder: 'your-api-key',
        keyLink: '',
        consoleName: '',
        defaultModel: getDefaultModel('custom'),
    },
];

export const PROVIDER_MODELS: Record<AIProvider, { id: string; translateKey: string }[]> = {
    gemini: [
        { id: 'gemini-2.5-flash-lite', translateKey: 'gemini-2.5-flash-lite' },
        { id: 'gemini-2.5-flash', translateKey: 'gemini-2.5-flash' },
        { id: 'gemini-2.5-pro', translateKey: 'gemini-2.5-pro' },
        { id: 'gemini-3-flash', translateKey: 'gemini-3-flash' },
        { id: 'gemini-3-pro', translateKey: 'gemini-3-pro' },
    ],
    openai: [
        { id: 'gpt-5-mini', translateKey: 'gpt-5-mini' },
        { id: 'gpt-5', translateKey: 'gpt-5' },
        { id: 'gpt-5.2', translateKey: 'gpt-5.2' },
        { id: 'o4-mini', translateKey: 'o4-mini' },
        { id: 'o3', translateKey: 'o3' },
    ],
    claude: [
        { id: 'claude-haiku-4-5', translateKey: 'claude-haiku-4-5' },
        { id: 'claude-sonnet-4-5', translateKey: 'claude-sonnet-4-5' },
        { id: 'claude-sonnet-4-6', translateKey: 'claude-sonnet-4-6' },
        { id: 'claude-opus-4-6', translateKey: 'claude-opus-4-6' },
    ],
    groq: [
        { id: 'meta-llama/llama-4-scout-17b-16e-instruct', translateKey: 'meta-llama/llama-4-scout-17b-16e-instruct' },
        { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', translateKey: 'meta-llama/llama-4-maverick-17b-128e-instruct' },
        { id: 'qwen/qwen3-32b', translateKey: 'qwen/qwen3-32b' },
        { id: 'llama-3.3-70b-versatile', translateKey: 'llama-3.3-70b-versatile' },
    ],
    nvidia: [
        { id: 'meta/llama-4-scout-17b-16e-instruct', translateKey: 'meta/llama-4-scout-17b-16e-instruct' },
        { id: 'nvidia/nemotron-nano-12b-v2-vl', translateKey: 'nvidia/nemotron-nano-12b-v2-vl' },
        { id: 'deepseek/deepseek-v3-2', translateKey: 'deepseek/deepseek-v3-2' },
        { id: 'qwen/qwq-32b', translateKey: 'qwen/qwq-32b' },
        { id: 'moonshotai/kimi-k2-thinking', translateKey: 'moonshotai/kimi-k2-thinking' },
    ],
    cerebras: [
        { id: 'gpt-oss-120b', translateKey: 'gpt-oss-120b' },
        { id: 'qwen-3-32b', translateKey: 'qwen-3-32b' },
        { id: 'qwen-3-235b-a22b', translateKey: 'qwen-3-235b-a22b' },
        { id: 'zai-glm-4.7', translateKey: 'zai-glm-4.7' },
    ],
    mistral: [
        { id: 'mistral-small-latest', translateKey: 'mistral-small-latest' },
        { id: 'mistral-medium-latest', translateKey: 'mistral-medium-latest' },
        { id: 'mistral-large-latest', translateKey: 'mistral-large-latest' },
        { id: 'codestral-latest', translateKey: 'codestral-latest' },
        { id: 'pixtral-large-latest', translateKey: 'pixtral-large-latest' },
    ],
    openrouter: [
        { id: 'google/gemini-2.5-flash', translateKey: 'google/gemini-2.5-flash' },
        { id: 'openai/gpt-5-mini', translateKey: 'openai/gpt-5-mini' },
        { id: 'anthropic/claude-sonnet-4', translateKey: 'anthropic/claude-sonnet-4' },
        { id: 'deepseek/deepseek-chat-v3.1', translateKey: 'deepseek/deepseek-chat-v3.1' },
    ],
    custom: [
        { id: 'custom', translateKey: 'custom' },
    ],
};

export const BYOK_KEYS = [
    'dataPrivacy',
    'control',
    'flexibility',
    'cuttingEdge',
] as const;

export const DEFAULT_BASE_URLS: Record<Exclude<AIProvider, 'gemini' | 'claude'>, string> = {
    openai: PROVIDER_BASE_URLS.openai,
    groq: PROVIDER_BASE_URLS.groq,
    nvidia: PROVIDER_BASE_URLS.nvidia,
    cerebras: PROVIDER_BASE_URLS.cerebras,
    mistral: PROVIDER_BASE_URLS.mistral,
    openrouter: PROVIDER_BASE_URLS.openrouter,
    custom: 'https://api.example.com/v1',
};

export type ProviderRisk = 'browser_friendly' | 'mixed' | 'proxy_likely';

export const PROVIDER_RISK: Record<AIProvider, ProviderRisk> = {
    gemini: 'browser_friendly',
    openrouter: 'browser_friendly',
    openai: 'mixed',
    claude: 'mixed',
    groq: 'proxy_likely',
    nvidia: 'proxy_likely',
    cerebras: 'mixed',
    mistral: 'mixed',
    custom: 'mixed',
};
