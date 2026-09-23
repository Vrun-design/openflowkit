// The assistant conversation for one document: its chats (kept on this
// machine, per document), one streamed reply at a time, and the hand-off of a
// reply's diagram changes to the proposal review. With tools the reply is a
// multi-step agent run (assistantAgent); without, the model writes ```openflow
// blocks. Owns no rendering and no document state.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { OpCapabilities } from '../../../agent/ops/types';
import type { CompileResult } from '../../../dsl/compile';
import { runAssistantAgent, type AgentStep } from '../../application/ai/assistantAgent';
import { assistantContext } from '../../application/ai/assistantContext';
import {
  assistantSystemPrompt, buildAssistantMessages, parseAssistantReply, type AssistantBlock, type AssistantTurn,
} from '../../application/ai/assistantPrompt';
import { assistantToolkit } from '../../application/ai/assistantTools';
import type { SceneDocumentV1, ScenePage } from '../../domain/document/types';
import { AiProviderError, createProvider, type AiMessage, type AiTurn } from '../../../services/ai/provider';
import {
  chatList, messagesOf, readChatStore, serializeChatStore, writeChat,
  type AssistantScope, type ChatImage, type ChatMessage, type ChatStore,
} from './assistantChats';
import { activeConnection, type useV2AiSettings } from './useV2AiSettings';
import type { useV2Proposal } from './useV2Proposal';

export type { AssistantScope, ChatImage, ChatMessage } from './assistantChats';

/** What the reply is doing right now, for the status line. */
export type AssistantActivity = 'idle' | 'waiting' | 'streaming' | 'building' | 'fixing';

export interface V2AssistantOptions {
  readonly documentId: string | null;
  readonly page: ScenePage | null;
  readonly selectedIds: readonly string[];
  readonly settings: ReturnType<typeof useV2AiSettings>['settings'];
  readonly proposal: Pick<ReturnType<typeof useV2Proposal>, 'propose' | 'apply' | 'discard' | 'proposal' | 'phase'>;
  readonly loadGrammar: () => Promise<string>;
  readonly undo: () => void;
  /** What the agent's tools read and validate with; absent, the model writes blocks instead. */
  readonly tools?: {
    readonly document: SceneDocumentV1 | null;
    readonly capabilities: Pick<OpCapabilities, 'syntax' | 'searchIcons'>;
    readonly compile: (dsl: string) => Promise<CompileResult>;
  };
  /** After a proposal lands, so the host can bring it into view. */
  readonly onApplied?: () => void;
  readonly announce: (message: string) => void;
}

const STORE = 'openflowkit-v2-assistant:';
const THINK = 'openflowkit-v2-assistant-think';
const HISTORY_TURNS = 12;
// Characters of diagram text sent inline when the model can read the rest itself.
const INLINE_DSL = 12_000;

const mint = (): string => crypto.randomUUID();

function load(documentId: string | null): ChatStore {
  let raw: string | null = null;
  try { raw = documentId ? localStorage.getItem(STORE + documentId) : null; } catch { raw = null; }
  return readChatStore(raw, mint);
}

function readThink(): boolean {
  try { return localStorage.getItem(THINK) !== 'off'; } catch { return true; }
}

const upsertStep = (steps: readonly AgentStep[] | undefined, step: AgentStep): AgentStep[] => {
  const list = [...(steps ?? [])];
  const index = list.findIndex(({ id }) => id === step.id);
  if (index < 0) list.push(step); else list[index] = step;
  return list;
};

const toAi = (turns: readonly AssistantTurn[]): AiMessage[] => turns.map((turn) => (turn.role === 'user'
  ? { role: 'user', content: turn.text, ...(turn.images?.length ? { images: turn.images } : {}) }
  : { role: 'assistant', content: turn.text }));

const turnOf = ({ role, text, images }: ChatMessage): AssistantTurn => {
  const kept = images?.filter(({ data }) => data).map(({ mediaType, data }) => ({ mediaType, data })) ?? [];
  return { role, text, ...(kept.length ? { images: kept } : {}) };
};

export function useV2Assistant(options: V2AssistantOptions) {
  const [store, setStore] = useState<ChatStore>(() => load(options.documentId));
  const [activity, setActivity] = useState<AssistantActivity>('idle');
  const [think, setThinkState] = useState(readThink);
  const abortRef = useRef<AbortController | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const storeRef = useRef(store);
  storeRef.current = store;
  const thinkRef = useRef(think);
  thinkRef.current = think;
  // Provider+model pairs that refused tools this visit; they get the block prompt.
  const noTools = useRef(new Set<string>());
  const loadedFor = useRef(options.documentId);
  const messages = messagesOf(store);
  const busy = activity !== 'idle';

  useEffect(() => {
    if (loadedFor.current === options.documentId) return;
    loadedFor.current = options.documentId;
    abortRef.current?.abort();
    setStore(load(options.documentId));
  }, [options.documentId]);

  // Saved once a reply settles, not per streamed token; lighter copies when the quota is tight.
  useEffect(() => {
    if (!options.documentId || busy) return;
    const key = STORE + options.documentId;
    try {
      if (!store.chats.some(({ messages: list }) => list.length)) { localStorage.removeItem(key); return; }
    } catch { return; }
    for (const json of serializeChatStore(store)) {
      try { localStorage.setItem(key, json); return; } catch { /* over quota: try the lighter copy */ }
    }
  }, [store, busy, options.documentId]);

  const setThread = useCallback((chatId: string, next: readonly ChatMessage[]) => {
    setStore((current) => writeChat(current, chatId, next));
  }, []);

  /** Patches a message wherever it lives, so a reply lands in its own chat. */
  const patch = useCallback((id: string, change: Partial<ChatMessage> | ((message: ChatMessage) => Partial<ChatMessage>)) => {
    setStore((current) => ({
      ...current,
      chats: current.chats.map((chat) => (chat.messages.some((message) => message.id === id) ? {
        ...chat,
        messages: chat.messages.map((message) => (message.id === id
          ? { ...message, ...(typeof change === 'function' ? change(message) : change) } : message)),
      } : chat)),
    }));
  }, []);

  /** Answers the last message of `thread` (a user turn) in chat `chatId`. */
  const run = useCallback(async (chatId: string, thread: readonly ChatMessage[]) => {
    const { settings, page, selectedIds, loadGrammar, proposal, announce, tools } = optionsRef.current;
    const user = thread[thread.length - 1];
    if (!user || user.role !== 'user' || !page) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const id = mint();
    const started = performance.now();
    let firstText = 0;
    setThread(chatId, [...thread, { id, role: 'assistant', text: '', status: 'streaming' }]);
    setActivity('waiting');
    try {
      const connection = activeConnection(settings);
      const provider = createProvider({
        provider: settings.provider, apiKey: connection.apiKey,
        ...(connection.baseUrl.trim() ? { baseUrl: connection.baseUrl } : {}),
        ...(connection.model.trim() ? { model: connection.model } : {}),
      });
      patch(id, { model: provider.model, provider: provider.id });
      const scope = user.scope ?? 'page';
      const context = assistantContext(page, selectedIds, scope);
      const history = thread.slice(0, -1)
        .filter(({ role, status, text, images }) => (text.trim() || images?.length) && (role === 'user' || status === 'done' || status === 'stopped'))
        .slice(-HISTORY_TURNS).map(turnOf);
      const grammar = await loadGrammar();

      let roundText = false;
      const onDelta = ({ text, thinking }: { text?: string; thinking?: string }) => {
        if (text) {
          if (!firstText) firstText = performance.now();
          roundText = true;
          setActivity((current) => (current === 'fixing' ? current : 'streaming'));
          patch(id, (message) => ({ text: message.text + text }));
        }
        if (thinking) patch(id, (message) => ({ thinking: (message.thinking ?? '') + thinking }));
      };
      // Free tiers answer 503/429 under load; one quiet retry per round before it streamed.
      const ask = async (call: () => Promise<AiTurn>): Promise<AiTurn> => {
        roundText = false;
        try {
          return await call();
        } catch (caught) {
          // A 400 is the request itself (no tools, no vision): asking again cannot help.
          if (!(caught instanceof AiProviderError) || !caught.retryable || caught.status === 400 || roundText || controller.signal.aborted) throw caught;
          await new Promise((resolve) => setTimeout(resolve, 2500));
          if (controller.signal.aborted) throw new DOMException('Stopped', 'AbortError');
          return call();
        }
      };
      const request = { thinking: thinkRef.current, signal: controller.signal, onDelta };
      const toolKey = `${provider.id}:${provider.model}`;
      let text = '';
      let blocks: readonly AssistantBlock[] | null = null;

      if (tools?.document && !noTools.current.has(toolKey)) {
        const toolkit = assistantToolkit({
          document: tools.document, pageId: page.id, inScope: new Set(context.frames.map((frame) => frame.id)),
          capabilities: tools.capabilities, compile: tools.compile,
        });
        const system = assistantSystemPrompt(grammar, { tools: true });
        const turns = buildAssistantMessages(history, turnOf(user), context, INLINE_DSL);
        let stepped = false;
        try {
          const result = await runAssistantAgent({
            messages: toAi(turns), toolkit, signal: controller.signal,
            respond: (conversation, round) => {
              if (round > 0) setActivity('waiting');
              return ask(() => provider.respond({ ...request, system, messages: conversation, tools: toolkit.tools }));
            },
            onStep: (step) => { stepped = true; patch(id, (message) => ({ steps: upsertStep(message.steps, step) })); },
            // What the model said before a tool call moves into the steps, where it happened in time.
            onNarration: (said, round) => patch(id, (message) => ({
              text: '', steps: upsertStep(message.steps, { id: `note:${round}`, tool: 'note', label: said, status: 'done' }),
            })),
          });
          text = result.text;
          // A block pasted in the reply never doubles a diagram a tool already drafted.
          const drafted = toolkit.blocks();
          const taken = new Set(drafted.map(({ frameId }) => frameId).filter(Boolean));
          blocks = [...drafted, ...parseAssistantReply(text).blocks.filter(({ frameId }) => !frameId || !taken.has(frameId))];
        } catch (caught) {
          // A model without tool support refuses the first request (400); fall back to blocks.
          if (!(caught instanceof AiProviderError) || caught.status !== 400 || stepped || firstText) throw caught;
          noTools.current.add(toolKey);
        }
      }
      if (blocks === null) {
        const system = assistantSystemPrompt(grammar);
        try {
          text = (await ask(() => provider.respond({ ...request, system, messages: toAi(buildAssistantMessages(history, turnOf(user), context)) }))).text;
        } catch (caught) {
          // Refused without tools too: the 400 was about something else (an image), so tools stay on.
          noTools.current.delete(toolKey);
          throw caught;
        }
        blocks = parseAssistantReply(text).blocks;
      }
      if (controller.signal.aborted) return;
      patch(id, (message) => ({ text, ...(message.thinking ? { thoughtMs: Math.round((firstText || performance.now()) - started) } : {}) }));

      if (!blocks.length) {
        patch(id, { status: 'done' });
        announce('The assistant replied.');
        return;
      }
      // Blocks may only replace diagrams in scope; an unknown id is a new diagram.
      const inScope = new Set(context.frames.map((frame) => frame.id));
      const onPage = new Set(page.nodes.map((node) => node.id));
      const allowed = blocks.flatMap((block) => {
        if (!block.frameId || inScope.has(block.frameId)) return [block];
        return onPage.has(block.frameId) ? [] : [{ ...block, frameId: null }];
      });
      const skipped = blocks.length - allowed.length;
      const skipNote = skipped ? `Skipped ${skipped} change${skipped === 1 ? '' : 's'} to diagrams outside the scope.` : undefined;
      if (!allowed.length) {
        patch(id, { status: 'done', ...(skipNote ? { note: skipNote } : {}) });
        return;
      }
      setActivity('building');
      // ponytail: tool writes compile once to validate and again here; one compile cache if layout gets slow.
      let result = await proposal.propose({ blocks: allowed, intent: user.text, source: `byok:${provider.id}`, scope });
      let fixed = false;
      if ('error' in result && result.compile) {
        // One repair round: show the model its compile errors, keep its prose.
        setActivity('fixing');
        const errors = result.error;
        const system = assistantSystemPrompt(grammar);
        const repair = (await ask(() => provider.respond({
          ...request, system, onDelta: undefined,
          messages: toAi([...buildAssistantMessages(history, turnOf(user), context), { role: 'assistant', text: text || '(diagram drafted with tools)' }, {
            role: 'user',
            text: `Your diagram text did not compile:\n${errors}\nReply with only the corrected \`\`\`openflow blocks, same targets.`,
          }]),
        }))).text;
        if (controller.signal.aborted) return;
        const again = parseAssistantReply(repair).blocks;
        if (again.length) {
          result = await proposal.propose({ blocks: again, intent: user.text, source: `byok:${provider.id}`, scope });
          fixed = 'id' in result;
        }
      }
      if ('error' in result) {
        patch(id, { status: 'error', error: `Could not build the diagram. ${result.error}` });
        return;
      }
      const note = [fixed ? 'Fixed a syntax error in the first draft.' : '', skipNote ?? ''].filter(Boolean).join(' ');
      patch(id, { status: 'done', proposalId: result.id, ...(note ? { note } : {}) });
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') {
        patch(id, (message) => ({
          status: 'stopped',
          ...(message.steps ? { steps: message.steps.map((step) => (step.status === 'running' ? { ...step, status: 'error' as const, detail: 'stopped' } : step)) } : {}),
        }));
        return;
      }
      const message = caught instanceof Error ? caught.message : String(caught);
      const imageHint = caught instanceof AiProviderError && caught.status === 400 && thread.some(({ images }) => images?.length)
        ? ' This model may not accept images — try one that does, or remove them.' : '';
      patch(id, { status: 'error', error: message + imageHint });
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setActivity('idle');
      }
    }
  }, [patch, setThread]);

  const send = useCallback((text: string, scope: AssistantScope, images: readonly ChatImage[] = []) => {
    if ((!text.trim() && !images.length) || abortRef.current) return;
    const { active } = storeRef.current;
    void run(active, [...messagesOf(storeRef.current), {
      id: mint(), role: 'user', text: text.trim(), scope, ...(images.length ? { images } : {}),
    }]);
  }, [run]);

  /** Re-asks the user turn before `assistantId`, dropping everything after it. */
  const retry = useCallback((assistantId: string) => {
    const thread = messagesOf(storeRef.current);
    const index = thread.findIndex(({ id }) => id === assistantId);
    if (index < 1 || abortRef.current) return;
    void run(storeRef.current.active, thread.slice(0, index));
  }, [run]);

  /** Replaces a user turn and asks again; the turns after it are dropped. */
  const edit = useCallback((userId: string, text: string) => {
    const thread = messagesOf(storeRef.current);
    const index = thread.findIndex(({ id }) => id === userId);
    if (index < 0 || abortRef.current) return;
    if (!text.trim() && !thread[index]!.images?.length) return;
    void run(storeRef.current.active, [...thread.slice(0, index), { ...thread[index]!, text: text.trim() }]);
  }, [run]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  /** Records what happened to the live proposal on the reply that made it, in whichever chat. */
  const markLive = useCallback((outcome: NonNullable<ChatMessage['outcome']>) => {
    const live = optionsRef.current.proposal.proposal?.id;
    const target = live && storeRef.current.chats.flatMap((chat) => chat.messages).find(({ proposalId }) => proposalId === live);
    if (target) patch(target.id, { outcome });
  }, [patch]);

  /** Leaving the open chat stops its reply and drops its pending review, so no ghost is left on the canvas. */
  const leave = useCallback(() => {
    abortRef.current?.abort();
    const { proposal } = optionsRef.current;
    if (proposal.phase === 'ready' || proposal.phase === 'stale') markLive('discarded');
    proposal.discard();
  }, [markLive]);

  /** Opens a fresh chat; the one before it stays in the history. */
  const newChat = useCallback(() => {
    if (!messagesOf(storeRef.current).length) return;
    leave();
    setStore((current) => ({ ...current, active: mint() }));
  }, [leave]);

  const openChat = useCallback((chatId: string) => {
    if (chatId === storeRef.current.active) return;
    leave();
    setStore((current) => ({ ...current, active: chatId }));
  }, [leave]);

  const deleteChat = useCallback((chatId: string) => {
    if (chatId === storeRef.current.active) leave();
    setStore((current) => ({
      active: current.active === chatId ? mint() : current.active,
      chats: current.chats.filter(({ id }) => id !== chatId),
    }));
  }, [leave]);

  const apply = useCallback(async () => {
    if (!(await optionsRef.current.proposal.apply())) return;
    markLive('applied');
    optionsRef.current.onApplied?.();
  }, [markLive]);
  const discard = useCallback(() => {
    markLive('discarded');
    optionsRef.current.proposal.discard();
  }, [markLive]);
  const undo = useCallback(() => {
    markLive('undone');
    optionsRef.current.undo();
  }, [markLive]);

  const setThink = useCallback((on: boolean) => {
    setThinkState(on);
    try { localStorage.setItem(THINK, on ? 'on' : 'off'); } catch { /* per-visit only */ }
  }, []);

  const chats = useMemo(() => chatList(store), [store]);

  return {
    messages, chats, activeChatId: store.active, activity, busy, think, setThink,
    send, retry, edit, stop, newChat, openChat, deleteChat, apply, discard, undo,
  };
}
