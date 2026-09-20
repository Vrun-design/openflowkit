import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { IconCheck, IconX } from '@tabler/icons-react';
import { Button, IconButton } from './Button';
import { Icon } from './Icon';
import { Kbd } from './Kbd';
import { Status } from './Status';
export type ProposalChangeKind = 'addition' | 'modification' | 'removal';
export interface ProposalChange {
  id: string;
  kind: ProposalChangeKind;
  label: string;
  /** Why the agent made this change; shown inline so review does not require a round trip. */
  reason?: string;
}
export type ChangeDecision = 'pending' | 'accepted' | 'rejected';
export interface ProposalReviewProps {
  id: string;
  baseRevision: number;
  currentRevision: number;
  scopeLabel: string;
  changes: readonly ProposalChange[];
  decisions: Readonly<Record<string, ChangeDecision>>;
  onDecide: (changeId: string, decision: ChangeDecision) => void;
  /** Commits accepted changes atomically; must return the commit-service promise. */
  onApply: (
    proposalId: string,
    expectedRevision: number,
    acceptedIds: readonly string[]
  ) => Promise<void>;
  onDiscard: () => void;
  /** Row focus/hover lets the host highlight the object on the canvas. */
  onHighlight?: (changeId: string | null) => void;
  labels?: Partial<
    Record<
      | 'title'
      | 'stale'
      | 'apply'
      | 'discard'
      | 'acceptAll'
      | 'rejectAll'
      | 'accept'
      | 'reject'
      | 'failed'
      | 'addition'
      | 'modification'
      | 'removal',
      string
    >
  >;
}
const defaults = {
  title: 'Review changes',
  stale: 'Document changed since this proposal. Request a fresh one.',
  apply: 'Apply',
  discard: 'Discard',
  acceptAll: 'Accept all',
  rejectAll: 'Reject all',
  accept: 'Accept',
  reject: 'Reject',
  failed: 'Could not apply. Nothing changed.',
  addition: 'Add',
  modification: 'Change',
  removal: 'Remove',
};
const glyph: Record<ProposalChangeKind, string> = {
  addition: '+',
  modification: 'Δ',
  removal: '−',
};
/** Per-object review: J/K move, Enter accepts, Backspace rejects, A/R apply to all. Stale proposals cannot be applied. */
export function ProposalReview({
  id,
  baseRevision,
  currentRevision,
  scopeLabel,
  changes,
  decisions,
  onDecide,
  onApply,
  onDiscard,
  onHighlight,
  labels,
}: ProposalReviewProps) {
  const t = { ...defaults, ...labels };
  const stale = baseRevision !== currentRevision;
  const list = useRef<HTMLUListElement>(null);
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const accepted = changes
    .filter((c) => (decisions[c.id] ?? 'pending') !== 'rejected')
    .map((c) => c.id);
  useEffect(() => setFailed(false), [id]);
  useEffect(() => {
    setFocusIndex((i) => Math.max(0, Math.min(i, Math.max(changes.length - 1, 0))));
  }, [changes.length]);
  async function apply() {
    if (stale || inFlight.current || accepted.length === 0) return;
    inFlight.current = true;
    setBusy(true);
    setFailed(false);
    try {
      await onApply(id, baseRevision, accepted);
    } catch {
      setFailed(true);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  function rows() {
    return Array.from(list.current?.querySelectorAll<HTMLElement>('[data-change]') ?? []);
  }
  function focusRow(index: number) {
    const all = rows();
    const clamped = Math.max(0, Math.min(index, all.length - 1));
    setFocusIndex(clamped);
    all[clamped]?.focus();
  }
  function onKeyDown(e: KeyboardEvent<HTMLUListElement>) {
    const target = e.target as HTMLElement;
    if (target.closest('input, textarea, select')) return;
    const all = rows();
    const row = target.closest<HTMLElement>('[data-change]');
    const i = row ? all.indexOf(row) : focusIndex;
    const current = i >= 0 ? changes[i] : undefined;
    if (e.key === 'j' || e.key === 'J' || e.key === 'ArrowDown') focusRow(i + 1);
    else if (e.key === 'k' || e.key === 'K' || e.key === 'ArrowUp') focusRow(Math.max(i - 1, 0));
    else if (e.key === 'Home') focusRow(0);
    else if (e.key === 'End') focusRow(all.length - 1);
    else if (e.key === 'Enter' && current) onDecide(current.id, 'accepted');
    else if ((e.key === 'Backspace' || e.key === 'Delete') && current)
      onDecide(current.id, 'rejected');
    else if (e.key === 'a' && !e.metaKey && !e.ctrlKey)
      changes.forEach((c) => onDecide(c.id, 'accepted'));
    else if (e.key === 'r' && !e.metaKey && !e.ctrlKey)
      changes.forEach((c) => onDecide(c.id, 'rejected'));
    else return;
    e.preventDefault();
  }
  return (
    <section className="ofk-review ofk-overlay" aria-label={t.title}>
      <header className="ofk-review-header">
        <div>
          <Status live tone={failed ? 'danger' : stale ? 'warning' : 'info'}>
            {failed ? t.failed : stale ? t.stale : t.title}
          </Status>
          <p className="ofk-caption">
            {scopeLabel} · {accepted.length}/{changes.length}
          </p>
        </div>
        <div className="ofk-review-bulk">
          <Button
            variant="quiet"
            onClick={() => changes.forEach((c) => onDecide(c.id, 'accepted'))}
          >
            {t.acceptAll} <Kbd keys="A" />
          </Button>
          <Button
            variant="quiet"
            onClick={() => changes.forEach((c) => onDecide(c.id, 'rejected'))}
          >
            {t.rejectAll} <Kbd keys="R" />
          </Button>
        </div>
      </header>
      <ul
        ref={list}
        className="ofk-review-list"
        onKeyDown={onKeyDown}
        onMouseLeave={() => onHighlight?.(null)}
      >
        {changes.map((change, index) => {
          const decision = decisions[change.id] ?? 'pending';
          return (
            <li
              key={change.id}
              data-change={change.id}
              data-kind={change.kind}
              data-decision={decision}
              tabIndex={index === focusIndex ? 0 : -1}
              onFocus={() => {
                setFocusIndex(index);
                onHighlight?.(change.id);
              }}
              onMouseEnter={() => onHighlight?.(change.id)}
              onBlur={() => onHighlight?.(null)}
            >
              <span className="ofk-review-glyph" aria-hidden="true">
                {glyph[change.kind]}
              </span>
              <span className="ofk-review-body">
                <span className="ofk-review-label">
                  <span className="ofk-caption">{t[change.kind]}</span> {change.label}
                </span>
                {change.reason && <span className="ofk-caption">{change.reason}</span>}
              </span>
              <span className="ofk-review-actions" role="group" aria-label={change.label}>
                <IconButton
                  variant="quiet"
                  label={t.accept}
                  icon={<Icon icon={IconCheck} />}
                  selected={decision === 'accepted'}
                  onClick={() =>
                    onDecide(change.id, decision === 'accepted' ? 'pending' : 'accepted')
                  }
                />
                <IconButton
                  variant="quiet"
                  label={t.reject}
                  icon={<Icon icon={IconX} />}
                  selected={decision === 'rejected'}
                  onClick={() =>
                    onDecide(change.id, decision === 'rejected' ? 'pending' : 'rejected')
                  }
                />
              </span>
            </li>
          );
        })}
      </ul>
      <footer className="ofk-review-footer">
        <Kbd keys={['J', 'K']} /> <span className="ofk-caption">navigate</span>
        <span className="ofk-composer-spacer" />
        <Button variant="quiet" disabled={busy} onClick={onDiscard}>
          {t.discard}
        </Button>
        <Button
          variant="primary"
          busy={busy}
          disabled={stale || accepted.length === 0}
          onClick={apply}
        >
          {t.apply} ({accepted.length})
        </Button>
      </footer>
    </section>
  );
}
