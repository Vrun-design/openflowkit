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
    cardClassName = 'group rounded-[var(--radius-md)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] p-3 transition-all hover:border-[var(--brand-primary-200)] hover:bg-[var(--brand-surface)]',
    titleClassName = 'text-sm font-semibold text-[var(--brand-text)]',
}: SnapshotCardListProps): React.ReactElement {
    return (
        <>
            {snapshots.map((snapshot) => (
                <div key={snapshot.id} className={cardClassName}>
                    <div className="flex items-start justify-between mb-2">
                        <div>
                            <h4 className={titleClassName}>{snapshot.name}</h4>
                            <p className="text-xs text-[var(--brand-secondary)]">{new Date(snapshot.timestamp).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {onCompareSnapshot && (
                                <button
                                    type="button"
                                    onClick={() => onCompareSnapshot(snapshot)}
                                    aria-label="Compare snapshot with current diagram"
                                    title="Compare with current"
                                    className="rounded-[var(--radius-sm)] p-1.5 text-[var(--brand-secondary)] transition-colors hover:bg-[var(--brand-surface)] hover:text-[var(--brand-primary)]"
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
                                className="rounded-[var(--radius-sm)] p-1.5 text-red-500 transition-colors hover:bg-red-500/10"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                    <div className="flex gap-2 text-xs text-[var(--brand-secondary-light)]">
                        <span className="rounded-[var(--radius-sm)] bg-[var(--brand-surface)] px-1.5 py-0.5 text-[var(--brand-secondary)]">{nodesLabel(snapshot.nodes.length)}</span>
                        <span className="rounded-[var(--radius-sm)] bg-[var(--brand-surface)] px-1.5 py-0.5 text-[var(--brand-secondary)]">{edgesLabel(snapshot.edges.length)}</span>
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
        <div className="absolute top-20 right-6 z-40 flex max-h-[calc(100vh-140px)] w-80 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] shadow-[var(--shadow-lg)] ring-1 ring-black/5 backdrop-blur-md animate-in slide-in-from-right-10 duration-200">
            <div className="flex items-center justify-between border-b border-[var(--color-brand-border)] bg-[var(--brand-background)] p-4">
                <h3 className="flex items-center gap-2 font-semibold text-[var(--brand-text)]">
                    <Clock className="w-4 h-4 text-[var(--brand-primary)]" />
                    <span>{t('snapshotsPanel.title')}</span>
                </h3>
                <button type="button" onClick={onClose} className="rounded-[var(--radius-sm)] p-1 text-[var(--brand-secondary)] transition-colors hover:bg-[var(--brand-surface)] hover:text-[var(--brand-text)]" aria-label={t('snapshotsPanel.close', 'Close snapshots panel')}>
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="space-y-3 border-b border-[var(--color-brand-border)] bg-[var(--brand-surface)] p-4">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--brand-secondary-light)]">{t('snapshotsPanel.saveCurrentVersion')}</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newSnapshotName}
                        data-testid="snapshot-name-input"
                        onChange={(e) => setNewSnapshotName(e.target.value)}
                        placeholder={t('snapshotsPanel.versionName')}
                        className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] px-3 py-2 text-sm text-[var(--brand-text)] outline-none placeholder:text-[var(--brand-secondary-light)] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20"
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

            <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto bg-[var(--brand-surface)] p-4">
                {snapshots.length === 0 ? (
                    <div className="py-8 text-center text-[var(--brand-secondary-light)]">
                        <p className="text-sm">{t('snapshotsPanel.noSnapshots')}</p>
                    </div>
                ) : (
                    <>
                        <section className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--brand-secondary-light)]">
                                {t('snapshotsPanel.namedVersions', 'Named Versions')}
                            </h4>
                            {manualSnapshots.length === 0 ? (
                                <p className="text-xs text-[var(--brand-secondary-light)]">{t('snapshotsPanel.noNamedSnapshots', 'No named versions yet.')}</p>
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
                                    cardClassName="group rounded-[var(--radius-md)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] p-3 transition-all hover:border-[var(--brand-primary-200)] hover:bg-[var(--brand-surface)] hover:shadow-md"
                                    titleClassName="text-sm font-semibold text-[var(--brand-text)]"
                                />
                            )}
                        </section>

                        <section className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--brand-secondary-light)]">
                                {t('snapshotsPanel.autosavedVersions', 'Autosaved Checkpoints')}
                            </h4>
                            {autoSnapshots.length === 0 ? (
                                <p className="text-xs text-[var(--brand-secondary-light)]">{t('snapshotsPanel.noAutoSnapshots', 'No autosaved checkpoints yet.')}</p>
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
                                    cardClassName="group rounded-[var(--radius-md)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] p-3 transition-all hover:border-[var(--brand-primary-200)] hover:bg-[var(--brand-surface)]"
                                    titleClassName="text-sm font-semibold text-[var(--brand-text)]"
                                />
                            )}
                        </section>
                    </>
                )}
            </div>
        </div>
    );
};
