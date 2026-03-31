import React from 'react';
import { Loader2, X } from 'lucide-react';
import {
  useCinematicExportActions,
  useCinematicExportJobState,
} from '@/context/CinematicExportContext';

function getFrameCopy(completedFrames: number, totalFrames: number): string | null {
  if (totalFrames > 0) {
    return `${completedFrames}/${totalFrames}`;
  }

  return null;
}

export function CinematicExportOverlay(): React.ReactElement | null {
  const { canCancel, completedFrames, progressPercent, request, stageLabel, status, totalFrames } =
    useCinematicExportJobState();
  const { cancelExport } = useCinematicExportActions();

  if (status === 'idle') {
    return null;
  }

  const resolvedStageLabel = stageLabel || 'Preparing cinematic export…';
  const frameCopy = getFrameCopy(completedFrames, totalFrames);
  const resolutionLabel = request?.resolution?.toUpperCase() ?? 'VIDEO';
  const progressWidth = `${Math.max(5, progressPercent)}%`;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-16 z-[70] flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto relative flex w-max items-center gap-3 overflow-hidden rounded-full border border-[var(--color-brand-border)]/50 bg-[var(--brand-surface)]/95 py-2 pl-3 pr-2 text-sm shadow-xl backdrop-blur-xl transition-all duration-300"
      >
        {/* Underlay Progress Overlay */}
        <div
          className="absolute inset-y-0 left-0 bg-[var(--brand-primary)]/10 transition-all duration-300 ease-out"
          style={{ width: progressWidth }}
        />

        <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-background)] text-[var(--brand-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
          <Loader2 className="h-3 w-3 animate-spin" />
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <span className="whitespace-nowrap font-medium text-[var(--brand-text)]">
            {resolvedStageLabel}
          </span>
          <span className="font-mono text-[11px] font-semibold text-[var(--brand-secondary)]">
            {progressPercent}%
          </span>
        </div>

        {(frameCopy || resolutionLabel) && (
          <>
            <div className="relative z-10 mx-1 h-3 w-px bg-[var(--color-brand-border)]" />

            <div className="relative z-10 flex items-center gap-2 text-[11px] text-[var(--brand-secondary)]">
              {frameCopy && <span className="font-mono font-medium">{frameCopy}</span>}
              {resolutionLabel && (
                <span className="rounded bg-[var(--brand-background)] px-1.5 py-0.5 font-bold tracking-wider">{resolutionLabel}</span>
              )}
            </div>
          </>
        )}

        <button
          type="button"
          onClick={cancelExport}
          disabled={!canCancel}
          aria-label="Cancel cinematic export"
          className="relative z-10 ml-1 rounded-full p-1 text-[var(--brand-secondary)] transition-colors hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
