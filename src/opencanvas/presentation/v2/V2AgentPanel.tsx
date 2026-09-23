// AI assistant panel for the v2 editor: a conversation. Replies stream in with
// their reasoning and the agent's steps; a reply that changes diagrams carries
// its review card. Users attach images, edit and resend their turns, retry,
// copy and report replies, pick the scope (selection or page), toggle thinking
// and reopen past chats. Composes design-system parts over useV2Assistant and
// useV2Proposal; owns no document state.
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  IconAlertTriangle, IconArrowLeft, IconArrowUp, IconBook, IconBulb, IconCheck, IconCopy, IconEye, IconFlag,
  IconHistory, IconIcons, IconListDetails, IconMessagePlus, IconPencil, IconPhoto, IconPhotoOff, IconPlayerStop,
  IconPlus, IconRefresh, IconSearch, IconSparkles, IconStack2, IconRoute, IconTarget, IconTrash, IconX,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import { AI_PROVIDERS } from '../../../services/ai/providers';
import { parseAssistantReply } from '../../application/ai/assistantPrompt';
import { assistantIssueUrl } from '../../application/ai/assistantReport';
import {
  AgentPanel, Button, Icon, IconButton, Kbd, ProposalBar, ProposalReview, type AgentMessage,
} from '../design-system';
import type { AgentStep } from '../../application/ai/assistantAgent';
import { MAX_IMAGES, prepareImage } from './assistantImages';
import { parseMarkdown, type MdInline } from './assistantMarkdown';
import { V2AiProviderDialog } from './V2AiProviderDialog';
import type { AssistantScope, ChatImage, ChatMessage, useV2Assistant } from './useV2Assistant';
import { activeConnection, type useV2AiSettings } from './useV2AiSettings';
import type { useV2Proposal } from './useV2Proposal';

interface V2AgentPanelProps {
  readonly assistant: ReturnType<typeof useV2Assistant>;
  readonly proposal: ReturnType<typeof useV2Proposal>;
  readonly aiSettings: ReturnType<typeof useV2AiSettings>;
  readonly currentRevision: number;
  readonly readOnly: boolean;
  /** Diagrams on the page, and how many hold the selection. */
  readonly diagramCount: number;
  readonly selectedDiagramCount: number;
  readonly onClose: () => void;
}

const BAR_LABELS = {
  working: 'Building…', ready: 'Proposal ready', stale: 'Document changed. Retry for a fresh proposal.',
  applied: 'Applied', accept: 'Apply', discard: 'Dismiss', cancel: 'Cancel', undo: 'Undo',
  failed: 'Could not apply. Nothing changed.',
};

const CREATE_STARTERS = [
  { icon: IconRoute, prompt: 'Map a user onboarding flow' },
  { icon: IconStack2, prompt: 'Sketch a three-tier web architecture' },
  { icon: IconSparkles, prompt: 'What kinds of diagrams can you make?' },
] as const;
const PAGE_STARTERS = [
  { icon: IconSearch, prompt: 'Explain this diagram in plain words' },
  { icon: IconBulb, prompt: 'Review this diagram: what is missing or unclear?' },
  { icon: IconRoute, prompt: 'Add error handling and retries' },
] as const;

const ACTIVITY: Record<string, string> = {
  building: 'Laying out the diagram', fixing: 'Fixing a syntax error', drafting: 'Drawing the diagram',
};
// ponytail: timed labels, not real progress; the provider reports no stages before the first token.
const WAITING = ['Reading the page', 'Thinking', 'Writing'] as const;
const WAITING_BLANK = ['Thinking', 'Writing'] as const;

/** Sparkle, shimmering label, three dots. While waiting, the label walks the stages. */
function Activity({ phase, reading }: { readonly phase: string; readonly reading: boolean }) {
  const [step, setStep] = useState(0);
  const steps = reading ? WAITING : WAITING_BLANK;
  useEffect(() => {
    if (phase !== 'waiting') return undefined;
    const timer = setInterval(() => setStep((current) => Math.min(current + 1, steps.length - 1)), 1600);
    return () => clearInterval(timer);
  }, [phase, steps.length]);
  const label = phase === 'waiting' ? steps[Math.min(step, steps.length - 1)] : ACTIVITY[phase];
  return (
    <p className="ofk-v2-activity" role="status">
      <span className="ofk-v2-activity-mark" aria-hidden="true"><Icon icon={IconSparkles} /></span>
      <span key={label} className="ofk-v2-shimmer">{label}</span>
      <span className="ofk-v2-dots" aria-hidden="true"><i /><i /><i /></span>
    </p>
  );
}

function Inline({ parts }: { readonly parts: readonly MdInline[] }) {
  return <>{parts.map((part, index) => {
    if (part.kind === 'code') return <code key={index}>{part.text}</code>;
    if (part.kind === 'strong') return <strong key={index}>{part.text}</strong>;
    if (part.kind === 'em') return <em key={index}>{part.text}</em>;
    if (part.kind === 'link') return <a key={index} href={part.href} target="_blank" rel="noreferrer noopener">{part.text}</a>;
    return <Fragment key={index}>{part.text}</Fragment>;
  })}</>;
}

function Markdown({ text }: { readonly text: string }) {
  return <div className="ofk-v2-md">{parseMarkdown(text).map((block, index) => {
    switch (block.kind) {
      case 'pre': return <pre key={index}><code>{block.text}</code></pre>;
      case 'h': return <h4 key={index} data-level={block.level}><Inline parts={block.inline} /></h4>;
      case 'ul': return <ul key={index}>{block.items.map((item, i) => <li key={i}><Inline parts={item} /></li>)}</ul>;
      case 'ol': return <ol key={index}>{block.items.map((item, i) => <li key={i}><Inline parts={item} /></li>)}</ol>;
      default: return <p key={index}>{block.lines.map((line, i) => <Fragment key={i}>{i ? <br /> : null}<Inline parts={line} /></Fragment>)}</p>;
    }
  })}</div>;
}

function CopyButton({ text, label = 'Copy' }: { readonly text: string; readonly label?: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(timer);
  }, [copied]);
  return <IconButton variant="quiet" label={copied ? 'Copied' : label}
    icon={<Icon icon={copied ? IconCheck : IconCopy} />}
    onClick={() => { void navigator.clipboard?.writeText(text).then(() => setCopied(true)); }} />;
}

function Thinking({ message, live }: { readonly message: ChatMessage; readonly live: boolean }) {
  if (!message.thinking) return null;
  const seconds = message.thoughtMs ? Math.max(1, Math.round(message.thoughtMs / 1000)) : 0;
  return (
    <details className="ofk-v2-thinking" open={live && !message.text ? true : undefined}>
      <summary data-live={live && !message.text ? '' : undefined}>
        <Icon icon={IconBulb} />{live && !message.text ? 'Thinking…' : seconds ? `Thought for ${seconds}s` : 'Thoughts'}
      </summary>
      <div className="ofk-v2-thinking-body"><Markdown text={message.thinking} /></div>
    </details>
  );
}

const STEP_ICONS: Record<string, TablerIcon> = {
  list_diagrams: IconListDetails, read_diagram: IconEye, get_syntax: IconBook,
  find_icons: IconIcons, update_diagram: IconPencil, add_diagram: IconPlus,
};

/** The agent's tool calls: open while it works, one summary line once done. */
function Steps({ steps, live }: { readonly steps: readonly AgentStep[] | undefined; readonly live: boolean }) {
  if (!steps?.length) return null;
  const running = steps.find(({ status }) => status === 'running');
  const failed = steps.filter(({ status }) => status === 'error').length;
  const summary = live && running ? `${running.label}…`
    : `${steps.length} ${steps.length === 1 ? 'step' : 'steps'}${failed ? ` · ${failed} retried` : ''}`;
  return (
    <details className="ofk-v2-steps" open={live || undefined}>
      <summary data-live={live && running ? '' : undefined}><Icon icon={IconListDetails} />{summary}</summary>
      <ol>
        {steps.map((step) => (
          <li key={step.id} data-status={step.status}>
            <Icon icon={STEP_ICONS[step.tool] ?? IconSparkles} />
            <span className="ofk-v2-step-label">{step.label}</span>
            {step.detail ? <span className="ofk-v2-step-detail">{step.detail}</span> : null}
            <span className="ofk-v2-step-state" aria-label={step.status === 'running' ? 'Running' : step.status === 'error' ? 'Needed a fix' : 'Done'}>
              {step.status === 'running' ? <i /> : <Icon icon={step.status === 'error' ? IconAlertTriangle : IconCheck} />}
            </span>
          </li>
        ))}
      </ol>
    </details>
  );
}

const imageUrl = ({ mediaType, data }: ChatImage): string => `data:${mediaType};base64,${data}`;

/** Images on a sent turn; one dropped to fit storage shows as a placeholder. */
function TurnImages({ images }: { readonly images: readonly ChatImage[] | undefined }) {
  if (!images?.length) return null;
  return (
    <div className="ofk-v2-turn-images">
      {images.map((image, index) => (image.data
        ? <img key={index} src={imageUrl(image)} alt={image.name || 'Attached image'} title={image.name} />
        : <span key={index} className="ofk-v2-image-gone" title="Not kept on this device to save space">
          <Icon icon={IconPhotoOff} />{image.name || 'Image'}
        </span>))}
    </div>
  );
}

const RELATIVE = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
function ago(time: number, now = Date.now()): string {
  const minutes = Math.round((time - now) / 60_000);
  if (Math.abs(minutes) < 1) return 'just now';
  if (Math.abs(minutes) < 60) return RELATIVE.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return RELATIVE.format(hours, 'hour');
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return RELATIVE.format(days, 'day');
  return new Date(time).toLocaleDateString();
}

/** Past chats for this document: open one, or delete it (a second click confirms). */
function ChatHistory({ chats, activeId, onOpen, onDelete, onClose }: {
  readonly chats: ReturnType<typeof useV2Assistant>['chats'];
  readonly activeId: string;
  readonly onOpen: (id: string) => void;
  readonly onDelete: (id: string) => void;
  readonly onClose: () => void;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const back = useRef<HTMLButtonElement>(null);
  useEffect(() => { back.current?.focus(); }, []);
  return (
    <nav className="ofk-v2-history" aria-label="Chats in this document"
      onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
      <header>
        <button ref={back} type="button" className="ofk-v2-history-back" onClick={onClose}>
          <Icon icon={IconArrowLeft} />Back to chat
        </button>
        <span>{chats.length} {chats.length === 1 ? 'chat' : 'chats'} in this document</span>
      </header>
      {chats.length ? <ul>
        {chats.map((chat) => (
          <li key={chat.id} data-active={chat.id === activeId || undefined}>
            <button type="button" className="ofk-v2-history-open" onClick={() => onOpen(chat.id)}
              aria-current={chat.id === activeId ? 'true' : undefined}>
              <span className="ofk-v2-history-title">{chat.title}</span>
              <span className="ofk-v2-history-meta">
                {chat.id === activeId ? 'Open · ' : ''}{ago(chat.updatedAt)} · {chat.count} {chat.count === 1 ? 'message' : 'messages'}
              </span>
            </button>
            {confirming === chat.id
              ? <Button variant="quiet" className="ofk-v2-history-confirm" autoFocus aria-label={`Confirm delete “${chat.title}”`} onClick={() => { setConfirming(null); onDelete(chat.id); }}
                onBlur={() => setConfirming(null)}>Delete</Button>
              : <IconButton variant="quiet" label={`Delete “${chat.title}”`} icon={<Icon icon={IconTrash} />}
                onClick={() => setConfirming(chat.id)} />}
          </li>
        ))}
      </ul> : <p className="ofk-v2-outcome">No chats yet. What you ask here is kept on this device, per document.</p>}
    </nav>
  );
}

/** Mounts per edit, so the draft always starts from the sent text. */
function EditTurn({ text, images, busy, onCancel, onResend }: {
  readonly text: string; readonly images: boolean; readonly busy: boolean; readonly onCancel: () => void; readonly onResend: (text: string) => void;
}) {
  const [draft, setDraft] = useState(text);
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { field.current?.focus(); field.current?.select(); }, []);
  return (
    <div className="ofk-v2-edit">
      <textarea ref={field} aria-label="Edit message" rows={2} value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); onResend(draft); }
          if (event.key === 'Escape') { event.stopPropagation(); onCancel(); }
        }} />
      <div>
        <span>Sending again replaces the replies below.</span>
        <Button variant="quiet" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" disabled={(!draft.trim() && !images) || busy} onClick={() => onResend(draft)}>Send</Button>
      </div>
    </div>
  );
}

function UserTurn({ message, busy, editing, onEdit, onCancel, onResend }: {
  readonly message: ChatMessage; readonly busy: boolean; readonly editing: boolean;
  readonly onEdit: () => void; readonly onCancel: () => void; readonly onResend: (text: string) => void;
}) {
  if (editing) return <EditTurn text={message.text} images={Boolean(message.images?.length)} busy={busy} onCancel={onCancel} onResend={onResend} />;
  return <>
    <TurnImages images={message.images} />
    {message.text ? <p className="ofk-v2-user-text">{message.text}</p> : null}
    <div className="ofk-v2-message-actions">
      {message.scope === 'selection' ? <span className="ofk-v2-scope-tag"><Icon icon={IconTarget} />Selection</span> : null}
      <CopyButton text={message.text} />
      <IconButton variant="quiet" label="Edit message" disabled={busy} icon={<Icon icon={IconPencil} />} onClick={onEdit} />
    </div>
  </>;
}

export function V2AgentPanel({
  assistant, proposal, aiSettings, currentRevision, readOnly, diagramCount, selectedDiagramCount, onClose,
}: V2AgentPanelProps) {
  const [draft, setDraft] = useState('');
  const [providerOpen, setProviderOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  // null follows the canvas: the selection when it holds a diagram, else the page.
  const [scopePick, setScopePick] = useState<AssistantScope | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [images, setImages] = useState<readonly ChatImage[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const files = useRef<HTMLInputElement>(null);
  const { configured, settings } = aiSettings;
  const { messages, busy, activity } = assistant;
  const modelLabel = activeConnection(settings).model || AI_PROVIDERS.find(({ id }) => id === settings.provider)!.defaultModel;
  const scope: AssistantScope = selectedDiagramCount === 0 ? 'page' : scopePick ?? 'selection';
  const scopeText = scope === 'selection'
    ? `${selectedDiagramCount} selected ${selectedDiagramCount === 1 ? 'diagram' : 'diagrams'}`
    : diagramCount ? `This page · ${diagramCount} ${diagramCount === 1 ? 'diagram' : 'diagrams'}` : 'This page';
  const live = proposal.proposal?.id;

  const send = (): void => {
    const prompt = draft.trim();
    if ((!prompt && !images.length) || busy || readOnly) return;
    if (!configured) { setProviderOpen(true); return; }
    setDraft('');
    setImages([]);
    setAttachError(null);
    setHistoryOpen(false);
    assistant.send(prompt, scope, images);
  };
  const attach = async (list: readonly File[]): Promise<void> => {
    const picked = list.filter((file) => file.type.startsWith('image/'));
    const room = MAX_IMAGES - images.length;
    setAttachError(picked.length < list.length ? 'Only images can be attached.'
      : picked.length > room ? `Up to ${MAX_IMAGES} images per message.` : null);
    const ready: ChatImage[] = [];
    for (const file of picked.slice(0, Math.max(0, room))) {
      try { ready.push(await prepareImage(file)); } catch (caught) { setAttachError(caught instanceof Error ? caught.message : String(caught)); }
    }
    if (ready.length) setImages((current) => [...current, ...ready].slice(0, MAX_IMAGES));
    input.current?.focus();
  };
  const openHistory = (open: boolean): void => {
    setHistoryOpen(open);
    if (!open) requestAnimationFrame(() => input.current?.focus());
  };
  const report = (message: ChatMessage): void => {
    const index = messages.findIndex(({ id }) => id === message.id);
    const prompt = [...messages.slice(0, index)].reverse().find(({ role }) => role === 'user')?.text ?? '';
    const steps = message.steps?.length ? `\n\nSteps:\n${message.steps.map(({ label, detail, status }) => `- ${label}${detail ? ` (${detail})` : ''}${status === 'error' ? ' [error]' : ''}`).join('\n')}` : '';
    window.open(assistantIssueUrl({
      prompt, reply: message.text + steps, provider: message.provider ?? settings.provider,
      model: message.model ?? modelLabel, ...(message.error ? { error: message.error } : {}),
    }), '_blank', 'noopener,noreferrer');
  };

  const review = (message: ChatMessage): ReactNode => {
    if (!message.proposalId) return null;
    const isLive = message.proposalId === live;
    if (isLive && (proposal.phase === 'ready' || proposal.phase === 'stale') && proposal.proposal) {
      const current = proposal.proposal;
      const label = current.scope.kind === 'selection' ? 'Scope: selected diagram' : 'Scope: this page';
      return <ProposalReview
        id={current.id} baseRevision={current.baseRevision}
        currentRevision={proposal.phase === 'stale' ? current.baseRevision + 1 : currentRevision}
        scopeLabel={readOnly ? `${label} · read-only` : label}
        changes={proposal.changes} decisions={proposal.decisions}
        onDecide={proposal.decide}
        onApply={readOnly ? async () => undefined : async () => { await assistant.apply(); }}
        onDiscard={assistant.discard} onHighlight={proposal.highlight}
        labels={readOnly ? { apply: 'Read-only' } : undefined} />;
    }
    if (isLive && proposal.phase === 'applied' && message.outcome !== 'undone') {
      return <ProposalBar view={{ phase: 'applied', summary: proposal.appliedSummary }} labels={BAR_LABELS}
        onAccept={async () => undefined} onDismiss={proposal.discard} onUndo={assistant.undo} />;
    }
    if (isLive && proposal.phase === 'failed') {
      return <p className="ofk-v2-outcome" data-tone="danger">{proposal.error ?? BAR_LABELS.failed}</p>;
    }
    const outcome = message.outcome === 'applied' ? 'Applied to the canvas'
      : message.outcome === 'undone' ? 'Applied, then undone'
        : message.outcome === 'discarded' ? 'Discarded' : 'Proposal expired — Retry for a fresh one';
    return <p className="ofk-v2-outcome" data-outcome={message.outcome ?? 'expired'}>
      {message.outcome === 'applied' ? <Icon icon={IconCheck} /> : null}{outcome}
    </p>;
  };

  const lastUser = [...messages].reverse().find(({ role }) => role === 'user');
  const thread: AgentMessage[] = messages.map((message) => {
    if (message.role === 'user') {
      return {
        id: message.id, role: 'user',
        content: <UserTurn message={message} busy={busy} editing={editingId === message.id}
          onEdit={() => setEditingId(message.id)} onCancel={() => setEditingId(null)}
          onResend={(text) => { setEditingId(null); if (configured) assistant.edit(message.id, text); else setProviderOpen(true); }} />,
      };
    }
    const streaming = message.status === 'streaming';
    const reply = parseAssistantReply(message.text);
    const stepRunning = message.steps?.some(({ status }) => status === 'running');
    const phase = !streaming || stepRunning ? null
      : activity === 'waiting' && message.thinking && !message.steps?.length ? null
        : activity !== 'streaming' && activity !== 'idle' ? activity
          : reply.drafting ? 'drafting' : null;
    const done = !streaming;
    return {
      id: message.id, role: 'agent',
      content: <div className="ofk-v2-reply" data-streaming={streaming || undefined}>
        <Thinking message={message} live={streaming} />
        <Steps steps={message.steps} live={streaming} />
        {reply.prose ? <Markdown text={reply.prose} /> : null}
        {phase ? <Activity phase={phase} reading={diagramCount > 0 && !message.steps?.length} /> : null}
        {!streaming && !reply.prose && !reply.blocks.length && !message.error && !message.proposalId
          ? <p className="ofk-v2-outcome">{message.status === 'stopped' ? 'Stopped.' : 'No reply.'}</p> : null}
        {message.status === 'stopped' && reply.prose ? <p className="ofk-v2-outcome">Stopped.</p> : null}
        {message.note ? <p className="ofk-v2-outcome">{message.note}</p> : null}
        {message.error ? <div className="ofk-v2-reply-error" role="alert">
          <p>{message.error}</p>
          <div className="ofk-v2-assistant-actions">
            <Button onClick={() => assistant.retry(message.id)} disabled={busy}><Icon icon={IconRefresh} />Retry</Button>
            <Button variant="quiet" onClick={() => setProviderOpen(true)}>Check provider</Button>
          </div>
        </div> : null}
      </div>,
      attachment: <>
        {review(message)}
        {done ? <div className="ofk-v2-message-actions" data-role="agent">
          <CopyButton text={reply.prose || message.text} label="Copy reply" />
          <IconButton variant="quiet" label="Retry" disabled={busy} icon={<Icon icon={IconRefresh} />} onClick={() => assistant.retry(message.id)} />
          <IconButton variant="quiet" label="Report on GitHub" icon={<Icon icon={IconFlag} />} onClick={() => report(message)} />
          {message.model ? <span className="ofk-v2-message-meta">{message.model}</span> : null}
        </div> : null}
      </>,
    };
  });

  const starters = diagramCount ? PAGE_STARTERS : CREATE_STARTERS;
  const closeProvider = (): void => {
    setProviderOpen(false);
    // The dialog unmounts rather than close()s, so the platform cannot return focus; hand it to the composer.
    requestAnimationFrame(() => input.current?.focus());
  };

  return (
    <>
      <AgentPanel
        title="AI assistant"
        onClose={onClose}
        className="ofk-v2-assistant-panel"
        data-status={busy ? 'connecting' : configured ? 'connected' : 'off'}
        tools={<>
          {assistant.chats.length ? <IconButton variant="quiet" label="Chat history" aria-pressed={historyOpen}
            icon={<Icon icon={IconHistory} />} onClick={() => openHistory(!historyOpen)} /> : null}
          {messages.length ? <IconButton variant="quiet" label="New chat" icon={<Icon icon={IconMessagePlus} />}
            onClick={() => { assistant.newChat(); setEditingId(null); setHistoryOpen(false); input.current?.focus(); }} /> : null}
          <button type="button" className="ofk-connection-badge ofk-v2-provider-badge"
            aria-label={configured ? `AI provider: ${modelLabel}. Change` : 'Connect an AI provider'}
            onClick={() => setProviderOpen(true)}>
            <span className="ofk-connection-dot" />{configured ? modelLabel : 'No provider'}
          </button>
        </>}
        messages={historyOpen ? [] : thread}
        empty={historyOpen ? <ChatHistory chats={assistant.chats} activeId={assistant.activeChatId}
          onOpen={(chatId) => { assistant.openChat(chatId); setEditingId(null); openHistory(false); }}
          onDelete={assistant.deleteChat} onClose={() => openHistory(false)} /> : <div className="ofk-v2-assistant-welcome">
          <div className="ofk-v2-assistant-hero" aria-hidden="true">
            <span className="ofk-v2-assistant-hero-prompt">Map onboarding</span>
            <span className="ofk-connection-hero-link"><i /><i /><i /></span>
            <span className="ofk-v2-assistant-hero-diagram">
              <span className="ofk-v2-assistant-mark"><Icon icon={IconSparkles} /></span>
              <i /><i /><i />
            </span>
          </div>
          <h3>{diagramCount ? 'Ask about this page, or change it.' : 'From a thought to a clear picture.'}</h3>
          <p className="ofk-connection-lede">
            {configured
              ? 'Talk it through, ask for a review, or describe a change. Edits arrive as proposals you approve.'
              : 'Bring your own key — Gemini, Claude, OpenAI, Ollama and six more — and describe the diagram you need.'}
          </p>
          {!configured ? <>
            <Button variant="primary" onClick={() => setProviderOpen(true)}><Icon icon={IconSparkles} />Connect a provider</Button>
            <span className="ofk-model-welcome-note">Your key stays on this machine.</span>
          </> : null}
          <h4 className="ofk-connection-heading">Try</h4>
          <ul className="ofk-v2-assistant-starters">
            {starters.map(({ icon, prompt }) =>
              <li key={prompt}><Button variant="quiet" onClick={() => { setDraft(prompt); input.current?.focus(); }}>
                <Icon icon={icon} />{prompt}
              </Button></li>)}
          </ul>
        </div>}
        composer={
          <div className="ofk-v2-prompt-box" data-busy={busy || undefined} data-dragging={dragging || undefined}
            onDragOver={(event) => {
              if (readOnly || !event.dataTransfer.types.includes('Files')) return;
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
            onDrop={(event) => {
              if (!event.dataTransfer.files.length) return;
              event.preventDefault();
              setDragging(false);
              void attach([...event.dataTransfer.files]);
            }}>
            {images.length ? <ul className="ofk-v2-attachments" aria-label="Attached images">
              {images.map((image, index) => (
                <li key={index}>
                  <img src={imageUrl(image)} alt={image.name || 'Attached image'} />
                  <IconButton variant="quiet" label={`Remove ${image.name || 'image'}`} icon={<Icon icon={IconX} />}
                    onClick={() => { setImages((current) => current.filter((_, at) => at !== index)); input.current?.focus(); }} />
                </li>
              ))}
            </ul> : null}
            {attachError ? <p className="ofk-v2-attach-error" role="alert">{attachError}</p> : null}
            <textarea ref={input} aria-label="Ask AI assistant" rows={2}
              placeholder={readOnly ? 'Read-only document' : messages.length ? 'Reply, or ask for a change…' : 'Ask, review, or describe a diagram…'}
              value={draft} disabled={readOnly}
              onChange={(event) => setDraft(event.target.value)}
              onPaste={(event) => {
                const pasted = [...event.clipboardData.files].filter((file) => file.type.startsWith('image/'));
                if (!pasted.length) return;
                event.preventDefault();
                void attach(pasted);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  send();
                } else if (event.key === 'Escape' && busy) {
                  event.stopPropagation();
                  assistant.stop();
                } else if (event.key === 'ArrowUp' && !draft && !images.length && lastUser && !busy && !historyOpen) {
                  event.preventDefault();
                  setEditingId(lastUser.id);
                }
              }} />
            <div>
              <input ref={files} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden
                aria-label="Attach images" data-testid="assistant-attach-input"
                onChange={(event) => { void attach([...(event.target.files ?? [])]); event.target.value = ''; }} />
              <IconButton variant="quiet" label="Attach images" disabled={readOnly || images.length >= MAX_IMAGES}
                icon={<Icon icon={IconPhoto} />} onClick={() => files.current?.click()} />
              <button type="button" className="ofk-v2-chip" data-active={scope === 'selection' || undefined}
                disabled={selectedDiagramCount === 0}
                aria-label={`Scope: ${scopeText}. ${selectedDiagramCount ? 'Switch scope' : 'Select a diagram to narrow the scope'}`}
                title={selectedDiagramCount ? 'Switch between the selection and the whole page' : 'Select a diagram to work on just that one'}
                onClick={() => setScopePick(scope === 'selection' ? 'page' : 'selection')}>
                <Icon icon={scope === 'selection' ? IconTarget : IconStack2} /><span>{scopeText}</span>
              </button>
              <button type="button" className="ofk-v2-chip" aria-pressed={assistant.think}
                data-active={assistant.think || undefined}
                title="Let the model reason before it answers. Slower, better on hard asks."
                onClick={() => assistant.setThink(!assistant.think)}>
                <Icon icon={IconBulb} />Think
              </button>
              <span className="ofk-v2-prompt-spacer" />
              {!busy && (draft.trim() || images.length) ? <span className="ofk-v2-prompt-hint"><Kbd keys="Enter" /></span> : null}
              {busy
                ? <IconButton variant="secondary" label="Stop" icon={<Icon icon={IconPlayerStop} />} onClick={assistant.stop} />
                : <IconButton variant="primary" label="Send prompt" disabled={readOnly || (!draft.trim() && !images.length)}
                  icon={<Icon icon={IconArrowUp} />} onClick={send} />}
            </div>
          </div>
        }
      />
      {providerOpen ? <V2AiProviderDialog open settings={settings}
        onSave={(next) => { aiSettings.save(next); }}
        onClose={closeProvider} /> : null}
    </>
  );
}
