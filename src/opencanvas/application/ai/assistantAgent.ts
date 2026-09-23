// The multi-step turn: ask the model, run the tools it calls, hand the results
// back, repeat until it answers without tools. Every step is reported so the
// user watches the agent work. Pure: the host supplies `respond` (provider,
// streaming, retries) and the toolkit.
import type { AiMessage, AiTurn } from '../../../services/ai/provider';
import type { AssistantToolkit } from './assistantTools';

export interface AgentStep {
  readonly id: string;
  readonly tool: string;
  readonly label: string;
  readonly detail?: string;
  readonly status: 'running' | 'done' | 'error';
}

export interface AgentRunOptions {
  readonly messages: readonly AiMessage[];
  readonly toolkit: AssistantToolkit;
  /** One model round with these messages and the toolkit's tools. */
  readonly respond: (messages: readonly AiMessage[], round: number) => Promise<AiTurn>;
  /** A step started (status running) or settled; same id both times. */
  readonly onStep: (step: AgentStep) => void;
  /** Text the model wrote before calling tools ("Let me look first"); the reply is the last round's text. */
  readonly onNarration?: (text: string, round: number) => void;
  readonly signal?: AbortSignal;
  readonly maxRounds?: number;
}

// ponytail: fixed cap; free tiers allow ~10 requests a minute, so a long plan should ask, not loop.
export const MAX_ROUNDS = 8;
const WRAP_UP = 'Step limit reached. Answer the user now without calling more tools.';

const aborted = (signal?: AbortSignal): void => {
  if (signal?.aborted) throw new DOMException('Stopped', 'AbortError');
};

/** Resolves to the last round's text; earlier text goes to `onNarration`. Tool calls past the cap are dropped. */
export async function runAssistantAgent(options: AgentRunOptions): Promise<{ readonly text: string; readonly rounds: number }> {
  const { toolkit, respond, onStep, onNarration, signal, maxRounds = MAX_ROUNDS } = options;
  const messages: AiMessage[] = [...options.messages];
  for (let round = 0; ; round += 1) {
    aborted(signal);
    const turn = await respond(messages, round);
    if (!turn.toolCalls.length || round + 1 >= maxRounds) return { text: turn.text.trim(), rounds: round + 1 };
    if (turn.text.trim()) onNarration?.(turn.text.trim(), round);
    messages.push({ role: 'assistant', content: turn.text, toolCalls: turn.toolCalls, replay: turn.replay });
    const results = [];
    for (const [index, call] of turn.toolCalls.entries()) {
      aborted(signal);
      const id = `${round}:${index}:${call.name}`;
      onStep({ id, tool: call.name, label: call.name.replace(/_/g, ' '), status: 'running' });
      const outcome = await toolkit.run(call);
      onStep({ id, tool: call.name, label: outcome.label, ...(outcome.detail ? { detail: outcome.detail } : {}), status: outcome.isError ? 'error' : 'done' });
      results.push({ callId: call.id, name: call.name, content: outcome.content, ...(outcome.isError ? { isError: true } : {}) });
    }
    if (round + 2 >= maxRounds) {
      const last = results[results.length - 1]!;
      results[results.length - 1] = { ...last, content: `${last.content}\n\n${WRAP_UP}` };
    }
    messages.push({ role: 'tool', results });
  }
}
