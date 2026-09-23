// The provider call behind the assistant composer: prompt → text → DSL →
// proposal. Owns no UI and no document state; the panel drives it.
import { useCallback, useRef, useState } from 'react';
import { buildDslPrompt, detectFamily, extractDsl } from '../../application/ai/dslPrompt';
import { createProvider } from '../../../services/ai/provider';
import { activeConnection, type useV2AiSettings } from './useV2AiSettings';
import type { useV2Proposal } from './useV2Proposal';

export interface V2AiRequestOptions {
  readonly settings: ReturnType<typeof useV2AiSettings>['settings'];
  readonly proposal: Pick<ReturnType<typeof useV2Proposal>, 'requestDiagram'>;
  /** Loads the canonical grammar text (cached by the host). */
  readonly loadGrammar: () => Promise<string>;
  /** Text of the frame being replaced, when the user is editing one. */
  readonly currentDsl: () => string | undefined;
  readonly frameId: () => string | undefined;
  readonly announce: (message: string) => void;
}

export interface V2AiRequestState {
  readonly busy: boolean;
  readonly error: string | null;
  readonly lastModel: string;
  /** Prompt of the latest request; what Retry re-sends. */
  readonly lastPrompt: string;
  readonly ask: (prompt: string) => Promise<void>;
  readonly cancel: () => void;
  readonly clearError: () => void;
}

export function useV2AiRequest(options: V2AiRequestOptions): V2AiRequestState {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastModel, setLastModel] = useState('');
  const [lastPrompt, setLastPrompt] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
  }, []);

  const ask = useCallback(async (prompt: string) => {
    const { settings, proposal, loadGrammar, currentDsl, frameId, announce } = optionsRef.current;
    if (!prompt.trim() || busy) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setError(null);
    setLastPrompt(prompt);
    try {
      const connection = activeConnection(settings);
      const provider = createProvider({
        provider: settings.provider, apiKey: connection.apiKey,
        ...(connection.baseUrl.trim() ? { baseUrl: connection.baseUrl } : {}),
        ...(connection.model.trim() ? { model: connection.model } : {}),
      });
      setLastModel(provider.model);
      const grammar = await loadGrammar();
      const dsl = currentDsl();
      const { system, prompt: userPrompt } = buildDslPrompt({
        grammar, intent: prompt,
        ...(dsl ? { currentDsl: dsl } : {}),
        ...(detectFamily(dsl) ? { family: detectFamily(dsl)! } : {}),
      });
      const text = await provider.complete({ system, prompt: userPrompt, signal: controller.signal });
      if (controller.signal.aborted) return;
      await proposal.requestDiagram({
        dsl: extractDsl(text), intent: prompt, source: `byok:${provider.id}`,
        ...(frameId() ? { frameId: frameId()! } : {}),
      });
      announce(`${provider.model} proposed a diagram.`);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return;
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setBusy(false);
    }
  }, [busy]);

  return { busy, error, lastModel, lastPrompt, ask, cancel, clearError: () => setError(null) };
}
