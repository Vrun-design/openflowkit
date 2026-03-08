import React, { Suspense, lazy } from 'react';
import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from './Tooltip';
import { Button } from './ui/Button';
import { useExportMenu } from './useExportMenu';

const LazyExportMenuPanel = lazy(async () => {
    const module = await import('./ExportMenuPanel');
    return { default: module.ExportMenuPanel };
});

interface ExportMenuProps {
    onExportPNG: (format: 'png' | 'jpeg') => void;
    onExportJSON: () => void;
    onExportMermaid: () => void;
    onExportPlantUML: () => void;
    onExportOpenFlowDSL: () => void;
    onExportFigma: () => void;
}

export const ExportMenu: React.FC<ExportMenuProps> = ({
    onExportPNG,
    onExportJSON,
    onExportMermaid,
    onExportPlantUML,
    onExportOpenFlowDSL,
    onExportFigma,
}) => {
    const { t } = useTranslation();
    const { isOpen, menuRef, toggleMenu, handleSelect } = useExportMenu({
        onExportPNG,
        onExportJSON,
        onExportMermaid,
        onExportPlantUML,
        onExportOpenFlowDSL,
        onExportFigma,
    });

    return (
        <div className="relative" ref={menuRef}>
            <Tooltip text={t('export.exportDiagram', 'Export Diagram')} side="bottom">
                <Button
                    onClick={toggleMenu}
                    className="h-9 px-4 text-sm"
                >
                    <Download className="w-4 h-4 mr-2" />
                    {t('export.title', 'Export')}
                </Button>
            </Tooltip>

            {isOpen && (
                <Suspense fallback={null}>
                    <LazyExportMenuPanel onSelect={handleSelect} />
                </Suspense>
            )}
        </div>
    );
};
