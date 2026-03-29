import React from 'react';
import type { Node } from '@/lib/reactflowCompat';
import { Layout } from 'lucide-react';
import type { NodeData } from '@/lib/types';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { getWireframeVariants } from './wireframeVariants';

interface NodeWireframeVariantSectionProps {
    selectedNode: Node<NodeData>;
    isOpen: boolean;
    onToggle: () => void;
    onChange: (id: string, data: Partial<NodeData>) => void;
}

export function NodeWireframeVariantSection({
    selectedNode,
    isOpen,
    onToggle,
    onChange,
}: NodeWireframeVariantSectionProps): React.ReactElement {
    const variants = getWireframeVariants(selectedNode.type);
    const activeVariant = selectedNode.data?.variant || 'default';

    return (
        <CollapsibleSection
            title="Wireframe Variant"
            icon={<Layout className="w-3.5 h-3.5" />}
            isOpen={isOpen}
            onToggle={onToggle}
        >
            <div className="grid grid-cols-2 gap-2 mb-2">
                {variants.map((variant) => (
                    <button
                        key={variant.id}
                        onClick={() => onChange(selectedNode.id, { variant: variant.id })}
                        className={`px-2 py-2 rounded text-xs font-medium border transition-all
                            ${activeVariant === variant.id
                                ? 'bg-[var(--brand-primary-50)] border-[var(--brand-primary-200)] text-[var(--brand-primary)]'
                                : 'bg-[var(--brand-surface)] border-[var(--color-brand-border)] text-[var(--brand-secondary)] hover:border-[var(--brand-secondary)] hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]'}`}
                        title={variant.description}
                    >
                        {variant.label}
                    </button>
                ))}
            </div>
        </CollapsibleSection>
    );
}
