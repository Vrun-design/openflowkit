import React from 'react';

interface FlowEditorLayoutOverlayProps {
    message: string;
}

export function FlowEditorLayoutOverlay({ message }: FlowEditorLayoutOverlayProps): React.ReactElement {
    return (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/60 backdrop-blur-sm pointer-events-none" aria-live="polite">
            <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-2xl shadow-xl border border-slate-200">
                <svg className="w-5 h-5 animate-spin text-[var(--brand-primary)]" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm font-medium text-slate-600">{message}</span>
            </div>
        </div>
    );
}
