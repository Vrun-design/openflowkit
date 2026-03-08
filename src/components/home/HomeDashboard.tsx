import React from 'react';
import { Copy, Layout, Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';

export interface HomeFlowCard {
    id: string;
    name: string;
    nodeCount: number;
    edgeCount: number;
    updatedAt?: string;
    isActive?: boolean;
}

interface HomeDashboardProps {
    flows: HomeFlowCard[];
    onCreateNew: () => void;
    onImportJSON: () => void;
    onOpenFlow: (flowId: string) => void;
    onRenameFlow: (flowId: string) => void;
    onDuplicateFlow: (flowId: string) => void;
    onDeleteFlow: (flowId: string) => void;
}

export function HomeDashboard({
    flows,
    onCreateNew,
    onImportJSON,
    onOpenFlow,
    onRenameFlow,
    onDuplicateFlow,
    onDeleteFlow,
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
                    {flows.length > 0 && (
                        <span className="text-xs text-slate-400">{flows.length} {t('home.files', 'files')}</span>
                    )}
                </div>

                {flows.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-slate-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(248,250,252,0.9))] px-6 py-16 text-center shadow-sm">
                        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-slate-100 bg-[var(--brand-surface)] shadow-sm">
                            <Plus className="w-5 h-5 text-slate-400" />
                        </div>
                        <h3 className="mb-1 text-sm font-medium text-slate-900">{t('home.createFirstFlow', 'Create your first flow')}</h3>
                        <p className="mx-auto max-w-md text-xs leading-6 text-[var(--brand-secondary)]">
                            {t('home.startFromScratch', 'Start from scratch or import an existing diagram.')}
                        </p>
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
                        <div className="mx-auto mt-8 grid max-w-2xl grid-cols-1 gap-3 text-left sm:grid-cols-3">
                            <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3">
                                <p className="text-xs font-semibold text-slate-900">Start blank</p>
                                <p className="mt-1 text-[11px] leading-5 text-slate-500">Open a new workspace and sketch the flow from scratch.</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3">
                                <p className="text-xs font-semibold text-slate-900">Import existing work</p>
                                <p className="mt-1 text-[11px] leading-5 text-slate-500">Bring in a saved JSON flow when you want to keep iterating.</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3">
                                <p className="text-xs font-semibold text-slate-900">Autosave by default</p>
                                <p className="mt-1 text-[11px] leading-5 text-slate-500">Everything stays in this browser until you export or share it.</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
                        {flows.map((flow) => (
                            <div
                                key={flow.id}
                                onClick={() => onOpenFlow(flow.id)}
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
                                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onRenameFlow(flow.id);
                                            }}
                                            className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                                            aria-label={t('common.rename', 'Rename')}
                                            title={t('common.rename', 'Rename')}
                                        >
                                            <Pencil className="h-3 w-3" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onDuplicateFlow(flow.id);
                                            }}
                                            className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                                            aria-label={t('common.duplicate', 'Duplicate')}
                                            title={t('common.duplicate', 'Duplicate')}
                                        >
                                            <Copy className="h-3 w-3" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onDeleteFlow(flow.id);
                                            }}
                                            className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                            aria-label={t('common.delete', 'Delete')}
                                            title={t('common.delete', 'Delete')}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-3">
                                    <h3 className="font-medium text-slate-900 text-sm truncate mb-1 group-hover:text-[var(--brand-primary)] transition-colors">
                                        {flow.name}
                                    </h3>
                                    <div className="flex items-center justify-between text-[11px] text-[var(--brand-secondary)]">
                                        <span>{flow.isActive ? t('home.currentFlow', 'Current flow') : t('home.autosaved', 'Autosaved')}</span>
                                        <span>{flow.nodeCount} nodes</span>
                                    </div>
                                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                                        <span>{flow.edgeCount} edges</span>
                                        <span>{formatUpdatedAt(flow.updatedAt)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <p className="mt-6 text-xs text-slate-400">
                    {t('home.localStorageHint', 'Autosaved in this browser on this device. Export JSON or DSL when you want a portable backup or handoff.')}
                </p>
            </section>
        </div>
    );
}

function formatUpdatedAt(updatedAt?: string): string {
    if (!updatedAt) return 'Autosaved';
    const parsed = Date.parse(updatedAt);
    if (Number.isNaN(parsed)) return 'Autosaved';
    return new Date(parsed).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
