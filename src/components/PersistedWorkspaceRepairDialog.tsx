import React, { useState } from 'react';
import { AlertTriangle, Download, ShieldCheck } from 'lucide-react';
import type { PersistedWorkspaceIntegrityReport } from '@/services/storage/persistedWorkspaceRepair';
import { Button } from './ui/Button';

interface PersistedWorkspaceRepairDialogProps {
  report: Exclude<PersistedWorkspaceIntegrityReport, { status: 'healthy' }>;
  onRepair: () => Promise<boolean>;
  onContinueWithoutRepair: () => boolean;
  onDownloadBackup: () => boolean;
  onResolved: () => void;
}

export function PersistedWorkspaceRepairDialog({
  report,
  onRepair,
  onContinueWithoutRepair,
  onDownloadBackup,
  onResolved,
}: PersistedWorkspaceRepairDialogProps): React.ReactElement {
  const [isRepairing, setIsRepairing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRepair(): Promise<void> {
    setIsRepairing(true);
    setError(null);
    try {
      if (!(await onRepair())) throw new Error('Repair was not available.');
      onResolved();
    } catch (repairError) {
      setError(
        repairError instanceof Error
          ? repairError.message
          : 'Workspace repair failed. Original data remains unchanged.'
      );
    } finally {
      setIsRepairing(false);
    }
  }

  function handleContinue(): void {
    if (onContinueWithoutRepair()) onResolved();
  }

  function handleDownload(): void {
    try {
      if (!onDownloadBackup()) throw new Error('Backup was not available.');
      setError(null);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error ? downloadError.message : 'Workspace backup download failed.'
      );
    }
  }

  const repairable = report.status === 'repairable';
  const actionCount = repairable ? report.plan.actions.length : 0;
  const issueCount = repairable ? 0 : report.issues.length;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="persisted-workspace-repair-title"
        aria-describedby="persisted-workspace-repair-description"
        className="w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] p-6 shadow-[var(--shadow-overlay)]"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-amber-500/10 p-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h1
              id="persisted-workspace-repair-title"
              className="text-lg font-semibold text-[var(--brand-text)]"
            >
              {repairable ? 'Repair saved workspace?' : 'Saved workspace needs recovery'}
            </h1>
            <p
              id="persisted-workspace-repair-description"
              className="mt-2 text-sm leading-6 text-[var(--brand-secondary)]"
            >
              {repairable
                ? `${actionCount} invalid reference${actionCount === 1 ? '' : 's'} can be repaired. A complete original workspace backup downloads before any saved data changes.`
                : `${issueCount} structural issue${issueCount === 1 ? '' : 's'} cannot be repaired automatically. Autosave is paused so original data cannot be overwritten.`}
            </p>
          </div>
        </div>

        {repairable ? (
          <ul className="mt-4 max-h-40 space-y-1 overflow-y-auto rounded-[var(--radius-md)] bg-[var(--brand-background)] p-3 text-xs text-[var(--brand-secondary)]">
            {report.plan.actions.slice(0, 8).map((action, index) => (
              <li key={`${action.pageId}:${action.objectId}:${action.kind}:${index}`}>
                {action.pageId}/{action.objectId}: {action.detail}
              </li>
            ))}
            {report.plan.actions.length > 8 ? (
              <li>+{report.plan.actions.length - 8} more repairs</li>
            ) : null}
          </ul>
        ) : null}

        {error ? (
          <p role="alert" className="mt-4 rounded-md bg-red-500/10 p-3 text-sm text-red-600">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleDownload}
            disabled={isRepairing}
            icon={<Download className="h-4 w-4" aria-hidden="true" />}
          >
            Download original backup
          </Button>
          {repairable ? (
            <>
              <Button type="button" variant="ghost" onClick={handleContinue} disabled={isRepairing}>
                Continue without repair
              </Button>
              <Button
                type="button"
                onClick={() => void handleRepair()}
                isLoading={isRepairing}
                icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
              >
                Download backup & repair
              </Button>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
