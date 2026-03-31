import React, { lazy, Suspense } from 'react';
import { Play, Share2 } from 'lucide-react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import type { CinematicExportRequest } from '@/services/export/cinematicExport';
import { ExportMenu } from '@/components/ExportMenu';
import { Tooltip } from '@/components/Tooltip';
import { Button } from '@/components/ui/Button';

const LazyShareModal = lazy(async () => {
    const module = await import('@/components/ShareModal');
    return { default: module.ShareModal };
});

interface CollaborationState {
    roomId: string;
    inviteUrl: string;
    viewerCount: number;
    status: 'realtime' | 'waiting' | 'fallback';
    cacheState: 'unavailable' | 'syncing' | 'ready' | 'hydrated';
    participants: Array<{
        clientId: string;
        name: string;
        color: string;
        isLocal: boolean;
    }>;
    onCopyShareLink: () => void;
}

interface TopNavActionsProps {
    onPlay: () => void;
    onExportPNG: (format?: 'png' | 'jpeg') => void;
    onCopyImage: (format?: 'png' | 'jpeg') => void;
    onExportSVG: () => void;
    onCopySVG: () => void;
    onExportPDF: () => void;
    onExportCinematic: (request: CinematicExportRequest) => void;
    onExportJSON: () => void;
    onCopyJSON: () => void;
    onExportMermaid: () => void;
    onDownloadMermaid: () => void;
    onExportPlantUML: () => void;
    onDownloadPlantUML: () => void;
    onExportOpenFlowDSL: () => void;
    onDownloadOpenFlowDSL: () => void;
    onExportFigma: () => void;
    onDownloadFigma: () => void;
    onShare: () => void;
    collaboration?: CollaborationState;
    isBeveled: boolean;
}

function getAvatarInitial(name: string): string {
    const trimmedName = name.replace(/\(You\)$/u, '').trim();
    if (!trimmedName) {
        return '?';
    }

    const parts = trimmedName.split(/\s+/u).filter(Boolean);
    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function getCollaborationStatusLabel(
    status: CollaborationState['status'],
    cacheState: CollaborationState['cacheState'],
    t: TFunction<'translation', undefined>
): string {
    const cacheLabel = (() => {
        switch (cacheState) {
            case 'syncing':
                return t('share.status.cache.syncing', { defaultValue: ' local cache syncing' });
            case 'ready':
                return t('share.status.cache.ready', { defaultValue: ' local cache ready' });
            case 'hydrated':
                return t('share.status.cache.hydrated', { defaultValue: ' restored from local cache' });
            default:
                return '';
        }
    })();

    switch (status) {
        case 'realtime':
            return `${t('share.status.realtime', { defaultValue: 'Live collaboration ready' })}${cacheLabel}`;
        case 'waiting':
            return `${t('share.status.waiting', { defaultValue: 'Connecting live collaboration' })}${cacheLabel}`;
        default:
            return `${t('share.status.fallback', { defaultValue: 'Local-only mode' })}${cacheLabel}`;
    }
}

function getCollaborationStatusDotClass(status: CollaborationState['status']): string {
    switch (status) {
        case 'realtime':
            return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]';
        case 'waiting':
            return 'bg-amber-400 animate-pulse';
        default:
            return 'bg-[var(--brand-secondary-light)]';
    }
}

export function TopNavActions({
    onPlay,
    onExportPNG,
    onCopyImage,
    onExportSVG,
    onCopySVG,
    onExportPDF,
    onExportCinematic,
    onExportJSON,
    onCopyJSON,
    onExportMermaid,
    onDownloadMermaid,
    onExportPlantUML,
    onDownloadPlantUML,
    onExportOpenFlowDSL,
    onDownloadOpenFlowDSL,
    onExportFigma,
    onDownloadFigma,
    onShare,
    collaboration,
    isBeveled,
}: TopNavActionsProps): React.ReactElement {
    const { t } = useTranslation();
    const { resolvedTheme } = useTheme();
    const playLabel = t('common.play', 'Preview');
    const [isShareModalOpen, setIsShareModalOpen] = React.useState(false);
    const viewerCount = collaboration?.viewerCount ?? 1;
    const visibleViewerCount = Math.min(viewerCount, 4);
    const visibleParticipants = collaboration?.participants.slice(0, visibleViewerCount) ?? [];
    const shareButtonClassName = `ml-1 h-10 w-10 rounded-[var(--radius-md)] sm:h-9 sm:w-9 ${isBeveled ? 'btn-beveled-secondary' : ''}`;
    const playButtonClassName = 'h-10 px-2.5 font-medium sm:h-9 sm:px-3';

    return (
        <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
                {collaboration && (
                    <div className="mr-1 hidden items-center gap-2 border-r border-[var(--color-brand-border)]/80 pr-3 md:flex">
                        {/* Status Indicator */}
                        <Tooltip text={getCollaborationStatusLabel(collaboration.status, collaboration.cacheState, t)} side="bottom">
                            <div className={`w-2 h-2 rounded-full ${getCollaborationStatusDotClass(collaboration.status)}`} />
                        </Tooltip>

                        {/* Avatars */}
                        <div className="flex -space-x-2 overflow-hidden px-1">
                            {visibleParticipants.map((participant) => (
                                <Tooltip key={participant.clientId} text={participant.name} side="bottom">
                                    <div
                                        className="inline-flex h-8 w-8 rounded-full ring-2 ring-[var(--brand-surface)] flex items-center justify-center text-white text-[10px] font-bold shadow-sm"
                                        style={{ backgroundColor: participant.color }}
                                    >
                                        {getAvatarInitial(participant.name)}
                                    </div>
                                </Tooltip>
                            ))}
                            {viewerCount > 4 && (
                                <div className="inline-flex h-8 w-8 rounded-full ring-2 ring-[var(--brand-surface)] bg-[var(--brand-background)] flex items-center justify-center text-[var(--brand-secondary)] text-[10px] font-bold shadow-sm">
                                    +{viewerCount - 4}
                                </div>
                            )}
                        </div>

                        <Tooltip text={t('share.openDialog', 'Open sharing')} side="bottom">
                            <Button
                                variant="secondary"
                                size="icon"
                                onClick={() => setIsShareModalOpen(true)}
                                data-testid="topnav-share"
                                className={shareButtonClassName}
                                icon={<Share2 className="w-4 h-4" />}
                            />
                        </Tooltip>
                    </div>
                )}

                <Tooltip text={t('nav.playbackMode', 'Preview playback')} side="bottom">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={onPlay}
                        data-testid="topnav-play"
                        aria-label={playLabel}
                        className={playButtonClassName}
                        icon={<Play className="h-3.5 w-3.5 sm:mr-1" />}
                    >
                        <span className="hidden sm:inline">{playLabel}</span>
                    </Button>
                </Tooltip>

                <ExportMenu
                    onExportPNG={onExportPNG}
                    onCopyImage={onCopyImage}
                    onExportSVG={onExportSVG}
                    onCopySVG={onCopySVG}
                    onExportPDF={onExportPDF}
                    onExportCinematic={onExportCinematic}
                    onExportJSON={onExportJSON}
                    onCopyJSON={onCopyJSON}
                    onExportMermaid={onExportMermaid}
                    onDownloadMermaid={onDownloadMermaid}
                    onExportPlantUML={onExportPlantUML}
                    onDownloadPlantUML={onDownloadPlantUML}
                    onExportOpenFlowDSL={onExportOpenFlowDSL}
                    onDownloadOpenFlowDSL={onDownloadOpenFlowDSL}
                    onExportFigma={onExportFigma}
                    onDownloadFigma={onDownloadFigma}
                    onShare={onShare}
                    cinematicThemeMode={resolvedTheme}
                />
            </div>

            {collaboration && isShareModalOpen ? (
                <Suspense fallback={null}>
                    <LazyShareModal
                        isOpen={isShareModalOpen}
                        onClose={() => setIsShareModalOpen(false)}
                        onCopyInvite={collaboration.onCopyShareLink}
                        roomId={collaboration.roomId}
                        inviteUrl={collaboration.inviteUrl}
                        status={collaboration.status}
                        viewerCount={viewerCount}
                        participants={collaboration.participants}
                    />
                </Suspense>
            ) : null}
        </div>
    );
}
