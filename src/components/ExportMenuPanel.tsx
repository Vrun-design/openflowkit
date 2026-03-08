import React from 'react';
import type { ComponentType } from 'react';
import { Figma, FileCode, FileJson, GitBranch, Image, Wand2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBrandConfig } from '@/store/brandHooks';

interface ExportMenuPanelProps {
    onSelect: (key: string) => void;
}

interface ExportOption {
    key: string;
    label: string;
    hint: string;
    Icon: ComponentType<MenuIconComponentProps>;
}

type MenuIconComponentProps = {
    className?: string;
};

export function ExportMenuPanel({ onSelect }: ExportMenuPanelProps): React.ReactElement {
    const { t } = useTranslation();
    const brandConfig = useBrandConfig();

    const exportOptions: ExportOption[] = [
        { key: 'png', label: t('export.png', 'Export PNG'), hint: t('export.hintTransparent4K', 'Transparent (4K)'), Icon: Image },
        { key: 'jpeg', label: t('export.jpeg', 'Export JPG'), hint: t('export.hintWhiteBg4K', 'White Background (4K)'), Icon: Image },
        { key: 'json', label: t('export.jsonLabel', 'JSON File'), hint: t('export.hintDownload', 'Download'), Icon: FileJson },
        { key: 'openflow', label: t('export.openflowdslLabel', { appName: brandConfig.appName, defaultValue: `${brandConfig.appName} DSL` }), hint: t('export.hintClipboard', 'Copy to clipboard'), Icon: Wand2 },
        { key: 'mermaid', label: t('export.mermaid', 'Mermaid'), hint: t('export.hintClipboard', 'Copy to clipboard'), Icon: GitBranch },
        { key: 'plantuml', label: t('export.plantuml', 'PlantUML'), hint: t('export.hintClipboard', 'Copy to clipboard'), Icon: FileCode },
        { key: 'figma', label: t('export.figmaEditable', 'Figma Editable'), hint: t('export.hintClipboard', 'Copy to clipboard'), Icon: Figma },
    ];

    return (
        <div className="absolute top-full right-0 mt-2 w-52 bg-white/95 backdrop-blur-xl rounded-[var(--radius-lg)] shadow-xl border border-white/20 ring-1 ring-black/5 p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100 origin-top-right z-50">
            <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {t('export.exportAs', 'Export As')}
            </div>
            {exportOptions.map(({ key, label, hint, Icon }) => (
                <button
                    key={key}
                    onClick={() => onSelect(key)}
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
    );
}
