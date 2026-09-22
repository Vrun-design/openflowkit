// Failure classification for provider calls. Pure typing and prose: given what
// happened, name the cause and the user's next action. The provider's response
// body is read for classification only — it is never repeated to the user,
// because OpenAI's 401 quotes the key back.
import type { AiProviderDefinition } from './providers';

export type AiFailureCause =
  | 'bad-key' | 'bad-model' | 'rate-limited' | 'provider-down'
  | 'blocked-by-browser' | 'offline' | 'bad-response'
  /** Setup is incomplete (missing key, endpoint or model) — caught before any request. */
  | 'not-configured';

export const RETRYABLE: Readonly<Record<AiFailureCause, boolean>> = {
  'bad-key': false,
  'bad-model': false,
  'rate-limited': true,
  'provider-down': true,
  'blocked-by-browser': false,
  offline: true,
  'bad-response': true,
  'not-configured': false,
};

/** HTTP status plus body keywords decide the cause; the body never leaves this function. */
export function classifyStatus(status: number, bodyText: string): AiFailureCause {
  if (status === 401 || status === 403) return 'bad-key';
  if (status === 429) return 'rate-limited';
  if (status >= 500) return 'provider-down';
  if (status === 404) return 'bad-model';
  if (status === 400) {
    if (/api[ _-]?key|invalid key|unauthori[sz]ed|credential/i.test(bodyText)) return 'bad-key';
    if (/model/i.test(bodyText)) return 'bad-model';
    return 'bad-response';
  }
  return 'bad-response';
}

export interface FailureContext {
  readonly definition: AiProviderDefinition;
  readonly endpoint: string;
  readonly model: string;
  readonly status: number | null;
  /** Origin CSP blocked, when a SecurityPolicyViolationEvent named one. */
  readonly blockedOrigin?: string;
  /** Where this page is served from; the Ollama fix names it exactly. */
  readonly pageOrigin?: string;
  readonly timedOut?: boolean;
}

const consoleLine = (definition: AiProviderDefinition): string =>
  definition.consoleUrl ? ` Check it at ${definition.consoleName}: ${definition.consoleUrl}` : ' Check the key this endpoint expects.';

/** The origin part of a URL; falls back to the string when it is not a URL. */
export const originOf = (url: string): string => {
  try { return new URL(url).origin; } catch { return url; }
};

/** One sentence naming the cause, one naming the action. */
export function describeCause(cause: AiFailureCause, context: FailureContext): string {
  const { definition } = context;
  switch (cause) {
    case 'bad-key':
      return `The provider rejected the key${context.status ? ` (${context.status})` : ''}.${consoleLine(definition)}`;
    case 'bad-model':
      return `The provider did not find the model "${context.model}". Check the model id, and the base URL if you overrode it.`;
    case 'rate-limited':
      return 'The provider is rate limiting this key (429). Wait a moment, or use a different key.';
    case 'provider-down':
      return context.timedOut
        ? `No answer from ${definition.label} within 30 seconds — the endpoint may be down. Try again.`
        : `The provider had a server error (${context.status}). Try again shortly.`;
    case 'blocked-by-browser': {
      if (context.blockedOrigin) {
        return `Our page's security policy blocked ${context.blockedOrigin}. Endpoints must be https:// (or localhost) — check the base URL.`;
      }
      if (definition.corsFix === 'ollama-origins') {
        return `Ollama refused the browser request. Restart it with OLLAMA_ORIGINS='${context.pageOrigin ?? '*'}' ollama serve, then test again.`;
      }
      if (definition.id === 'custom') {
        return `The browser could not reach ${originOf(context.endpoint)}. Check the endpoint is running and sends Access-Control-Allow-Origin for this page.`;
      }
      if (definition.risk === 'proxy_likely') {
        return `${definition.label} does not accept browser calls (CORS). Pick a browser-ready provider (Gemini, OpenRouter), or point at your own endpoint as a custom provider.`;
      }
      if (definition.risk === 'mixed') {
        return `The browser could not reach ${definition.label} — either it refuses browser calls (CORS) or the address is wrong. Check the base URL; Gemini and OpenRouter are browser-ready alternatives.`;
      }
      return `The browser could not reach ${definition.label}. The address looks wrong or the service is down — check the base URL.`;
    }
    case 'offline':
      return 'This browser is offline. Reconnect and try again.';
    case 'bad-response':
      return 'The provider answered in a shape OpenFlowKit could not read. Try again, or choose another model.';
    case 'not-configured':
      return 'This provider is not fully set up. Open the provider settings and fill in what is missing.';
  }
}
