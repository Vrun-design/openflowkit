import React from 'react';
import type { Node } from 'reactflow';
import { Layout } from 'lucide-react';
import type { NodeData } from '@/lib/types';
import { CollapsibleSection } from '../ui/CollapsibleSection';

interface NodeWireframeVariantSectionProps {
    selectedNode: Node<NodeData>;
    isOpen: boolean;
    onToggle: () => void;
    onChange: (id: string, data: Partial<NodeData>) => void;
}

const BROWSER_VARIANTS = ['landing', 'dashboard', 'form', 'modal', 'cookie', 'pricing'];
const MOBILE_VARIANTS = ['login', 'social', 'chat', 'product', 'list'];

export function NodeWireframeVariantSection({
    selectedNode,
    isOpen,
    onToggle,
    onChange,
}: NodeWireframeVariantSectionProps): React.ReactElement {
    const variants = selectedNode.type === 'browser' ? BROWSER_VARIANTS : MOBILE_VARIANTS;
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
                        key={variant}
                        onClick={() => onChange(selectedNode.id, { variant })}
                        className={`px-2 py-2 rounded text-xs font-medium border transition-all
                            ${activeVariant === variant
                                ? 'bg-[var(--brand-primary-50)] border-[var(--brand-primary-200)] text-[var(--brand-primary)]'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                    >
                        {variant.charAt(0).toUpperCase() + variant.slice(1)}
                    </button>
                ))}
            </div>
        </CollapsibleSection>
    );
}
