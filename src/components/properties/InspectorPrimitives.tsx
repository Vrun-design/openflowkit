import React from 'react';

interface InspectorContainerProps {
    children: React.ReactNode;
    className?: string;
}

export function InspectorSectionDivider(): React.ReactElement {
    return <hr className="mb-2 border-[var(--color-brand-border)]" />;
}

export function InspectorIntro({ children, className = '' }: InspectorContainerProps): React.ReactElement {
    return (
        <p className={`mb-3 text-xs text-[var(--brand-secondary)] ${className}`.trim()}>
            {children}
        </p>
    );
}

export function InspectorFooter({ children, className = '' }: InspectorContainerProps): React.ReactElement {
    return (
        <div className={`mt-4 border-t border-[var(--color-brand-border)] pt-4 ${className}`.trim()}>
            {children}
        </div>
    );
}

export function InspectorSummaryCard({ children, className = '' }: InspectorContainerProps): React.ReactElement {
    return (
        <div className={`rounded-[var(--brand-radius)] border border-[var(--color-brand-border)] bg-[var(--brand-background)]/70 p-3 ${className}`.trim()}>
            {children}
        </div>
    );
}

interface InspectorFieldProps {
    label: string;
    children: React.ReactNode;
    helper?: React.ReactNode;
    className?: string;
}

export function InspectorField({
    label,
    children,
    helper,
    className = '',
}: InspectorFieldProps): React.ReactElement {
    return (
        <div className={className}>
            <label className="text-xs font-semibold text-[var(--brand-secondary)]">{label}</label>
            <div className="mt-1">
                {children}
            </div>
            {helper ? (
                <div className="mt-2 text-[11px] text-[var(--brand-secondary)]">
                    {helper}
                </div>
            ) : null}
        </div>
    );
}

export const INSPECTOR_INPUT_CLASSNAME = 'w-full rounded-[var(--brand-radius)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]';
export const INSPECTOR_INPUT_COMPACT_CLASSNAME = 'w-full rounded-[var(--radius-sm)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-2 py-1.5 text-sm text-[var(--brand-text)] disabled:cursor-not-allowed disabled:bg-[var(--brand-background)] disabled:text-[var(--brand-secondary)]';
export const INSPECTOR_BUTTON_CLASSNAME = 'rounded-[var(--radius-sm)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-2 py-1.5 text-xs font-medium text-[var(--brand-text)] hover:border-[var(--brand-secondary)] hover:bg-[var(--brand-background)] disabled:cursor-not-allowed disabled:opacity-50';
export const INSPECTOR_BUTTON_ACCENT_CLASSNAME = 'rounded-[var(--radius-sm)] border border-[var(--brand-primary-200)] bg-[var(--brand-primary-50)] px-2 py-1.5 text-xs font-medium text-[var(--brand-primary-700)] hover:border-[var(--brand-primary-300)] disabled:cursor-not-allowed disabled:opacity-50';
