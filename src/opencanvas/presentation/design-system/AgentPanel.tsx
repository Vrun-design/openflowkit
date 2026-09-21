import { useEffect, useRef, type ReactNode } from 'react';
import { Panel, type PanelProps } from './Panel';
export interface AgentMessage {
  id: string;
  role: 'user' | 'agent';
  text: string;
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
            <p>{m.text}</p>
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
