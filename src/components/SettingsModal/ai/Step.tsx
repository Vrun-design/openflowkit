import React from 'react';

interface StepProps {
    n: number;
    text: string;
}

export function Step({ n, text }: StepProps): React.ReactElement {
    return (
        <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-[9px] font-bold flex items-center justify-center shrink-0 mt-px">
                {n}
            </span>
            <span className="text-[11px] text-[var(--brand-secondary)] leading-tight">{text}</span>
        </div>
    );
}
