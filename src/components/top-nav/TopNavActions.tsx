import React from 'react';
import { Clock, FolderOpen, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ExportMenu } from '@/components/ExportMenu';
import { LanguageSelector } from '@/components/LanguageSelector';
import { Tooltip } from '@/components/Tooltip';
import { Button } from '@/components/ui/Button';

interface TopNavActionsProps {
    onHistory: () => void;
    onImportJSON: () => void;
    onPlay: () => void;
    onExportPNG: (format?: 'png' | 'jpeg') => void;
    onExportJSON: () => void;
    onExportMermaid: () => void;
    onExportPlantUML: () => void;
    onExportOpenFlowDSL: () => void;
    onExportFigma: () => void;
}

export function TopNavActions({
    onHistory,
    onImportJSON,
    onPlay,
    onExportPNG,
    onExportJSON,
    onExportMermaid,
    onExportPlantUML,
    onExportOpenFlowDSL,
    onExportFigma,
}: TopNavActionsProps): React.ReactElement {
    const { t } = useTranslation();

    return (
        <div className="flex items-center gap-3 min-w-[240px] justify-end">
            <div className="flex items-center gap-0.5 p-1 bg-slate-100/50 border border-slate-200/60 rounded-[var(--radius-md)]">
                <Tooltip text={t('nav.versionHistory', 'Version History')} side="bottom">
                    <button
                        onClick={onHistory}
                        data-testid="topnav-history"
                        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-[var(--radius-sm)] transition-all"
                    >
                        <Clock className="w-4 h-4" />
                    </button>
                </Tooltip>
                <div className="w-px h-4 bg-slate-200 mx-0.5" />
                <Tooltip text={t('nav.loadJSON', 'Load JSON')} side="bottom">
                    <button
                        onClick={onImportJSON}
                        className="p-2 text-slate-500 hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-50)] rounded-[var(--radius-sm)] transition-all"
                    >
                        <FolderOpen className="w-4 h-4" />
                    </button>
                </Tooltip>
            </div>

            <div className="h-8 w-px bg-slate-200/50 mx-2" />

            <div className="flex items-center gap-2">
                <LanguageSelector variant="minimal" />

                <Tooltip text={t('nav.playbackMode', 'Playback Mode')} side="bottom">
                    <Button
                        variant="secondary"
                        onClick={onPlay}
                        data-testid="topnav-play"
                        className="h-9 px-4 text-sm"
                        icon={<Play className="w-4 h-4 ml-1" />}
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
        </div>
    );
}
