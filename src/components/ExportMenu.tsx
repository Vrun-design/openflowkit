import React, { Suspense, lazy, useState } from 'react';
import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  createDefaultCinematicExportRequest,
  type CinematicExportRequest,
  type CinematicExportResolution,
  type CinematicExportSpeed,
  type CinematicThemeMode,
} from '@/services/export/cinematicExport';
import { Tooltip } from './Tooltip';
import { Button } from './ui/Button';
import { useExportMenu } from './useExportMenu';

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
  cinematicSpeed?: CinematicExportSpeed;
  onCinematicSpeedChange?: (speed: CinematicExportSpeed) => void;
  cinematicResolution?: CinematicExportResolution;
  onCinematicResolutionChange?: (res: CinematicExportResolution) => void;
  cinematicThemeMode: CinematicThemeMode;
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
  cinematicThemeMode,
}) => {
  const { t } = useTranslation();
  const exportLabel = t('export.title', 'Export');
  const defaultRequest = createDefaultCinematicExportRequest(cinematicThemeMode);
  const [cinematicSpeedState, setCinematicSpeedState] = useState<CinematicExportSpeed>(
    defaultRequest.speed
  );
  const [cinematicResolutionState, setCinematicResolutionState] =
    useState<CinematicExportResolution>(defaultRequest.resolution);
  const effectiveSpeed = cinematicSpeed ?? cinematicSpeedState;
  const effectiveSpeedChange = onCinematicSpeedChange ?? setCinematicSpeedState;
  const effectiveResolution = cinematicResolution ?? cinematicResolutionState;
  const effectiveResolutionChange = onCinematicResolutionChange ?? setCinematicResolutionState;
  const cinematicExportRequest: CinematicExportRequest = {
    format: 'cinematic-video',
    speed: effectiveSpeed,
    resolution: effectiveResolution,
    themeMode: cinematicThemeMode,
  };
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
    getCinematicExportRequest: () => cinematicExportRequest,
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
          />
        </Suspense>
      )}
    </div>
  );
};
