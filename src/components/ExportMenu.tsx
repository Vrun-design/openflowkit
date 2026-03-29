import React, { Suspense, lazy, useState } from 'react';
import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from './Tooltip';
import { Button } from './ui/Button';
import { useExportMenu } from './useExportMenu';

type CinematicSpeed = 'slow' | 'normal' | 'fast';
type CinematicResolution = '720p' | '1080p' | '4k';

const LazyExportMenuPanel = lazy(async () => {
  const module = await import('./ExportMenuPanel');
  return { default: module.ExportMenuPanel };
});

interface ExportMenuProps {
  onExportPNG: (format: 'png' | 'jpeg') => void;
  onCopyImage: (format: 'png' | 'jpeg') => void;
  onExportSVG: () => void;
  onCopySVG: () => void;
  onExportPDF: () => void;
  onExportCinematic: (format: 'cinematic-video' | 'cinematic-gif') => void;
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
  cinematicSpeed?: CinematicSpeed;
  onCinematicSpeedChange?: (speed: CinematicSpeed) => void;
  cinematicResolution?: CinematicResolution;
  onCinematicResolutionChange?: (res: CinematicResolution) => void;
  cinematicTransparent?: boolean;
  onCinematicTransparentChange?: (transparent: boolean) => void;
}

export const ExportMenu: React.FC<ExportMenuProps> = ({
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
  cinematicSpeed,
  onCinematicSpeedChange,
  cinematicResolution,
  onCinematicResolutionChange,
  cinematicTransparent,
  onCinematicTransparentChange,
}) => {
  const { t } = useTranslation();
  const exportLabel = t('export.title', 'Export');
  const [cinematicSpeedState, setCinematicSpeedState] = useState<CinematicSpeed>('normal');
  const [cinematicResolutionState, setCinematicResolutionState] =
    useState<CinematicResolution>('1080p');
  const [cinematicTransparentState, setCinematicTransparentState] = useState(false);
  const effectiveSpeed = cinematicSpeed ?? cinematicSpeedState;
  const effectiveSpeedChange = onCinematicSpeedChange ?? setCinematicSpeedState;
  const effectiveResolution = cinematicResolution ?? cinematicResolutionState;
  const effectiveResolutionChange = onCinematicResolutionChange ?? setCinematicResolutionState;
  const effectiveTransparent = cinematicTransparent ?? cinematicTransparentState;
  const effectiveTransparentChange = onCinematicTransparentChange ?? setCinematicTransparentState;
  const {
    isOpen,
    menuRef,
    toggleMenu,
    handleSelect,
  } = useExportMenu({
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
  });

  return (
    <div className="relative" ref={menuRef}>
      <Tooltip text={t('export.exportOrShare', 'Export or share this canvas')} side="bottom">
        <Button
          onClick={toggleMenu}
          data-testid="topnav-export"
          size="sm"
          aria-label={exportLabel}
          className="h-10 w-10 px-0 sm:h-9 sm:w-auto sm:px-3"
        >
          <Download className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">{exportLabel}</span>
        </Button>
      </Tooltip>

      {isOpen && (
        <Suspense fallback={null}>
          <LazyExportMenuPanel
            onSelect={handleSelect}
            cinematicSpeed={effectiveSpeed}
            onCinematicSpeedChange={effectiveSpeedChange}
            cinematicResolution={effectiveResolution}
            onCinematicResolutionChange={effectiveResolutionChange}
            cinematicTransparent={effectiveTransparent}
            onCinematicTransparentChange={effectiveTransparentChange}
          />
        </Suspense>
      )}
    </div>
  );
};
