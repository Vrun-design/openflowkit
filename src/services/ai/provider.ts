// BYOK provider clients. Three wire formats cover all ten catalogue entries
// (providers.ts): Anthropic messages, OpenAI chat completions, Google
// generateContent. Provider differences are read from the catalogue, not
// branched on here. Keys never leave this module's request headers: nothing is
// logged, stored or echoed — including provider error bodies, which can quote
// a key back at us.
import { providerById, type AiProviderDefinition, type AiProviderId } from './providers';
import { RETRYABLE, classifyStatus, describeCause, originOf, providerDetail, type AiFailureCause } from './diagnosis';

export interface AiProviderConfig {
  readonly provider: AiProviderId;
  readonly apiKey: string;
  /** Base URL override; the provider default applies when absent. */
  readonly baseUrl?: string;
  readonly model?: string;
}

/** An attached image, base64 without the `data:` prefix. */
export interface AiImage {
  readonly mediaType: string;
  readonly data: string;
}

/** A function the model may call; `parameters` is a JSON Schema object. */
export interface AiTool {
  readonly name: string;
  readonly description: string;
  readonly parameters: Readonly<Record<string, unknown>>;
}

export interface AiToolCall {
  readonly id: string;
  readonly name: string;
  readonly input: Readonly<Record<string, unknown>>;
}

export interface AiToolResult {
  readonly callId: string;
  readonly name: string;
  readonly content: string;
  readonly isError?: boolean;
}

export type AiMessage =
  | { readonly role: 'user'; readonly content: string; readonly images?: readonly AiImage[] }
  /** `replay` is the wire's own copy of the turn (thinking signatures, Gemini thought signatures); sent back as-is. */
  | { readonly role: 'assistant'; readonly content: string; readonly toolCalls?: readonly AiToolCall[]; readonly replay?: unknown }
  | { readonly role: 'tool'; readonly results: readonly AiToolResult[] };

/** A streamed piece of the reply: answer text, or the model's visible reasoning. */
export interface AiDelta {
  readonly text?: string;
  readonly thinking?: string;
}

/** One model turn: its text, the tools it called, and what to replay next round. */
export interface AiTurn {
  readonly text: string;
  readonly toolCalls: readonly AiToolCall[];
  readonly replay: unknown;
}

export interface AiCompletionRequest {
  readonly system: string;
  /** One user turn; `messages` wins when both are given. */
  readonly prompt?: string;
  readonly messages?: readonly AiMessage[];
  /** Output budget; the provider's `maxOutputTokens` when absent. */
  readonly maxTokens?: number;
  readonly signal?: AbortSignal;
  /**
   * Ask for reasoning: Claude gets a thinking budget, Gemini includes its
   * thoughts. OpenAI-wire providers stream reasoning when the model shares it.
   */
  readonly thinking?: boolean;
  /** Functions the model may call; `respond` reports the calls. */
  readonly tools?: readonly AiTool[];
  /** Streams the reply when set; `complete` still resolves to the whole text. */
  readonly onDelta?: (delta: AiDelta) => void;
}

export interface AiProvider {
  readonly id: AiProviderId;
  readonly model: string;
  readonly endpoint: string;
  /** The reply's text; fails when there is none. */
  complete(request: AiCompletionRequest): Promise<string>;
  /** The reply's text and tool calls; empty text is fine when tools were called. */
  respond(request: AiCompletionRequest): Promise<AiTurn>;
}

export class AiProviderError extends Error {
  /** Why it failed; drives `retryable` and the sentence the user reads. */
  readonly cause: AiFailureCause;
  readonly status: number | null;
  readonly retryable: boolean;
  /** The origin a CSP or CORS failure names, when known. */
  readonly origin?: string;

  constructor(message: string, details: { readonly cause: AiFailureCause; readonly status?: number | null; readonly origin?: string }) {
    super(message);
    this.name = 'AiProviderError';
    this.cause = details.cause;
    this.status = details.status ?? null;
    this.retryable = RETRYABLE[details.cause];
    if (details.origin) this.origin = details.origin;
  }
}

const trimSlash = (value: string): string => value.replace(/\/+$/, '');

const pageOrigin = (): string | undefined =>
  typeof location === 'undefined' ? undefined : location.origin;

const isOffline = (): boolean =>
  typeof navigator !== 'undefined' && navigator.onLine === false;

/**
 * A rejected cross-origin POST is almost always CORS or CSP, and the console
 * shows the same TypeError for both. A CSP block also fires
 * securitypolicyviolation, which the provider's CORS policy never does — that
 * event is the discriminator.
 */
function watchCspViolations(): { blocked: (url: string) => string | null; stop: () => void } {
  if (typeof document === 'undefined') return { blocked: () => null, stop: () => undefined };
  const violations: string[] = [];
  const record = (event: Event) => {
    const details = event as Partial<SecurityPolicyViolationEvent>;
    if (!String(details.effectiveDirective ?? '').startsWith('connect-src')) return;
    const blocked = String(details.blockedURI ?? '');
    if (blocked) violations.push(blocked);
  };
  document.addEventListener('securitypolicyviolation', record);
  return {
    blocked: (url) => violations.find((blockedUri) => originOf(blockedUri) === originOf(url)) ?? null,
    stop: () => document.removeEventListener('securitypolicyviolation', record),
  };
}

/**
 * CORS and a closed port throw the same TypeError. An opaque no-cors GET needs
 * no CORS headers, so it resolves whenever something listens at the origin.
 */
async function probe(url: string): Promise<boolean> {
  try {
    await fetch(originOf(url), { mode: 'no-cors', signal: AbortSignal.timeout(3000) });
    return true;
  } catch {
    return false;
  }
}

interface WireCall {
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly body: unknown;
  readonly definition: AiProviderDefinition;
  readonly model: string;
  readonly signal?: AbortSignal;
}

async function send({ url, headers, body, definition, model, signal }: WireCall): Promise<Response> {
  const csp = watchCspViolations();
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      ...(signal ? { signal } : {}),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') { csp.stop(); throw error; }
    // The violation report is queued as a task, so give it one before reading.
    await new Promise((resolve) => setTimeout(resolve, 0));
    const blockedOrigin = csp.blocked(url);
    csp.stop();
    const timedOut = error instanceof DOMException && error.name === 'TimeoutError';
    const cause: AiFailureCause = blockedOrigin ? 'blocked-by-browser'
      : timedOut ? 'provider-down'
        : isOffline() ? 'offline'
          : 'blocked-by-browser';
    const reachable = cause === 'blocked-by-browser' && !blockedOrigin ? await probe(url) : undefined;
    throw new AiProviderError(describeCause(cause, {
      definition, endpoint: url, model, status: null,
      ...(blockedOrigin ? { blockedOrigin } : {}),
      ...(reachable === undefined ? {} : { reachable }),
      ...(timedOut ? { timedOut: true } : {}),
      ...(pageOrigin() ? { pageOrigin: pageOrigin()! } : {}),
    }), { cause, ...(blockedOrigin ? { origin: blockedOrigin } : {}) });
  }
  csp.stop();
  if (!response.ok) {
    const bodyText = await response.text();
    const cause = classifyStatus(response.status, bodyText);
    const detail = providerDetail(bodyText, Object.values(headers));
    throw new AiProviderError(describeCause(cause, {
      definition, endpoint: url, model, status: response.status,
      ...(pageOrigin() ? { pageOrigin: pageOrigin()! } : {}),
    }) + (detail ? ` ${definition.label} said: “${detail}”` : ''), { cause, status: response.status });
  }
  return response;
}

function parseJson(text: string, call: WireCall, status: number): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new AiProviderError(describeCause('bad-response', { definition: call.definition, endpoint: call.url, model: call.model, status }), { cause: 'bad-response', status });
  }
}

/**
 * One wire's reading of a reply: `whole` takes a JSON body, `event` one SSE
 * payload; both return the deltas they found and keep what `finish` needs to
 * report tool calls. A streamed request that comes back as plain JSON
 * (proxies, stubs) is read whole. One reader per request: it holds state.
 */
interface WireReader {
  readonly whole: (payload: unknown) => AiDelta[];
  readonly event: (payload: unknown) => AiDelta[];
  readonly finish: () => { readonly toolCalls: AiToolCall[]; readonly replay: unknown };
}

async function exchange(call: WireCall, reader: WireReader, onDelta?: (delta: AiDelta) => void): Promise<AiTurn> {
  const response = await send(call);
  let text = '';
  const emit = (deltas: AiDelta[]) => {
    for (const delta of deltas) {
      if (!delta.text && !delta.thinking) continue;
      text += delta.text ?? '';
      onDelta?.(delta);
    }
  };
  const streamed = onDelta && response.body && (response.headers?.get('content-type') ?? '').includes('text/event-stream');
  if (!streamed) {
    emit(reader.whole(parseJson(await response.text(), call, response.status)));
    return { text, ...reader.finish() };
  }
  const stream = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const drain = (final: boolean) => {
    const lines = buffer.split(/\r?\n/);
    buffer = final ? '' : lines.pop() ?? '';
    for (const line of lines) {
      const data = line.startsWith('data:') ? line.slice(5).trim() : '';
      if (!data || data === '[DONE]') continue;
      emit(reader.event(parseJson(data, call, response.status)));
    }
  };
  for (;;) {
    const { done, value } = await stream.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    drain(false);
  }
  buffer += decoder.decode();
  drain(true);
  return { text, ...reader.finish() };
}

/** A tool call's arguments; unparseable JSON reads as none, and the tool's own validation says what is missing. */
function parseArgs(json: unknown): Record<string, unknown> {
  if (json && typeof json === 'object') return json as Record<string, unknown>;
  try { return asRecord(JSON.parse(String(json ?? '') || '{}')); } catch { return {}; }
}

/** Both provider entry points over one wire: `respond` for tool loops, `complete` for text. */
function entryPoints(respond: (request: AiCompletionRequest) => Promise<AiTurn>, definition: AiProviderDefinition) {
  return {
    async respond(request: AiCompletionRequest) {
      const turn = await respond(request);
      if (!turn.toolCalls.length) requireText(turn.text, definition);
      return turn;
    },
    async complete(request: AiCompletionRequest) {
      return requireText((await respond(request)).text, definition);
    },
  };
}

/** `prompt` is shorthand for one user turn. */
const turns = ({ messages, prompt }: AiCompletionRequest): readonly AiMessage[] =>
  messages ?? [{ role: 'user', content: prompt ?? '' }];

const dataUrl = ({ mediaType, data }: AiImage): string => `data:${mediaType};base64,${data}`;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function requireText(text: string, definition: AiProviderDefinition): string {
  if (text.trim()) return text;
  throw new AiProviderError(
    definition.wire === 'google'
      ? 'Gemini returned no text — it may have blocked the prompt. Rephrase it, or choose another model.'
      : 'The provider returned no text. Try again, or choose another model.',
    { cause: 'bad-response' },
  );
}

function anthropicMessage(message: AiMessage): unknown {
  if (message.role === 'tool') {
    return {
      role: 'user',
      content: message.results.map(({ callId, content, isError }) => ({ type: 'tool_result', tool_use_id: callId, content, ...(isError ? { is_error: true } : {}) })),
    };
  }
  if (message.role === 'assistant') {
    if (!message.toolCalls?.length) return { role: 'assistant', content: message.content };
    return {
      role: 'assistant',
      content: Array.isArray(message.replay) ? message.replay : [
        ...(message.content.trim() ? [{ type: 'text', text: message.content }] : []),
        ...message.toolCalls.map(({ id, name, input }) => ({ type: 'tool_use', id, name, input })),
      ],
    };
  }
  if (!message.images?.length) return { role: 'user', content: message.content };
  return {
    role: 'user',
    content: [
      ...message.images.map(({ mediaType, data }) => ({ type: 'image', source: { type: 'base64', media_type: mediaType, data } })),
      ...(message.content.trim() ? [{ type: 'text', text: message.content }] : []),
    ],
  };
}

/** Content blocks by index; tool input arrives as JSON fragments, thinking with a signature to replay. */
function anthropicReader(): WireReader {
  const blocks: Record<string, unknown>[] = [];
  const inputs: string[] = [];
  const read = (block: Record<string, unknown>): AiDelta => (block.type === 'text' ? { text: String(block.text ?? '') }
    : block.type === 'thinking' ? { thinking: String(block.thinking ?? '') } : {});
  return {
    whole: (payload) => {
      const content = asRecord(payload).content;
      if (Array.isArray(content)) blocks.push(...content.map((block) => ({ ...asRecord(block) })));
      return blocks.map(read);
    },
    event: (payload) => {
      const record = asRecord(payload);
      const index = Number(record.index ?? 0);
      if (record.type === 'content_block_start') {
        blocks[index] = { ...asRecord(record.content_block) };
        return [];
      }
      const delta = asRecord(record.delta);
      const block = (blocks[index] ??= {});
      const append = (key: string, value: unknown) => { block[key] = String(block[key] ?? '') + String(value ?? ''); };
      switch (delta.type) {
        case 'text_delta': append('text', delta.text); return [{ text: String(delta.text ?? '') }];
        case 'thinking_delta': append('thinking', delta.thinking); return [{ thinking: String(delta.thinking ?? '') }];
        case 'signature_delta': append('signature', delta.signature); return [];
        case 'input_json_delta': inputs[index] = (inputs[index] ?? '') + String(delta.partial_json ?? ''); return [];
        default: return [];
      }
    },
    finish: () => {
      inputs.forEach((json, index) => { if (blocks[index]) blocks[index]!.input = parseArgs(json); });
      const replay = blocks.filter((block) => block && !(block.type === 'text' && !String(block.text ?? '').trim()));
      const toolCalls = replay.filter(({ type }) => type === 'tool_use')
        .map((block) => ({ id: String(block.id ?? ''), name: String(block.name ?? ''), input: parseArgs(block.input) }));
      return { toolCalls, replay };
    },
  };
}

function createAnthropicProvider(definition: AiProviderDefinition, baseUrl: string, model: string, apiKey: string): AiProvider {
  const endpoint = `${baseUrl}/v1/messages`;
  return {
    id: definition.id, model, endpoint,
    ...entryPoints((request) => {
      const { system, maxTokens = definition.maxOutputTokens, signal, thinking, tools, onDelta } = request;
      // ponytail: fixed budget, a quarter of the output room; a per-request effort knob if users ask.
      const budget = Math.max(1024, Math.floor(maxTokens / 4));
      return exchange({
        url: endpoint, definition, model, signal,
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: {
          model, max_tokens: maxTokens, system,
          messages: turns(request).map(anthropicMessage),
          ...(tools?.length ? { tools: tools.map(({ name, description, parameters }) => ({ name, description, input_schema: parameters })) } : {}),
          ...(thinking && maxTokens > budget ? { thinking: { type: 'enabled', budget_tokens: budget } } : {}),
          ...(onDelta ? { stream: true } : {}),
        },
      }, anthropicReader(), onDelta);
    }, definition),
  };
}

function openAiMessages(message: AiMessage): unknown[] {
  if (message.role === 'tool') {
    return message.results.map(({ callId, content }) => ({ role: 'tool', tool_call_id: callId, content }));
  }
  if (message.role === 'assistant') {
    if (!message.toolCalls?.length) return [{ role: 'assistant', content: message.content }];
    // DeepSeek-style thinking wants its reasoning back inside a tool loop; others never send the field.
    const reasoning = asRecord(message.replay).reasoning_content;
    return [{
      role: 'assistant', content: message.content || null,
      tool_calls: message.toolCalls.map(({ id, name, input }) => ({ id, type: 'function', function: { name, arguments: JSON.stringify(input) } })),
      ...(typeof reasoning === 'string' && reasoning ? { reasoning_content: reasoning } : {}),
    }];
  }
  if (!message.images?.length) return [{ role: 'user', content: message.content }];
  return [{
    role: 'user',
    content: [
      ...(message.content.trim() ? [{ type: 'text', text: message.content }] : []),
      ...message.images.map((image) => ({ type: 'image_url', image_url: { url: dataUrl(image) } })),
    ],
  }];
}

/** Tool calls arrive by index, arguments as string fragments. */
function openAiReader(): WireReader {
  const calls: { id: string; name: string; args: string }[] = [];
  let reasoningContent = '';
  const first = (payload: unknown) => asRecord(Array.isArray(asRecord(payload).choices) ? (asRecord(payload).choices as unknown[])[0] : null);
  // DeepSeek-style servers name it reasoning_content, OpenRouter and Groq reasoning.
  const read = (message: Record<string, unknown>): AiDelta[] => {
    if (typeof message.reasoning_content === 'string') reasoningContent += message.reasoning_content;
    const toolCalls = message.tool_calls;
    if (Array.isArray(toolCalls)) {
      toolCalls.forEach((raw, position) => {
        const call = asRecord(raw);
        const fn = asRecord(call.function);
        const slot = (calls[typeof call.index === 'number' ? call.index : position] ??= { id: '', name: '', args: '' });
        if (call.id) slot.id = String(call.id);
        if (fn.name && !slot.name) slot.name = String(fn.name);
        if (fn.arguments !== undefined) slot.args += typeof fn.arguments === 'string' ? fn.arguments : JSON.stringify(fn.arguments);
      });
    }
    return [{ thinking: String(message.reasoning_content ?? message.reasoning ?? ''), text: String(message.content ?? '') }];
  };
  return {
    whole: (payload) => read(asRecord(first(payload).message)),
    event: (payload) => read(asRecord(first(payload).delta)),
    finish: () => ({
      toolCalls: calls.filter(Boolean).map(({ id, name, args }, index) => ({ id: id || `call_${index}`, name, input: parseArgs(args) })),
      replay: reasoningContent ? { reasoning_content: reasoningContent } : null,
    }),
  };
}

function createOpenAiProvider(definition: AiProviderDefinition, baseUrl: string, model: string, apiKey: string): AiProvider {
  const endpoint = `${baseUrl}/chat/completions`;
  const headers: Record<string, string> = { ...definition.extraHeaders };
  if (definition.needsKey) headers.authorization = `Bearer ${apiKey}`;
  const maxTokensParam = definition.maxTokensParam ?? 'max_tokens';
  return {
    id: definition.id, model, endpoint,
    ...entryPoints((request) => {
      const { system, maxTokens = definition.maxOutputTokens, signal, tools, onDelta } = request;
      return exchange({
        url: endpoint, definition, model, signal,
        headers,
        body: {
          model, [maxTokensParam]: maxTokens,
          messages: [{ role: 'system', content: system }, ...turns(request).flatMap(openAiMessages)],
          ...(tools?.length ? { tools: tools.map(({ name, description, parameters }) => ({ type: 'function', function: { name, description, parameters } })) } : {}),
          ...(onDelta ? { stream: true } : {}),
        },
      }, openAiReader(), onDelta);
    }, definition),
  };
}

// Gemini returns no call ids on some models; a minted one is never sent back.
const MINTED = 'gemini-call-';

function googleContent(message: AiMessage): unknown {
  if (message.role === 'tool') {
    return {
      role: 'user',
      parts: message.results.map(({ callId, name, content, isError }) => ({
        functionResponse: {
          name, response: isError ? { error: content } : { result: content },
          ...(callId.startsWith(MINTED) ? {} : { id: callId }),
        },
      })),
    };
  }
  if (message.role === 'assistant') {
    const parts = message.toolCalls?.length && Array.isArray(message.replay) ? message.replay : [
      ...(message.content ? [{ text: message.content }] : []),
      ...(message.toolCalls ?? []).map(({ name, input }) => ({ functionCall: { name, args: input } })),
    ];
    return { role: 'model', parts };
  }
  const parts = [
    ...(message.images ?? []).map(({ mediaType, data }) => ({ inlineData: { mimeType: mediaType, data } })),
    ...(message.content.trim() || !message.images?.length ? [{ text: message.content }] : []),
  ];
  return { role: 'user', parts };
}

/** Keeps the model's parts for replay: Gemini 3 rejects a function call sent back without its thoughtSignature. */
function googleReader(): WireReader {
  const parts: Record<string, unknown>[] = [];
  const keep = (part: Record<string, unknown>) => {
    const last = parts[parts.length - 1];
    // Streamed text comes in many parts; plain neighbours merge so the replay stays small.
    const plain = (candidate: Record<string, unknown>) => typeof candidate.text === 'string' && !candidate.thoughtSignature && !candidate.functionCall;
    if (last && plain(last) && plain(part) && Boolean(last.thought) === Boolean(part.thought)) {
      last.text = String(last.text) + String(part.text);
      return;
    }
    parts.push({ ...part });
  };
  const read = (payload: unknown): AiDelta[] => {
    const candidates = asRecord(payload).candidates;
    const raw = Array.isArray(candidates) ? asRecord(asRecord(candidates[0]).content).parts : [];
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((item) => {
      const part = asRecord(item);
      keep(part);
      if (part.functionCall) return [];
      const text = String(part.text ?? '');
      return [part.thought === true ? { thinking: text } : { text }];
    });
  };
  return {
    whole: read,
    event: read,
    finish: () => ({
      toolCalls: parts.filter(({ functionCall }) => functionCall).map(({ functionCall }, index) => {
        const call = asRecord(functionCall);
        return { id: call.id ? String(call.id) : `${MINTED}${index}`, name: String(call.name ?? ''), input: parseArgs(call.args) };
      }),
      // Thought summaries are for the reader; signatures and calls go back.
      replay: parts.filter((part) => part.thoughtSignature || part.functionCall || (part.thought !== true && String(part.text ?? '').length)),
    }),
  };
}

function createGoogleProvider(definition: AiProviderDefinition, baseUrl: string, model: string, apiKey: string): AiProvider {
  // ponytail: model ids with slashes are encoded; tuned-model resource names would need the full path — the override field is the escape hatch.
  const endpoint = `${baseUrl}/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  return {
    id: definition.id, model, endpoint,
    ...entryPoints((request) => {
      const { system, maxTokens = definition.maxOutputTokens, signal, thinking, tools, onDelta } = request;
      return exchange({
        url: onDelta ? endpoint.replace(/:generateContent$/, ':streamGenerateContent?alt=sse') : endpoint,
        definition, model, signal,
        headers: { 'x-goog-api-key': apiKey },
        body: {
          systemInstruction: { parts: [{ text: system }] },
          contents: turns(request).map(googleContent),
          ...(tools?.length ? { tools: [{ functionDeclarations: tools.map(({ name, description, parameters }) => ({ name, description, parameters })) }] } : {}),
          generationConfig: { maxOutputTokens: maxTokens, ...(thinking ? { thinkingConfig: { includeThoughts: true } } : {}) },
        },
      }, googleReader(), onDelta);
    }, definition),
  };
}

export function createProvider(config: AiProviderConfig): AiProvider {
  const definition = providerById(config.provider);
  const baseUrl = trimSlash(config.baseUrl?.trim() || definition.defaultBaseUrl);
  const model = config.model?.trim() || definition.defaultModel;
  const apiKey = config.apiKey.trim();
  if (definition.needsKey && !apiKey) {
    throw new AiProviderError('Add an API key in the provider settings.', { cause: 'not-configured' });
  }
  if (!baseUrl) throw new AiProviderError('Add the endpoint URL for this provider.', { cause: 'not-configured' });
  if (!model) throw new AiProviderError('Add a model id for this provider.', { cause: 'not-configured' });

  if (definition.wire === 'anthropic') return createAnthropicProvider(definition, baseUrl, model, apiKey);
  if (definition.wire === 'google') return createGoogleProvider(definition, baseUrl, model, apiKey);
  return createOpenAiProvider(definition, baseUrl, model, apiKey);
}
