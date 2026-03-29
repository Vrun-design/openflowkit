import React from 'react';
import { GitCompare, Plus, Minus, RefreshCw, X } from 'lucide-react';
import { useDiagramDiff } from '@/context/DiagramDiffContext';

export function DiffModeBanner(): React.ReactElement | null {
    const { isActive, diff, baselineSnapshot, stopCompare } = useDiagramDiff();
    if (!isActive || !diff || !baselineSnapshot) return null;

    const snapshotDate = new Date(baselineSnapshot.timestamp).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });

    return (
        <div className="absolute top-3 left-1/2 z-30 -translate-x-1/2 pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-[var(--color-brand-border)] bg-[var(--brand-surface)]/95 px-4 py-2 text-xs font-medium text-[var(--brand-text)] shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-200">
                <GitCompare className="h-3.5 w-3.5 shrink-0 text-[var(--brand-primary)]" />
                <span className="text-[var(--brand-secondary)]">vs</span>
                <span className="font-semibold truncate max-w-[160px]">{baselineSnapshot.name}</span>
                <span className="text-[var(--brand-secondary)]/60">·</span>
                <span className="text-[var(--brand-secondary)]">{snapshotDate}</span>

                {diff.totalChanges === 0 ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 font-medium">No changes</span>
                ) : (
                    <div className="flex items-center gap-1.5">
                        {diff.addedNodeIds.length + diff.addedEdgeIds.length > 0 && (
                            <span className="flex items-center gap-0.5 text-emerald-600">
                                <Plus className="h-3 w-3" />
                                {diff.addedNodeIds.length + diff.addedEdgeIds.length}
                            </span>
                        )}
                        {diff.removedNodes.length + diff.removedEdges.length > 0 && (
                            <span className="flex items-center gap-0.5 text-red-500">
                                <Minus className="h-3 w-3" />
                                {diff.removedNodes.length + diff.removedEdges.length}
                            </span>
                        )}
                        {diff.changedNodeIds.length > 0 && (
                            <span className="flex items-center gap-0.5 text-amber-500">
                                <RefreshCw className="h-3 w-3" />
                                {diff.changedNodeIds.length}
                            </span>
                        )}
                    </div>
                )}

                <button
                    onClick={stopCompare}
                    className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-[var(--brand-secondary)] transition-colors hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]"
                    title="Exit compare mode"
                >
                    <X className="h-3 w-3" />
                </button>
            </div>
        </div>
    );
}
