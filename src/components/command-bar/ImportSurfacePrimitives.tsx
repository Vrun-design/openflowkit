import React from 'react';
import { Check, FileText, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatBytes } from './importDetection';
import type { NativeParseResult } from './importNativeParsers';

interface ImportFileBadgeProps {
  fileInfo: { name: string; size: number };
  onClear?: () => void;
}

export function ImportFileBadge({
  fileInfo,
  onClear,
}: ImportFileBadgeProps): React.ReactElement {
  return (
    <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] px-2.5 py-1.5">
      <FileText className="h-3.5 w-3.5 shrink-0 text-[var(--brand-secondary)]" />
      <span className="truncate text-[11px] font-medium text-[var(--brand-text)]">
        {fileInfo.name}
      </span>
      <span className="ml-auto shrink-0 text-[11px] text-[var(--brand-secondary)]">
        {formatBytes(fileInfo.size)}
      </span>
      {onClear ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClear}
          className="h-7 w-7 rounded-[var(--radius-sm)] text-[var(--brand-secondary)]"
          icon={<XCircle className="h-3.5 w-3.5" />}
        />
      ) : null}
    </div>
  );
}

interface ImportErrorNoticeProps {
  error: string;
}

export function ImportErrorNotice({ error }: ImportErrorNoticeProps): React.ReactElement {
  return (
    <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-red-400/30 bg-red-500/8 p-2.5">
      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
      <p className="text-[11px] leading-5 text-red-500">{error}</p>
    </div>
  );
}

interface NativeParseResultCardProps {
  nativeResult: NativeParseResult;
  previewDslLabel: string;
  applyLabel: string;
  appliedLabel: string;
  appliedFeedback: boolean;
  onApply?: () => void;
}

export function NativeParseResultCard({
  nativeResult,
  previewDslLabel,
  applyLabel,
  appliedLabel,
  appliedFeedback,
  onApply,
}: NativeParseResultCardProps): React.ReactElement {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] p-3">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-primary-50)]">
          <Check className="h-3 w-3 text-[var(--brand-primary)]" />
        </span>
        <span className="text-xs font-semibold text-[var(--brand-text)]">
          {nativeResult.summary}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-3 pl-7 text-[11px] text-[var(--brand-secondary)]">
        <span>{nativeResult.nodeCount} nodes</span>
        <span>{nativeResult.edgeCount} edges</span>
      </div>

      <details className="mt-2 pl-7">
        <summary className="cursor-pointer text-[11px] font-medium text-[var(--brand-secondary)] hover:text-[var(--brand-text)] transition-colors">
          {previewDslLabel}
        </summary>
        <pre className="mt-1.5 max-h-32 overflow-auto rounded-[var(--radius-sm)] bg-[var(--brand-surface)] border border-[var(--color-brand-border)] p-2 font-mono text-[10px] leading-4 text-[var(--brand-text)] custom-scrollbar">
          {nativeResult.dsl}
        </pre>
      </details>

      {onApply ? (
        <Button
          variant={appliedFeedback ? 'ghost' : 'primary'}
          size="sm"
          onClick={onApply}
          icon={appliedFeedback ? <Check className="h-3.5 w-3.5" /> : undefined}
          className="mt-3 w-full"
        >
          {appliedFeedback ? appliedLabel : applyLabel}
        </Button>
      ) : null}
    </div>
  );
}
