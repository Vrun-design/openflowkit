import React from 'react';
import type { Edge } from 'reactflow';
import { GitBranch } from 'lucide-react';
import type { EdgeCondition } from '@/lib/types';
import { EDGE_CONDITION_LABELS, EDGE_CONDITION_STYLES } from '@/constants';

interface EdgeConditionSectionProps {
    selectedEdge: Edge;
    onChange: (id: string, updates: Partial<Edge>) => void;
}

export function EdgeConditionSection({ selectedEdge, onChange }: EdgeConditionSectionProps): React.ReactElement {
    const currentCondition = (selectedEdge.data?.condition as EdgeCondition) || 'default';

    return (
        <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5" /> Condition
            </label>
            <div className="grid grid-cols-2 gap-2">
                {(Object.keys(EDGE_CONDITION_STYLES) as EdgeCondition[]).map((condition) => {
                    const style = EDGE_CONDITION_STYLES[condition];
                    const label = (EDGE_CONDITION_LABELS as Record<string, string>)[condition] || 'Default';
                    const isSelected = currentCondition === condition;

                    return (
                        <button
                            key={condition}
                            onClick={() => {
                                onChange(selectedEdge.id, {
                                    data: { ...selectedEdge.data, condition },
                                    style: { ...selectedEdge.style, ...style },
                                    label: condition === 'default' ? '' : label,
                                });
                            }}
                            className={`
                                px-2 py-1.5 rounded-lg text-xs font-medium border transition-all text-left flex items-center gap-2
                                ${isSelected
                                    ? 'bg-[var(--brand-primary-50)] border-[var(--brand-primary-200)] text-[var(--brand-primary-700)] ring-1 ring-[var(--brand-primary-200)]'
                                    : 'bg-[var(--brand-surface)] border-slate-200 text-[var(--brand-secondary)] hover:border-slate-300'
                                }
                            `}
                        >
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: style.stroke }} />
                            {label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
