import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, FileWarning, RefreshCcw, X } from 'lucide-react';
import type { ImportFidelityReport } from '@/services/importFidelity';
import { MODAL_PANEL_CLASS, SECTION_CARD_CLASS, SECTION_SURFACE_CLASS, STATUS_SURFACE_CLASS } from '@/lib/designTokens';
import { Button } from './ui/Button';

interface ImportRecoveryDialogProps {
  fileName: string;
  report: ImportFidelityReport;
  onRetry: () => void;
  onClose: () => void;
}

function formatSourceLabel(source: ImportFidelityReport['source']): string {
  if (source === 'openflowdsl') {
    return 'OpenFlow DSL';
  }

  return source.toUpperCase();
}

export function ImportRecoveryDialog({
  fileName,
  report,
  onRetry,
  onClose,
}: ImportRecoveryDialogProps): React.ReactElement | null {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const visibleIssues = report.issues.slice(0, 3);
  const remainingIssueCount = Math.max(0, report.issues.length - visibleIssues.length);

  useEffect(() => {
    closeButtonRef.current?.focus();

    function handleEscape(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-recovery-title"
        aria-describedby="import-recovery-description"
        className={`w-full max-w-lg ${MODAL_PANEL_CLASS}`}
      >
        <div className="flex items-start justify-between border-b border-[var(--color-brand-border)] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] ${STATUS_SURFACE_CLASS.warning}`}>
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h2 id="import-recovery-title" className="text-base font-semibold text-[var(--brand-text)]">
                Import needs attention
              </h2>
              <p id="import-recovery-description" className="text-sm text-[var(--brand-secondary)]">
                {fileName} could not be loaded cleanly. Review the issues below, then retry with a corrected file or another export.
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[var(--brand-secondary)] transition-colors hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]"
            aria-label="Close import recovery dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className={`${SECTION_CARD_CLASS} px-3 py-3`}>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--brand-secondary)]">Source</div>
              <div className="mt-1 text-sm font-medium text-[var(--brand-text)]">{formatSourceLabel(report.source)}</div>
            </div>
            <div className={`${SECTION_CARD_CLASS} px-3 py-3`}>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--brand-secondary)]">Errors</div>
              <div className="mt-1 text-sm font-medium text-[var(--brand-text)]">{report.summary.errorCount}</div>
            </div>
            <div className={`${SECTION_CARD_CLASS} px-3 py-3`}>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--brand-secondary)]">Warnings</div>
              <div className="mt-1 text-sm font-medium text-[var(--brand-text)]">{report.summary.warningCount}</div>
            </div>
          </div>

          <div className={`${SECTION_CARD_CLASS} p-4`}>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--brand-text)]">
              <FileWarning className="h-4 w-4 text-[var(--color-surface-warning-text)]" />
              Top recovery issues
            </div>
            <div className="space-y-3">
              {visibleIssues.map((issue, index) => (
                <div key={`${issue.code}-${index}`} className={`${SECTION_SURFACE_CLASS} px-3 py-3`}>
                  <div className="text-sm font-medium text-[var(--brand-text)]">
                    {typeof issue.line === 'number' ? `Line ${issue.line}: ` : ''}
                    {issue.message}
                  </div>
                  {issue.snippet ? (
                    <pre className="mt-2 overflow-x-auto rounded bg-[var(--brand-background)] px-2 py-2 text-[11px] text-[var(--brand-secondary)]">
                      {issue.snippet}
                    </pre>
                  ) : null}
                  {issue.hint ? (
                    <p className="mt-2 text-xs text-[var(--brand-secondary)]">{issue.hint}</p>
                  ) : null}
                </div>
              ))}
              {remainingIssueCount > 0 ? (
                <p className="text-xs text-[var(--brand-secondary)]">
                  {remainingIssueCount} more issue{remainingIssueCount === 1 ? '' : 's'} were captured in the latest import report.
                </p>
              ) : null}
            </div>
          </div>

          <div className={`${SECTION_CARD_CLASS} px-4 py-3 text-xs text-[var(--brand-secondary)]`}>
            If this file came from another tool, try exporting a plain JSON/OpenFlowKit file again or remove unsupported metadata before retrying.
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Dismiss
            </Button>
            <Button type="button" variant="primary" onClick={onRetry}>
              <RefreshCcw className="h-4 w-4" />
              Try another file
            </Button>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="absolute inset-0 -z-10"
        onClick={onClose}
        aria-label="Close import recovery dialog"
      />
    </div>,
    document.body
  );
}
