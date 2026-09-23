import { useEffect, useRef, type ReactNode } from 'react';
import { Panel, type PanelProps } from './Panel';
export interface AgentMessage {
  id: string;
  role: 'user' | 'agent';
  /** Message body: plain text or host-rendered rich content. */
  content: ReactNode;
  /** Localized timestamp string; host formats. */
  at?: string;
  /** Attached proposal summary, review card or file chips. */
  attachment?: ReactNode;
}
export interface AgentPanelProps extends Omit<PanelProps, 'children'> {
  messages: readonly AgentMessage[];
  /** Rendered pinned under the thread; usually <Composer/>. */
  composer: ReactNode;
  empty?: ReactNode;
  /** Streaming text is display only; it is never a document record. */
  streaming?: string;
}
/** Conversation panel with the composer pinned at the bottom. Collapsible; the canvas keeps its camera. */
export function AgentPanel({ messages, composer, empty, streaming, ...panel }: AgentPanelProps) {
  const thread = useRef<HTMLDivElement>(null);
  useEffect(() => {
    thread.current?.scrollTo({ top: messages.length > 0 || streaming ? thread.current.scrollHeight : 0 });
  }, [messages.length, streaming]);
  // Growing content (a streamed reply) is followed while the reader sits at the bottom.
  useEffect(() => {
    const element = thread.current;
    if (!element || typeof MutationObserver === 'undefined') return undefined;
    let pinned = true;
    const onScroll = () => { pinned = element.scrollHeight - element.scrollTop - element.clientHeight < 64; };
    const follow = new MutationObserver(() => { if (pinned) element.scrollTop = element.scrollHeight; });
    follow.observe(element, { childList: true, subtree: true, characterData: true });
    element.addEventListener('scroll', onScroll, { passive: true });
    return () => { follow.disconnect(); element.removeEventListener('scroll', onScroll); };
  }, []);
  return (
    <Panel {...panel} className={`ofk-agent-panel ${panel.className ?? ''}`}>
      <div
        ref={thread}
        className="ofk-thread"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-busy={streaming ? true : undefined}
      >
        {messages.length === 0 && !streaming && empty}
        {messages.map((m) => (
          <article key={m.id} className="ofk-message" data-role={m.role}>
            {m.at && <time className="ofk-caption">{m.at}</time>}
            <div className="ofk-message-body">{m.content}</div>
            {m.attachment}
          </article>
        ))}
        {streaming && (
          <article className="ofk-message" data-role="agent" data-streaming>
            <p>{streaming}</p>
          </article>
        )}
      </div>
      <div className="ofk-thread-composer">{composer}</div>
    </Panel>
  );
}
