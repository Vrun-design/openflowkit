import { useRef, useState } from 'react';
import { Button } from './Button';
import { Status } from './Status';
export type ProposalView =
  | { phase: 'working'; scopeLabel: string }
  | {
      phase: 'ready';
      id: string;
      baseRevision: number;
      currentRevision: number;
      scopeLabel: string;
      summary: string;
    }
  | { phase: 'failed'; message: string }
  | { phase: 'applied'; summary: string };
export interface ProposalBarProps {
  view: ProposalView;
  /** Host translates all copy. No provider, storage, or transaction implementation here. */
  labels: {
    working: string;
    ready: string;
    stale: string;
    applied: string;
    accept: string;
    discard: string;
    cancel: string;
    undo: string;
    failed: string;
  };
  onAccept: (id: string, expectedRevision: number) => Promise<void>;
  onDismiss: () => void;
  onUndo: () => void;
}
export function ProposalBar({ view, labels, onAccept, onDismiss, onUndo }: ProposalBarProps) {
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<{ id: string; message: string } | null>(null);
  const stale = view.phase === 'ready' && view.baseRevision !== view.currentRevision;
  async function accept() {
    if (view.phase !== 'ready' || stale || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setFailure(null);
    try {
      await onAccept(view.id, view.baseRevision);
    } catch {
      setFailure({ id: view.id, message: labels.failed });
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  const error =
    view.phase === 'failed'
      ? view.message
      : view.phase === 'ready' && failure?.id === view.id
        ? failure.message
        : null;
  const title =
    error ??
    (stale
      ? labels.stale
      : labels[
          view.phase === 'working' ? 'working' : view.phase === 'applied' ? 'applied' : 'ready'
        ]);
  return (
    <section className="ofk-proposal" aria-label={title}>
      <div>
        <Status
          live
          tone={
            error ? 'danger' : stale ? 'warning' : view.phase === 'applied' ? 'success' : 'info'
          }
        >
          {title}
        </Status>
        {'scopeLabel' in view && <p>{view.scopeLabel}</p>}
        {'summary' in view && <p>{view.summary}</p>}
      </div>
      <div className="ofk-proposal-actions">
        {view.phase === 'ready' && (
          <Button variant="primary" disabled={stale} busy={busy} onClick={accept}>
            {labels.accept}
          </Button>
        )}
        {view.phase === 'applied' && <Button onClick={onUndo}>{labels.undo}</Button>}
        <Button variant="quiet" disabled={busy} onClick={onDismiss}>
          {view.phase === 'working' ? labels.cancel : labels.discard}
        </Button>
      </div>
    </section>
  );
}
