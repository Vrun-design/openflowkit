import React from 'react';

interface FlowEditorLayoutOverlayProps {
    message: string;
}

export function FlowEditorLayoutOverlay({ message }: FlowEditorLayoutOverlayProps): React.ReactElement {
    return (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-sm" aria-live="polite">
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-6 py-3 text-[var(--brand-text)] shadow-[var(--shadow-md)]">
                <svg className="w-5 h-5 animate-spin text-[var(--brand-primary)]" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm font-medium text-[var(--brand-secondary)]">{message}</span>
            </div>
        </div>
    );
}
