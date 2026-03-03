import React from 'react';
import { Layout, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import type { FlowSnapshot } from '@/lib/types';

interface HomeDashboardProps {
    snapshots: FlowSnapshot[];
    onCreateNew: () => void;
    onImportJSON: () => void;
    onRestoreSnapshot: (snapshot: FlowSnapshot) => void;
    onDeleteSnapshot: (id: string) => void;
}

export function HomeDashboard({
    snapshots,
    onCreateNew,
    onImportJSON,
    onRestoreSnapshot,
    onDeleteSnapshot,
}: HomeDashboardProps): React.ReactElement {
    const { t } = useTranslation();

    return (
        <div className="flex-1 overflow-y-auto px-10 py-12 animate-in fade-in duration-300">
            <div className="flex items-end justify-between mb-12">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-1">{t('home.title', 'Dashboard')}</h1>
                    <p className="text-[var(--brand-secondary)] text-sm">{t('home.description', 'Manage your flows and diagrams.')}</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={onCreateNew}
                        variant="primary"
                        size="md"
                        data-testid="home-create-new"
                        icon={<Plus className="w-4 h-4" />}
                    >
                        {t('common.createNew', 'Create New')}
                    </Button>
                </div>
            </div>

            <section>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('home.recentFiles', 'Recent Files')}</h2>
                    {snapshots.length > 0 && (
                        <span className="text-xs text-slate-400">{snapshots.length} {t('home.files', 'files')}</span>
                    )}
                </div>

                {snapshots.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                        <div className="w-10 h-10 bg-[var(--brand-surface)] rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-100">
                            <Plus className="w-5 h-5 text-slate-400" />
                        </div>
                        <h3 className="text-slate-900 font-medium text-sm mb-1">{t('home.createFirstFlow', 'Create your first flow')}</h3>
                        <p className="text-[var(--brand-secondary)] text-xs">{t('home.startFromScratch', 'Start from scratch or import an existing diagram.')}</p>
                        <div className="mt-6 flex items-center justify-center gap-3">
                            <Button
                                onClick={onImportJSON}
                                variant="secondary"
                                size="sm"
                                data-testid="home-open-file"
                            >
                                {t('common.openFile', 'Open File')}
                            </Button>
                            <Button
                                onClick={onCreateNew}
                                variant="primary"
                                size="sm"
                            >
                                {t('common.createNew', 'Create New')}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
                        {snapshots.map((snapshot) => (
                            <div
                                key={snapshot.id}
                                onClick={() => onRestoreSnapshot(snapshot)}
                                className="group bg-[var(--brand-surface)] rounded-lg border border-slate-200 overflow-hidden cursor-pointer hover:border-slate-300 hover:shadow-sm transition-all relative"
                            >
                                <div className="h-40 bg-slate-50 flex items-center justify-center border-b border-slate-100 relative overflow-hidden">
                                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                                        <code className="text-[8px] leading-relaxed select-none">
                                            {`graph TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[End]\n  B -->|No| D[Loop]`}
                                        </code>
                                    </div>
                                    <div className="w-8 h-8 rounded bg-[var(--brand-surface)] shadow-sm border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-[var(--brand-primary)] group-hover:border-[var(--brand-primary-200)] transition-colors z-10">
                                        <Layout className="w-4 h-4" />
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(event) => {
                                            event?.stopPropagation();
                                            onDeleteSnapshot(snapshot.id);
                                        }}
                                        className="absolute top-2 right-2 p-1.5 bg-[var(--brand-surface)] text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 opacity-0 group-hover:opacity-100 transition-all z-20"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                                <div className="p-3">
                                    <h3 className="font-medium text-slate-900 text-sm truncate mb-1 group-hover:text-[var(--brand-primary)] transition-colors">{snapshot.name}</h3>
                                    <div className="flex items-center justify-between text-[11px] text-[var(--brand-secondary)]">
                                        <span>{new Date(snapshot.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                        <span>{snapshot.nodes.length} nodes</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
