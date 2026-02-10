import React, { useState, useRef, useEffect } from 'react';
import { Download, Image, FileJson, GitBranch, FileCode, Wand2, X } from 'lucide-react';

import { Tooltip } from './Tooltip';

interface ExportMenuProps {
    onExportPNG: () => void;
    onExportJSON: () => void;
    onExportMermaid: () => void;
    onExportPlantUML: () => void;
    onExportFlowMindDSL: () => void;
}

const EXPORT_OPTIONS = [
    { key: 'png', label: 'PNG Image', hint: 'Download', Icon: Image },
    { key: 'json', label: 'JSON File', hint: 'Download', Icon: FileJson },
    { key: 'flowmind', label: 'FlowMind DSL', hint: 'Copy to clipboard', Icon: Wand2 },
    { key: 'mermaid', label: 'Mermaid', hint: 'Copy to clipboard', Icon: GitBranch },
    { key: 'plantuml', label: 'PlantUML', hint: 'Copy to clipboard', Icon: FileCode },
] as const;

export const ExportMenu: React.FC<ExportMenuProps> = ({
    onExportPNG,
    onExportJSON,
    onExportMermaid,
    onExportPlantUML,
    onExportFlowMindDSL,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

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
        png: onExportPNG,
        json: onExportJSON,
        flowmind: onExportFlowMindDSL,
        mermaid: onExportMermaid,
        plantuml: onExportPlantUML,
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
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                    <Download className="w-4 h-4" />
                </button>
            </Tooltip>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100 origin-top-right z-50">
                    <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Export As
                    </div>
                    {EXPORT_OPTIONS.map(({ key, label, hint, Icon }) => (
                        <button
                            key={key}
                            onClick={() => handleSelect(key)}
                            title={`${label} - ${hint}`}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors w-full text-left"
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
