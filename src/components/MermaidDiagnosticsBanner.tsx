import React from 'react';
import { AlertCircle } from 'lucide-react';
import type { MermaidDiagnosticsSnapshot } from '@/store/types';

function getMermaidDiagnosticsBannerClass(hasError: boolean): string {
  if (hasError) {
    return 'border-amber-500/20 bg-amber-500/10 text-amber-500';
  }

  return 'border-sky-500/20 bg-sky-500/10 text-sky-500';
}

interface MermaidDiagnosticsBannerProps {
  snapshot: MermaidDiagnosticsSnapshot;
  className?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function MermaidDiagnosticsBanner({
  snapshot,
  className = '',
  actionLabel,
  onAction,
}: MermaidDiagnosticsBannerProps): React.ReactElement {
  const message =
    snapshot.error
    || snapshot.statusDetail
    || snapshot.diagnostics[0]?.message
    || 'Mermaid diagnostics are available.';

  return (
    <div
      className={`rounded-[var(--radius-xs)] border px-3 py-2 text-xs ${getMermaidDiagnosticsBannerClass(Boolean(snapshot.error))} ${className}`.trim()}
    >
      <div className="flex items-center gap-2 font-medium">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span>{snapshot.statusLabel ?? 'Mermaid diagnostics'}</span>
      </div>
      <div className="mt-1 text-[11px] opacity-90">{message}</div>
      {snapshot.originalSource && snapshot.importState !== 'editable_full' ? (
        <div className="mt-1 text-[11px] opacity-80">
          Original Mermaid source is preserved. Open Mermaid code to continue editing safely.
        </div>
      ) : null}
      {actionLabel && onAction ? (
        <div className="mt-2">
          <button
            type="button"
            onClick={onAction}
            className="rounded-[var(--radius-xs)] border border-current/25 bg-transparent px-2 py-1 text-[11px] font-medium transition-colors hover:bg-current/10"
          >
            {actionLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
