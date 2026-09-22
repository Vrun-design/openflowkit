// The BYOK catalogue: ten providers as frozen data. Three wire formats do the
// work (provider.ts); everything a provider does differently — its endpoint,
// its key shape, its extra headers, the name of its max-tokens parameter — is a
// field here, not a branch in the clients. No React, no fetch, no secrets.
export type AiProviderId =
  | 'gemini' | 'openai' | 'claude' | 'groq' | 'nvidia'
  | 'cerebras' | 'mistral' | 'openrouter' | 'ollama' | 'custom';

/** The request/response shape, not the vendor. Three cover all ten. */
export type AiWireFormat = 'anthropic' | 'openai' | 'google';

/** V1's rating, kept verbatim: what the browser will let this provider do. */
export type ProviderRisk = 'browser_friendly' | 'mixed' | 'proxy_likely';

export interface AiProviderDefinition {
  readonly id: AiProviderId;
  readonly label: string;
  readonly wire: AiWireFormat;
  /** '' for `custom`: the user supplies it, and must. */
  readonly defaultBaseUrl: string;
  /** '' for `custom`: unknowable until the user says. */
  readonly defaultModel: string;
  readonly keyPlaceholder: string;
  /** Regex source a real key matches; '' when the provider has no fixed shape. */
  readonly keyPattern: string;
  /** Ollama ignores the Authorization header, so it is the one provider without a key. */
  readonly needsKey: boolean;
  readonly consoleUrl: string;
  readonly consoleName: string;
  readonly logoPath: string;
  readonly risk: ProviderRisk;
  readonly hint: string;
  /** OpenAI-wire only: the provider's max-tokens parameter, when not `max_tokens`. */
  readonly maxTokensParam?: 'max_tokens' | 'max_completion_tokens';
  /** Extra request headers the provider asks for (OpenRouter attribution). */
  readonly extraHeaders?: Readonly<Record<string, string>>;
}

export const RISK_LABELS: Readonly<Record<ProviderRisk, string>> = {
  browser_friendly: 'Browser-ready',
  mixed: 'Depends on endpoint',
  proxy_likely: 'Proxy likely',
};

export const RISK_DETAILS: Readonly<Record<ProviderRisk, string>> = {
  browser_friendly: 'Calls work straight from this page.',
  mixed: 'Some accounts and endpoints refuse browser calls (CORS).',
  proxy_likely: 'The provider usually refuses browser calls (CORS). Expect to pick another provider or point at your own endpoint.',
};

export const AI_PROVIDERS: readonly AiProviderDefinition[] = Object.freeze([
  {
    id: 'gemini', label: 'Gemini', wire: 'google',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-2.5-flash-lite',
    keyPlaceholder: 'AIzaSy...', keyPattern: '^AIza', needsKey: true,
    consoleUrl: 'https://aistudio.google.com/app/apikey', consoleName: 'Google AI Studio',
    logoPath: '/logos/Gemini.svg', risk: 'browser_friendly',
    hint: 'Browser-ready. Create a key in Google AI Studio.',
  },
  {
    id: 'openai', label: 'OpenAI', wire: 'openai',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-5-mini',
    keyPlaceholder: 'sk-...', keyPattern: '^sk-', needsKey: true,
    consoleUrl: 'https://platform.openai.com/api-keys', consoleName: 'OpenAI Platform',
    logoPath: '/logos/Openai.svg', risk: 'mixed',
    hint: 'Project keys start with sk-.',
    // GPT-5 and the o-series reject `max_tokens`; older chat models accept both.
    maxTokensParam: 'max_completion_tokens',
  },
  {
    id: 'claude', label: 'Claude', wire: 'anthropic',
    defaultBaseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-sonnet-4-6',
    keyPlaceholder: 'sk-ant-...', keyPattern: '^sk-ant-', needsKey: true,
    consoleUrl: 'https://console.anthropic.com/settings/keys', consoleName: 'Anthropic Console',
    logoPath: '/logos/claude.svg', risk: 'mixed',
    hint: 'Browser calls need the direct-browser-access header — OpenFlowKit sends it.',
  },
  {
    id: 'groq', label: 'Groq', wire: 'openai',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'openai/gpt-oss-120b',
    keyPlaceholder: 'gsk_...', keyPattern: '^gsk_', needsKey: true,
    consoleUrl: 'https://console.groq.com/keys', consoleName: 'Groq Console',
    logoPath: '/logos/Groq.svg', risk: 'proxy_likely',
    hint: 'Low latency. May refuse browser calls.',
  },
  {
    id: 'nvidia', label: 'NVIDIA', wire: 'openai',
    defaultBaseUrl: 'https://integrate.api.nvidia.com/v1',
    defaultModel: 'meta/llama-4-maverick-17b-128e-instruct',
    keyPlaceholder: 'nvapi-...', keyPattern: '^nvapi-', needsKey: true,
    consoleUrl: 'https://build.nvidia.com', consoleName: 'NVIDIA Build',
    logoPath: '/logos/Nvidia.svg', risk: 'proxy_likely',
    hint: 'May refuse browser calls.',
  },
  {
    id: 'cerebras', label: 'Cerebras', wire: 'openai',
    defaultBaseUrl: 'https://api.cerebras.ai/v1',
    defaultModel: 'gpt-oss-120b',
    keyPlaceholder: 'csk-...', keyPattern: '^csk-', needsKey: true,
    consoleUrl: 'https://cloud.cerebras.ai', consoleName: 'Cerebras Cloud',
    logoPath: '/logos/cerebras.svg', risk: 'mixed',
    hint: 'Fast inference. Browser support varies by account.',
  },
  {
    id: 'mistral', label: 'Mistral', wire: 'openai',
    defaultBaseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-large-latest',
    keyPlaceholder: 'your-mistral-key...', keyPattern: '', needsKey: true,
    consoleUrl: 'https://console.mistral.ai/api-keys', consoleName: 'Mistral Console',
    logoPath: '/logos/Mistral.svg', risk: 'mixed',
    hint: 'European models. Browser calls are allowed with a valid key.',
  },
  {
    id: 'openrouter', label: 'OpenRouter', wire: 'openai',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'google/gemini-2.5-pro',
    keyPlaceholder: 'sk-or-v1-...', keyPattern: '^sk-or-', needsKey: true,
    consoleUrl: 'https://openrouter.ai/settings/keys', consoleName: 'OpenRouter Dashboard',
    logoPath: '/logos/openrouter.svg', risk: 'browser_friendly',
    hint: 'One key for OpenAI, Anthropic, Google and more.',
    extraHeaders: Object.freeze({ 'HTTP-Referer': 'https://openflowkit.com', 'X-Title': 'OpenFlowKit' }),
  },
  {
    id: 'ollama', label: 'Ollama (local)', wire: 'openai',
    defaultBaseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    keyPlaceholder: 'leave blank', keyPattern: '', needsKey: false,
    consoleUrl: 'https://ollama.com/download', consoleName: 'Ollama',
    logoPath: '/logos/ollama.svg', risk: 'browser_friendly',
    hint: "Local daemon. Start it with OLLAMA_ORIGINS='*' ollama serve.",
  },
  {
    id: 'custom', label: 'Custom', wire: 'openai',
    defaultBaseUrl: '',
    defaultModel: '',
    keyPlaceholder: 'your-api-key', keyPattern: '', needsKey: true,
    consoleUrl: '', consoleName: '',
    logoPath: '/logos/custom.svg', risk: 'mixed',
    hint: 'Any OpenAI-compatible /chat/completions endpoint.',
  },
]);

export function providerById(id: AiProviderId): AiProviderDefinition {
  const found = AI_PROVIDERS.find((provider) => provider.id === id);
  if (!found) throw new Error(`unknown AI provider "${id}"`);
  return found;
}

/** Whether this provider has everything it needs to attempt a call. */
export function isConfigured(
  definition: AiProviderDefinition,
  config: { readonly apiKey: string; readonly baseUrl: string; readonly model: string },
): boolean {
  if (definition.needsKey && !config.apiKey.trim()) return false;
  if (!definition.defaultBaseUrl && !config.baseUrl.trim()) return false;
  if (!definition.defaultModel && !config.model.trim()) return false;
  return true;
}
