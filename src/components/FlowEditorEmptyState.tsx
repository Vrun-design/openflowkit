import React from 'react';
import { Layout, Plus, Sparkles } from 'lucide-react';
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
        <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
            <div className="text-center space-y-6 pointer-events-auto bg-[var(--brand-surface)]/80 backdrop-blur-md p-8 rounded-[var(--radius-xl)] ring-1 ring-black/5 shadow-2xl">
                <div className="w-20 h-20 bg-[var(--brand-primary-50)] rounded-[var(--radius-lg)] mx-auto flex items-center justify-center mb-4 ring-1 ring-black/5">
                    <div className="w-12 h-12 bg-[var(--brand-primary-100)] rounded-[var(--radius-md)] flex items-center justify-center">
                        <svg className="w-6 h-6 text-[var(--brand-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 4.5v15m7.5-7.5h-15" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </div>

                <div className="space-y-2">
                    <h3 className="text-xl font-bold text-[var(--brand-text)]">{title}</h3>
                    <p className="text-[var(--brand-text-secondary)] text-sm max-w-xs mx-auto">
                        {description}
                    </p>
                </div>

                <div className="flex flex-col gap-3 w-full max-w-xs mx-auto pointer-events-auto">
                    <Button
                        onClick={onGenerate}
                        variant="primary"
                        size="lg"
                        data-testid="empty-generate-ai"
                        className="w-full shadow-lg"
                        icon={<Sparkles className="w-4 h-4" />}
                    >
                        {generateLabel}
                    </Button>

                    <Button
                        onClick={onTemplates}
                        variant="secondary"
                        size="lg"
                        data-testid="empty-browse-templates"
                        className="w-full"
                        icon={<Layout className="w-4 h-4" />}
                    >
                        {templatesLabel}
                    </Button>

                    <Button
                        onClick={onAddNode}
                        variant="secondary"
                        size="lg"
                        data-testid="empty-add-node"
                        className="w-full"
                        icon={<Plus className="w-4 h-4" />}
                    >
                        {addNodeLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}
