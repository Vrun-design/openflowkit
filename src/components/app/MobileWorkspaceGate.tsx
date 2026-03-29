import React from 'react';
import { ArrowLeft, Monitor } from 'lucide-react';
import { OpenFlowLogo } from '@/components/icons/OpenFlowLogo';
import { MOBILE_WORKSPACE_GATE_COPY } from './mobileWorkspaceGateCopy';

interface MobileWorkspaceGateProps {
    children: React.ReactNode;
    onOpenDocs: () => void;
    onGoHome: () => void;
}

export function MobileWorkspaceGate({
    children,
    onOpenDocs,
    onGoHome,
}: MobileWorkspaceGateProps): React.ReactElement {
    return (
        <>
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_45%),linear-gradient(180deg,var(--brand-background),color-mix(in_srgb,var(--brand-background),black_8%))] px-6 text-center md:hidden">
                <div className="w-full max-w-sm rounded-[28px] border border-[var(--color-brand-border)]/80 bg-[var(--brand-surface)]/92 px-6 py-8 shadow-2xl shadow-black/25 backdrop-blur-md">
                    <OpenFlowLogo className="mx-auto mb-8 h-14 w-14" />

                    <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary/5">
                        <Monitor className="h-6 w-6 text-brand-primary" />
                    </div>

                    <h2 className="text-2xl font-bold tracking-tight text-brand-dark">
                        {MOBILE_WORKSPACE_GATE_COPY.title}
                    </h2>

                    <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-brand-secondary">
                        {MOBILE_WORKSPACE_GATE_COPY.description}
                    </p>

                    <div className="mt-6 rounded-2xl border border-[var(--color-brand-border)] bg-[var(--brand-background)] px-4 py-3 text-left">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-secondary)]">
                            {MOBILE_WORKSPACE_GATE_COPY.recommendedLabel}
                        </p>
                        <p className="mt-1 text-sm text-[var(--brand-secondary)]">
                            {MOBILE_WORKSPACE_GATE_COPY.recommendedBody}
                        </p>
                    </div>

                    <div className="mt-8 flex flex-col gap-3">
                        <button
                            onClick={onOpenDocs}
                            className="inline-flex items-center justify-center rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-primary/15 transition-colors hover:brightness-110"
                        >
                            {MOBILE_WORKSPACE_GATE_COPY.openDocs}
                        </button>

                        <button
                            onClick={onGoHome}
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-primary/20 px-5 py-2.5 text-sm font-medium text-brand-primary transition-colors hover:bg-brand-primary/5"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            {MOBILE_WORKSPACE_GATE_COPY.goHome}
                        </button>
                    </div>
                </div>
            </div>

            <div className="hidden md:contents">{children}</div>
        </>
    );
}
