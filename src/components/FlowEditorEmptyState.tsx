import React from 'react';
import { Button } from './ui/Button';

interface FlowEditorEmptyStateProps {
    title: string;
    description: string;
    generateLabel: string;
    templatesLabel: string;
    addNodeLabel: string;
    onGenerate: () => void;
    onTemplates: () => void;
    onAddNode: () => void;
    onSuggestionClick?: (prompt: string) => void;
}

export function FlowEditorEmptyState({
    title,
    description,
    generateLabel,
    templatesLabel,
    addNodeLabel,
    onGenerate,
    onTemplates,
    onAddNode,
}: FlowEditorEmptyStateProps): React.ReactElement {
    return (
        <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none animate-[fadeIn_200ms_ease-out]">
            <div className="pointer-events-auto w-full max-w-[400px] px-6">
                <div className="rounded-[var(--radius-md)] border border-[var(--color-brand-border)]/60 bg-[var(--brand-surface)] p-8 text-center shadow-[var(--shadow-md)] ring-1 ring-black/5">
                    
                    <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-primary-50)] text-[var(--brand-primary)]">
                        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="M12 4.5v15m7.5-7.5h-15" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>

                    <h3 className="mb-2 text-xl font-semibold tracking-tight text-[var(--brand-text)]">
                        {title}
                    </h3>
                    
                    <p className="mb-8 text-[13px] leading-relaxed text-[var(--brand-secondary)]">
                        {description}
                    </p>

                    <div className="flex flex-col gap-3">
                        <Button
                            onClick={onGenerate}
                            variant="primary"
                            size="lg"
                            className="w-full"
                            data-testid="empty-generate-ai"
                        >
                            {generateLabel}
                        </Button>

                        <Button
                            onClick={onTemplates}
                            variant="secondary"
                            size="lg"
                            className="w-full"
                            data-testid="empty-browse-templates"
                        >
                            {templatesLabel}
                        </Button>

                        <Button
                            onClick={onAddNode}
                            variant="secondary"
                            size="lg"
                            className="w-full"
                            data-testid="empty-add-node"
                        >
                            {addNodeLabel}
                        </Button>
                    </div>

                    <div className="mt-8 flex items-center justify-center text-xs text-[var(--brand-secondary)] opacity-80">
                        Press <kbd className="mx-1.5 rounded border border-[var(--color-brand-border)] bg-[var(--brand-background)] px-1.5 py-0.5 font-sans font-medium text-[var(--brand-secondary)]">&#8984;K</kbd> for command center
                    </div>
                </div>
            </div>
        </div>
    );
}
