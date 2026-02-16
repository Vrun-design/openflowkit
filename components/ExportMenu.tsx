import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Download, Image, FileJson, GitBranch, FileCode, Wand2, X, Figma } from 'lucide-react';
import { useFlowStore } from '../store';
import { Tooltip } from './Tooltip';

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
    const { brandConfig } = useFlowStore();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const exportOptions = useMemo(() => [
        { key: 'png', label: 'Export PNG', hint: 'Transparent (4K)', Icon: Image },
        { key: 'jpeg', label: 'Export JPG', hint: 'White Background (4K)', Icon: Image },
        { key: 'json', label: 'JSON File', hint: 'Download', Icon: FileJson },
        { key: 'openflow', label: `${brandConfig.appName} DSL`, hint: 'Copy to clipboard', Icon: Wand2 },
        { key: 'mermaid', label: 'Mermaid', hint: 'Copy to clipboard', Icon: GitBranch },
        { key: 'plantuml', label: 'PlantUML', hint: 'Copy to clipboard', Icon: FileCode },
        { key: 'figma', label: 'Figma Editable', hint: 'Copy to clipboard', Icon: Figma },
    ], [brandConfig.appName]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handlers: Record<string, () => void> = {
        png: () => onExportPNG('png'),
        jpeg: () => onExportPNG('jpeg'),
        json: onExportJSON,
        openflow: onExportOpenFlowDSL,
        mermaid: onExportMermaid,
        plantuml: onExportPlantUML,
        figma: onExportFigma,
    };

    const handleSelect = (key: string) => {
        handlers[key]();
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={menuRef}>
            <Tooltip text="Export Diagram" side="bottom">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--brand-primary)] hover:brightness-110 rounded-[var(--radius-md)] shadow-sm shadow-[var(--brand-primary)]/20 transition-all active:scale-95"
                >
                    <Download className="w-4 h-4" />
                    Export
                </button>
            </Tooltip>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-52 bg-white/95 backdrop-blur-xl rounded-[var(--radius-lg)] shadow-xl border border-white/20 ring-1 ring-black/5 p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100 origin-top-right z-50">
                    <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Export As
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
