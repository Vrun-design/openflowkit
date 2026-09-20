import type { CSSProperties, ReactNode } from 'react';
import { IconSparkles } from '@tabler/icons-react';
import { Button } from './Button';
import { Icon } from './Icon';
import { Status } from './Status';
export type AgentState = 'disconnected' | 'idle' | 'working' | 'waiting';
/** Connection + activity in one glance. Never the visual center; lives in the document bar. */
export function AgentBadge({
  name,
  state,
  detail,
  onClick,
}: {
  name: string;
  state: AgentState;
  detail?: string;
  onClick?: () => void;
}) {
  const tone =
    state === 'working'
      ? 'info'
      : state === 'waiting'
        ? 'warning'
        : state === 'idle'
          ? 'success'
          : 'neutral';
  const body = (
    <span className="ofk-agent-badge" data-state={state}>
      <span className="ofk-agent-dot" aria-hidden="true" />
      <Status tone={tone} live={state === 'waiting'}>
        {name}
        {detail ? ` · ${detail}` : ''}
      </Status>
    </span>
  );
  return onClick ? (
    <Button variant="quiet" onClick={onClick}>
      {body}
    </Button>
  ) : (
    body
  );
}
/** Scope request from an agent. The host enforces the answer in the commit service; this only asks. */
export function PermissionPrompt({
  agent,
  request,
  onAllowOnce,
  onAllowSession,
  onDeny,
  labels,
}: {
  agent: string;
  request: string;
  onAllowOnce: () => void;
  onAllowSession: () => void;
  onDeny: () => void;
  labels?: Partial<Record<'title' | 'once' | 'session' | 'deny', string>>;
}) {
  const t = {
    title: 'requests access',
    once: 'Allow once',
    session: 'Allow this session',
    deny: 'Deny',
    ...labels,
  };
  return (
    <section
      className="ofk-permission ofk-overlay ofk-enter"
      role="alertdialog"
      aria-label={`${agent} ${t.title}`}
    >
      <div>
        <Status tone="warning" live>
          {agent} {t.title}
        </Status>
        <p>{request}</p>
      </div>
      <div className="ofk-permission-actions">
        <Button variant="quiet" onClick={onDeny}>
          {t.deny}
        </Button>
        <Button onClick={onAllowSession}>{t.session}</Button>
        <Button variant="primary" onClick={onAllowOnce} autoFocus>
          {t.once}
        </Button>
      </div>
    </section>
  );
}
/** Marks agent-authored objects in lists and inspectors. Decorative beside a label; labelled when alone. */
export function ProvenanceBadge({
  label = 'Made by agent',
  standalone = false,
}: {
  label?: string;
  standalone?: boolean;
}) {
  return (
    <span
      className="ofk-provenance"
      title={label}
      aria-label={standalone ? label : undefined}
      aria-hidden={standalone ? undefined : true}
    >
      <Icon icon={IconSparkles} />
    </span>
  );
}
/** Screen-space label showing where an agent is acting. Never captures pointer events. */
export function AgentCursor({
  name,
  x,
  y,
  children,
}: {
  name: string;
  x: number;
  y: number;
  children?: ReactNode;
}) {
  return (
    <div
      className="ofk-agent-cursor"
      style={{ transform: `translate(${x}px, ${y}px)` } as CSSProperties}
      aria-hidden="true"
    >
      <span className="ofk-agent-cursor-pill">
        <Icon icon={IconSparkles} /> {name}
        {children}
      </span>
    </div>
  );
}
