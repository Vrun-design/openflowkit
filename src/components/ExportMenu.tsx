import React from 'react';
import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from './Tooltip';
import { Button } from './ui/Button';
import { useExportMenu } from './useExportMenu';

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
    const { isOpen, menuRef, exportOptions, toggleMenu, handleSelect } = useExportMenu({
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
                <div className="absolute top-full right-0 mt-2 w-52 bg-white/95 backdrop-blur-xl rounded-[var(--radius-lg)] shadow-xl border border-white/20 ring-1 ring-black/5 p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100 origin-top-right z-50">
                    <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {t('export.exportAs', 'Export As')}
                    </div>
                    {exportOptions.map(({ key, label, hint, Icon }) => (
                        <button
                            key={key}
                            onClick={() => handleSelect(key)}
                            title={`${label} - ${hint}`}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-[var(--brand-primary-50)] hover:text-[var(--brand-primary)] rounded-[var(--radius-sm)] transition-colors w-full text-left"
                        >
                            <Icon className="w-4 h-4 text-slate-400" />
                            <div className="flex flex-col">
                                <span className="font-medium">{label}</span>
                                <span className="text-[10px] text-slate-400">{hint}</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
