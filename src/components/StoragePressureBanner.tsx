import { AlertTriangle, Download, X } from 'lucide-react';
import type { StoragePressureGuardState } from '@/hooks/useStoragePressureGuard';
import { Button } from './ui/Button';

function formatBytes(value: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = Math.max(0, value);
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const digits = size >= 10 || unitIndex === 0 ? 0 : 1;
  return `${size.toFixed(digits)} ${units[unitIndex]}`;
}

export function StoragePressureBanner({
  state,
}: {
  state: StoragePressureGuardState;
}): React.ReactElement {
  const { snapshot } = state;
  const usagePercent = snapshot.ratio === null ? null : Math.round(snapshot.ratio * 100);
  const availableBytes = snapshot.quotaBytes !== null && snapshot.usageBytes !== null
    ? Math.max(0, snapshot.quotaBytes - snapshot.usageBytes)
    : null;
  const critical = snapshot.level === 'critical';

  return (
    <section
      role={critical ? 'alert' : 'status'}
      aria-label="Browser storage pressure"
      className="pointer-events-auto flex max-w-xl items-start gap-3 rounded-xl border border-amber-500/30 bg-[var(--brand-surface)] p-4 text-[var(--brand-text)] shadow-xl"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {critical ? 'Browser storage almost full' : 'Browser storage filling up'}
        </p>
        <p className="mt-1 text-xs text-[var(--brand-secondary)]">
          {usagePercent === null
            ? 'A storage write reached the browser quota.'
            : `${usagePercent}% used${availableBytes === null
              ? ''
              : ` · ${formatBytes(availableBytes)} available`}.`}
          {' '}Download a JSON backup. Automatic snapshots may be reduced if a quota write fails.
        </p>
        {snapshot.persisted === false ? (
          <p className="mt-1 text-xs text-[var(--brand-secondary)]">
            This browser has not granted persistent storage.
          </p>
        ) : null}
        {state.persistenceRequestStatus === 'granted' ? (
          <p className="mt-1 text-xs font-medium text-emerald-600">Persistent storage granted.</p>
        ) : null}
        {['denied', 'unsupported', 'error'].includes(state.persistenceRequestStatus) ? (
          <p className="mt-1 text-xs font-medium text-amber-700">
            Persistent storage was not granted. Keep a downloaded backup.
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={state.downloadBackup}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Download JSON backup
          </Button>
          {snapshot.persisted === false ? (
            <Button
              type="button"
              variant="secondary"
              onClick={state.requestPersistence}
              disabled={state.persistenceRequestStatus === 'requesting'}
            >
              {state.persistenceRequestStatus === 'requesting'
                ? 'Requesting protection…'
                : 'Protect local data'}
            </Button>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        onClick={state.dismiss}
        aria-label="Dismiss storage warning"
        className="rounded p-1 text-[var(--brand-secondary)] hover:bg-[var(--brand-background)]"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </section>
  );
}
