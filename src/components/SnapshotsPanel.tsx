import React, { useState } from 'react';
import { X, Save, Clock, Trash2, RotateCcw, GitCompare, Download } from 'lucide-react';
import { FlowSnapshot } from '@/lib/types';
import { useTranslation } from 'react-i18next';
import {
    buildPreDeleteSnapshotBackup,
    downloadDestructiveActionBackup,
    type DestructiveActionBackup,
} from '@/services/storage/destructiveActionBackup';

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
    historyPastCount: number;
    historyFutureCount: number;
    onScrubHistoryTo: (index: number) => void;
}

interface SnapshotCardListProps {
    snapshots: FlowSnapshot[];
    onRestoreSnapshot: (snapshot: FlowSnapshot) => void;
    onDeleteSnapshot: (id: string) => void;
    onCompareSnapshot?: (snapshot: FlowSnapshot) => void;
    restoreVersionTitle: string;
    deleteVersionTitle: string;
    compareVersionTitle: string;
    preparingBackupTitle: string;
    downloadBackupAndDeleteTitle: string;
    retryBackupTitle: string;
    backupFailedMessage: string;
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
    compareVersionTitle,
    preparingBackupTitle,
    downloadBackupAndDeleteTitle,
    retryBackupTitle,
    backupFailedMessage,
    nodesLabel,
    edgesLabel,
    cardClassName = 'group rounded-[var(--radius-md)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] p-3 transition-all hover:border-[var(--brand-primary-200)] hover:bg-[var(--brand-surface)]',
    titleClassName = 'text-sm font-semibold text-[var(--brand-text)]',
}: SnapshotCardListProps): React.ReactElement {
    const [deletion, setDeletion] = useState<
        | { status: 'idle' }
        | { status: 'preparing'; snapshotId: string }
        | { status: 'ready'; snapshotId: string; backup: DestructiveActionBackup }
        | { status: 'failed'; snapshotId: string }
    >({ status: 'idle' });

    function handleDelete(snapshot: FlowSnapshot): void {
        if (deletion.status === 'ready' && deletion.snapshotId === snapshot.id) {
            try {
                downloadDestructiveActionBackup(deletion.backup);
                onDeleteSnapshot(snapshot.id);
                setDeletion({ status: 'idle' });
            } catch {
                setDeletion({ status: 'failed', snapshotId: snapshot.id });
            }
            return;
        }

        setDeletion({ status: 'preparing', snapshotId: snapshot.id });
        void buildPreDeleteSnapshotBackup(snapshot).then(
            (backup) => setDeletion((current) =>
                current.status !== 'idle' && current.snapshotId === snapshot.id
                    ? { status: 'ready', snapshotId: snapshot.id, backup }
                    : current),
            () => setDeletion((current) =>
                current.status !== 'idle' && current.snapshotId === snapshot.id
                    ? { status: 'failed', snapshotId: snapshot.id }
                    : current)
        );
    }

    return (
        <>
            {snapshots.map((snapshot) => (
                <div key={snapshot.id} className={cardClassName}>
                    <div className="flex items-start justify-between mb-2">
                        <div>
                            <h4 className={titleClassName}>{snapshot.name}</h4>
                            <p className="text-xs text-[var(--brand-secondary)]">{new Date(snapshot.timestamp).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                            {onCompareSnapshot && (
                                <button
                                    type="button"
                                    onClick={() => onCompareSnapshot(snapshot)}
                                    aria-label={`${compareVersionTitle}: ${snapshot.name}`}
                                    title={compareVersionTitle}
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
                                onClick={() => handleDelete(snapshot)}
                                disabled={deletion.status === 'preparing'
                                    && deletion.snapshotId === snapshot.id}
                                data-testid={`snapshot-delete-${snapshot.id}`}
                                data-backup-status={deletion.status !== 'idle'
                                    && deletion.snapshotId === snapshot.id
                                    ? deletion.status
                                    : 'idle'}
                                aria-label={`${deletion.status === 'ready'
                                    && deletion.snapshotId === snapshot.id
                                    ? downloadBackupAndDeleteTitle
                                    : deletion.status === 'failed'
                                      && deletion.snapshotId === snapshot.id
                                      ? retryBackupTitle
                                      : deleteVersionTitle}: ${snapshot.name}`}
                                title={deletion.status === 'ready'
                                    && deletion.snapshotId === snapshot.id
                                    ? downloadBackupAndDeleteTitle
                                    : deleteVersionTitle}
                                className="rounded-[var(--radius-sm)] p-1.5 text-red-500 transition-colors hover:bg-red-500/10"
                            >
                                {deletion.status === 'ready'
                                    && deletion.snapshotId === snapshot.id
                                    ? <Download className="w-3.5 h-3.5" />
                                    : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    </div>
                    <div className="flex gap-2 text-xs text-[var(--brand-secondary-light)]">
                        <span className="rounded-[var(--radius-sm)] bg-[var(--brand-surface)] px-1.5 py-0.5 text-[var(--brand-secondary)]">{nodesLabel(snapshot.nodes.length)}</span>
                        <span className="rounded-[var(--radius-sm)] bg-[var(--brand-surface)] px-1.5 py-0.5 text-[var(--brand-secondary)]">{edgesLabel(snapshot.edges.length)}</span>
                    </div>
                    {deletion.status === 'preparing' && deletion.snapshotId === snapshot.id ? (
                        <p role="status" className="mt-2 text-xs text-[var(--brand-secondary)]">
                            {preparingBackupTitle}
                        </p>
                    ) : null}
                    {deletion.status === 'failed' && deletion.snapshotId === snapshot.id ? (
                        <p role="alert" className="mt-2 text-xs text-red-500">
                            {backupFailedMessage}
                        </p>
                    ) : null}
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
    historyPastCount,
    historyFutureCount,
    onScrubHistoryTo,
}) => {
    const { t } = useTranslation();
    const [newSnapshotName, setNewSnapshotName] = useState('');
    const restoreVersionTitle = t('snapshotsPanel.restoreVersion');
    const deleteVersionTitle = t('snapshotsPanel.deleteVersion');
    const compareVersionTitle = t('snapshotsPanel.compareVersion');
    const preparingBackupTitle = t('snapshotsPanel.preparingDeleteBackup');
    const downloadBackupAndDeleteTitle = t('snapshotsPanel.downloadBackupAndDelete');
    const retryBackupTitle = t('snapshotsPanel.retryDeleteBackup');
    const backupFailedMessage = t('snapshotsPanel.deleteBackupFailed');
    const nodesLabel = (count: number): string => t('snapshotsPanel.nodes', { count });
    const edgesLabel = (count: number): string => t('snapshotsPanel.edges', { count });
    const historyTotalSteps = historyPastCount + historyFutureCount + 1;
    const historyCurrentIndex = historyPastCount;

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
                <section className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] p-3">
                    <div className="space-y-1">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--brand-secondary-light)]">
                            {t('snapshotsPanel.undoTimeline', 'Undo Timeline')}
                        </h4>
                        <p
                            id="snapshot-history-position"
                            aria-live="polite"
                            className="text-xs text-[var(--brand-secondary)]"
                        >
                            {historyCurrentIndex === 0
                                ? t('snapshotsPanel.undoTimelineAtEarliest', 'You are at the earliest captured state.')
                                : historyCurrentIndex === historyTotalSteps - 1
                                  ? t('snapshotsPanel.undoTimelineAtLatest', 'You are at the latest state.')
                                  : t('snapshotsPanel.undoTimelinePosition', 'Step {{current}} of {{total}} in the current history stack.', {
                                      current: historyCurrentIndex + 1,
                                      total: historyTotalSteps,
                                    })}
                        </p>
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={Math.max(historyTotalSteps - 1, 0)}
                        value={historyCurrentIndex}
                        onChange={(event) => onScrubHistoryTo(Number(event.currentTarget.value))}
                        aria-label={t('snapshotsPanel.undoTimelineScrubber', 'Scrub through recent undo history')}
                        aria-describedby="snapshot-history-position"
                        aria-valuetext={t('snapshotsPanel.undoTimelineValue', 'Step {{current}} of {{total}}', {
                            current: historyCurrentIndex + 1,
                            total: historyTotalSteps,
                        })}
                        className="w-full accent-[var(--brand-primary)]"
                    />
                    <div className="flex items-center justify-between text-[11px] text-[var(--brand-secondary)]">
                        <span>{t(historyPastCount === 1
                            ? 'snapshotsPanel.undoStep'
                            : 'snapshotsPanel.undoSteps', { count: historyPastCount })}</span>
                        <span>{t(historyFutureCount === 1
                            ? 'snapshotsPanel.redoStep'
                            : 'snapshotsPanel.redoSteps', { count: historyFutureCount })}</span>
                    </div>
                </section>
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
                                    compareVersionTitle={compareVersionTitle}
                                    preparingBackupTitle={preparingBackupTitle}
                                    downloadBackupAndDeleteTitle={downloadBackupAndDeleteTitle}
                                    retryBackupTitle={retryBackupTitle}
                                    backupFailedMessage={backupFailedMessage}
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
                                    compareVersionTitle={compareVersionTitle}
                                    preparingBackupTitle={preparingBackupTitle}
                                    downloadBackupAndDeleteTitle={downloadBackupAndDeleteTitle}
                                    retryBackupTitle={retryBackupTitle}
                                    backupFailedMessage={backupFailedMessage}
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
