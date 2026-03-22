import React, { useState } from 'react';
import { X, Save, Clock, Trash2, RotateCcw, GitCompare } from 'lucide-react';
import { FlowSnapshot } from '@/lib/types';
import { useTranslation } from 'react-i18next';

interface SnapshotsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    snapshots: FlowSnapshot[];
    manualSnapshots: FlowSnapshot[];
    autoSnapshots: FlowSnapshot[];
    onSaveSnapshot: (name: string) => void;
    onRestoreSnapshot: (snapshot: FlowSnapshot) => void;
    onDeleteSnapshot: (id: string) => void;
    onCompareSnapshot?: (snapshot: FlowSnapshot) => void;
}

interface SnapshotCardListProps {
    snapshots: FlowSnapshot[];
    onRestoreSnapshot: (snapshot: FlowSnapshot) => void;
    onDeleteSnapshot: (id: string) => void;
    onCompareSnapshot?: (snapshot: FlowSnapshot) => void;
    restoreVersionTitle: string;
    deleteVersionTitle: string;
    nodesLabel: (count: number) => string;
    edgesLabel: (count: number) => string;
    cardClassName?: string;
    titleClassName?: string;
}

function SnapshotCardList({
    snapshots,
    onRestoreSnapshot,
    onDeleteSnapshot,
    onCompareSnapshot,
    restoreVersionTitle,
    deleteVersionTitle,
    nodesLabel,
    edgesLabel,
    cardClassName = 'group p-3 rounded-[var(--radius-md)] border border-slate-200 bg-slate-50 hover:bg-white hover:border-[var(--brand-primary-200)] transition-all',
    titleClassName = 'text-sm font-semibold text-slate-800',
}: SnapshotCardListProps): React.ReactElement {
    return (
        <>
            {snapshots.map((snapshot) => (
                <div key={snapshot.id} className={cardClassName}>
                    <div className="flex items-start justify-between mb-2">
                        <div>
                            <h4 className={titleClassName}>{snapshot.name}</h4>
                            <p className="text-xs text-slate-500">{new Date(snapshot.timestamp).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {onCompareSnapshot && (
                                <button
                                    type="button"
                                    onClick={() => onCompareSnapshot(snapshot)}
                                    aria-label="Compare snapshot with current diagram"
                                    title="Compare with current"
                                    className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[var(--brand-primary)] rounded-[var(--radius-sm)] transition-colors"
                                >
                                    <GitCompare className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => onRestoreSnapshot(snapshot)}
                                data-testid={`snapshot-restore-${snapshot.id}`}
                                aria-label={`${restoreVersionTitle}: ${snapshot.name}`}
                                title={restoreVersionTitle}
                                className="p-1.5 text-[var(--brand-primary)] hover:bg-[var(--brand-primary-50)] rounded-[var(--radius-sm)] transition-colors"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => onDeleteSnapshot(snapshot.id)}
                                aria-label={`${deleteVersionTitle}: ${snapshot.name}`}
                                title={deleteVersionTitle}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-[var(--radius-sm)] transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                    <div className="flex gap-2 text-xs text-slate-400">
                        <span className="bg-slate-200 px-1.5 py-0.5 rounded-[var(--radius-sm)] text-slate-600">{nodesLabel(snapshot.nodes.length)}</span>
                        <span className="bg-slate-200 px-1.5 py-0.5 rounded-[var(--radius-sm)] text-slate-600">{edgesLabel(snapshot.edges.length)}</span>
                    </div>
                </div>
            ))}
        </>
    );
}

export const SnapshotsPanel: React.FC<SnapshotsPanelProps> = ({
    isOpen,
    onClose,
    snapshots,
    manualSnapshots,
    autoSnapshots,
    onSaveSnapshot,
    onRestoreSnapshot,
    onDeleteSnapshot,
    onCompareSnapshot,
}) => {
    const { t } = useTranslation();
    const [newSnapshotName, setNewSnapshotName] = useState('');
    const restoreVersionTitle = t('snapshotsPanel.restoreVersion');
    const deleteVersionTitle = t('snapshotsPanel.deleteVersion');
    const nodesLabel = (count: number): string => t('snapshotsPanel.nodes', { count });
    const edgesLabel = (count: number): string => t('snapshotsPanel.edges', { count });

    if (!isOpen) return null;

    const handleSave = () => {
        if (newSnapshotName.trim()) {
            onSaveSnapshot(newSnapshotName.trim());
            setNewSnapshotName('');
        }
    };

    return (
        <div className="absolute top-20 right-6 w-80 bg-white/95 backdrop-blur-md rounded-[var(--radius-lg)] shadow-2xl border border-white/20 ring-1 ring-black/5 flex flex-col overflow-hidden max-h-[calc(100vh-140px)] z-40 animate-in slide-in-from-right-10 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/80">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[var(--brand-primary)]" />
                    <span>{t('snapshotsPanel.title')}</span>
                </h3>
                <button type="button" onClick={onClose} className="p-1 hover:bg-slate-200 rounded-[var(--radius-sm)] text-slate-400 transition-colors" aria-label={t('snapshotsPanel.close', 'Close snapshots panel')}>
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="p-4 border-b border-slate-100 bg-white space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('snapshotsPanel.saveCurrentVersion')}</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newSnapshotName}
                        data-testid="snapshot-name-input"
                        onChange={(e) => setNewSnapshotName(e.target.value)}
                        placeholder={t('snapshotsPanel.versionName')}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)] text-sm outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)]"
                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    />
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!newSnapshotName.trim()}
                        aria-label={t('snapshotsPanel.saveCurrentVersion', 'Save current version')}
                        className="p-2 bg-[var(--brand-primary)] text-white rounded-[var(--radius-md)] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                    >
                        <Save className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="p-4 overflow-y-auto custom-scrollbar space-y-5 flex-1">
                {snapshots.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                        <p className="text-sm">{t('snapshotsPanel.noSnapshots')}</p>
                    </div>
                ) : (
                    <>
                        <section className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                {t('snapshotsPanel.namedVersions', 'Named Versions')}
                            </h4>
                            {manualSnapshots.length === 0 ? (
                                <p className="text-xs text-slate-400">{t('snapshotsPanel.noNamedSnapshots', 'No named versions yet.')}</p>
                            ) : (
                                <SnapshotCardList
                                    snapshots={manualSnapshots}
                                    onRestoreSnapshot={onRestoreSnapshot}
                                    onDeleteSnapshot={onDeleteSnapshot}
                                    onCompareSnapshot={onCompareSnapshot}
                                    restoreVersionTitle={restoreVersionTitle}
                                    deleteVersionTitle={deleteVersionTitle}
                                    nodesLabel={nodesLabel}
                                    edgesLabel={edgesLabel}
                                    cardClassName="group p-3 rounded-[var(--radius-md)] border border-slate-200 bg-slate-50 hover:bg-white hover:border-[var(--brand-primary-200)] hover:shadow-md transition-all"
                                    titleClassName="text-sm font-semibold text-slate-800"
                                />
                            )}
                        </section>

                        <section className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                {t('snapshotsPanel.autosavedVersions', 'Autosaved Checkpoints')}
                            </h4>
                            {autoSnapshots.length === 0 ? (
                                <p className="text-xs text-slate-400">{t('snapshotsPanel.noAutoSnapshots', 'No autosaved checkpoints yet.')}</p>
                            ) : (
                                <SnapshotCardList
                                    snapshots={autoSnapshots}
                                    onRestoreSnapshot={onRestoreSnapshot}
                                    onDeleteSnapshot={onDeleteSnapshot}
                                    onCompareSnapshot={onCompareSnapshot}
                                    restoreVersionTitle={restoreVersionTitle}
                                    deleteVersionTitle={deleteVersionTitle}
                                    nodesLabel={nodesLabel}
                                    edgesLabel={edgesLabel}
                                    cardClassName="group p-3 rounded-[var(--radius-md)] border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-[var(--brand-primary-200)] transition-all"
                                    titleClassName="text-sm font-semibold text-slate-700"
                                />
                            )}
                        </section>
                    </>
                )}
            </div>
        </div>
    );
};
