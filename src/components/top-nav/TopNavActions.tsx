import React, { lazy, Suspense } from 'react';
import { Play, Share2 } from 'lucide-react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { ExportMenu } from '@/components/ExportMenu';
import { Tooltip } from '@/components/Tooltip';
import { Button } from '@/components/ui/Button';

const LazyShareModal = lazy(async () => {
    const module = await import('@/components/ShareModal');
    return { default: module.ShareModal };
});

interface CollaborationState {
    roomId: string;
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
    onExportJSON: () => void;
    onExportMermaid: () => void;
    onExportPlantUML: () => void;
    onExportOpenFlowDSL: () => void;
    onExportFigma: () => void;
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
            return `${t('share.status.realtime', { defaultValue: 'Realtime peer sync' })}${cacheLabel}`;
        case 'waiting':
            return `${t('share.status.waiting', { defaultValue: 'Connecting to realtime sync' })}${cacheLabel}`;
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
            return 'bg-slate-400';
    }
}

export function TopNavActions({
    onPlay,
    onExportPNG,
    onExportJSON,
    onExportMermaid,
    onExportPlantUML,
    onExportOpenFlowDSL,
    onExportFigma,
    collaboration,
    isBeveled,
}: TopNavActionsProps): React.ReactElement {
    const { t } = useTranslation();
    const [isShareModalOpen, setIsShareModalOpen] = React.useState(false);
    const viewerCount = collaboration?.viewerCount ?? 1;
    const visibleViewerCount = Math.min(viewerCount, 4);
    const visibleParticipants = collaboration?.participants.slice(0, visibleViewerCount) ?? [];

    return (
        <div className="flex items-center gap-3 min-w-[240px] justify-end">
            <div className="flex items-center gap-2">
                {collaboration && (
                    <div className="flex items-center gap-2 mr-1 border-r border-slate-200/60 pr-3">
                        {/* Status Indicator */}
                        <Tooltip text={getCollaborationStatusLabel(collaboration.status, collaboration.cacheState, t)} side="bottom">
                            <div className={`w-2 h-2 rounded-full ${getCollaborationStatusDotClass(collaboration.status)}`} />
                        </Tooltip>

                        {/* Avatars */}
                        <div className="flex -space-x-2 overflow-hidden px-1">
                            {visibleParticipants.map((participant) => (
                                <Tooltip key={participant.clientId} text={participant.name} side="bottom">
                                    <div
                                        className="inline-flex h-8 w-8 rounded-full ring-2 ring-white flex items-center justify-center text-white text-[10px] font-bold shadow-sm"
                                        style={{ backgroundColor: participant.color }}
                                    >
                                        {getAvatarInitial(participant.name)}
                                    </div>
                                </Tooltip>
                            ))}
                            {viewerCount > 4 && (
                                <div className="inline-flex h-8 w-8 rounded-full ring-2 ring-white bg-slate-100 flex items-center justify-center text-slate-600 text-[10px] font-bold shadow-sm">
                                    +{viewerCount - 4}
                                </div>
                            )}
                        </div>

                        <Tooltip text={t('share.openDialog', 'Share dialog')} side="bottom">
                            <Button
                                variant="icon"
                                size="icon"
                                onClick={() => setIsShareModalOpen(true)}
                                className={`h-8 w-8 ml-1 rounded-[var(--radius-md)] border text-slate-600 transition-all ${isBeveled
                                    ? 'btn-beveled-secondary'
                                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm hover:shadow'
                                    }`}
                                icon={<Share2 className="w-4 h-4" />}
                            />
                        </Tooltip>
                    </div>
                )}

                <Tooltip text={t('nav.playbackMode', 'Playback Mode')} side="bottom">
                    <Button
                        variant="secondary"
                        onClick={onPlay}
                        data-testid="topnav-play"
                        className="h-9 px-4 text-sm font-medium"
                        icon={<Play className="w-3.5 h-3.5 mr-1" />}
                    >
                        {t('common.play', 'Play')}
                    </Button>
                </Tooltip>

                <ExportMenu
                    onExportPNG={onExportPNG}
                    onExportJSON={onExportJSON}
                    onExportMermaid={onExportMermaid}
                    onExportPlantUML={onExportPlantUML}
                    onExportOpenFlowDSL={onExportOpenFlowDSL}
                    onExportFigma={onExportFigma}
                />
            </div>

            {collaboration && isShareModalOpen ? (
                <Suspense fallback={null}>
                    <LazyShareModal
                        isOpen={isShareModalOpen}
                        onClose={() => setIsShareModalOpen(false)}
                        onCopyInvite={collaboration.onCopyShareLink}
                        roomId={collaboration.roomId}
                        cacheState={collaboration.cacheState}
                        status={collaboration.status}
                        viewerCount={viewerCount}
                    />
                </Suspense>
            ) : null}
        </div>
    );
}
