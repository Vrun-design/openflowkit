import React from 'react';
import type { Edge } from '@/lib/reactflowCompat';
import type { EdgeCondition, FlowEdge } from '@/lib/types';
import { EDGE_CONDITION_LABELS } from '@/constants';
import { resolveEdgeConditionStroke } from '@/theme';
import { buildEdgeConditionUpdates } from './edgeColorUtils';

const EDGE_CONDITIONS: EdgeCondition[] = ['default', 'yes', 'no', 'success', 'error', 'timeout'];

interface EdgeConditionSectionProps {
    selectedEdge: Edge;
    onChange: (id: string, updates: Partial<Edge>) => void;
}

export function EdgeConditionSection({ selectedEdge, onChange }: EdgeConditionSectionProps): React.ReactElement {
    const currentCondition = (selectedEdge.data?.condition as EdgeCondition) || 'default';

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
                {EDGE_CONDITIONS.map((condition) => {
                    const stroke = resolveEdgeConditionStroke(condition);
                    const label = (EDGE_CONDITION_LABELS as Record<string, string>)[condition] || 'Default';
                    const isSelected = currentCondition === condition;

                    return (
                        <button
                            key={condition}
                            onClick={() => {
                                onChange(selectedEdge.id, buildEdgeConditionUpdates(selectedEdge as FlowEdge, condition));
                            }}
                            className={`
                                px-2 py-1.5 rounded-lg text-xs font-medium border transition-all text-left flex items-center gap-2
                                ${isSelected
                                    ? 'bg-[var(--brand-primary-50)] border-[var(--brand-primary-200)] text-[var(--brand-primary-700)] ring-1 ring-[var(--brand-primary-200)]'
                                    : 'bg-[var(--brand-surface)] border-[var(--color-brand-border)] text-[var(--brand-secondary)] hover:border-[var(--brand-secondary)]'
                                }
                            `}
                        >
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stroke }} />
                            {label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
