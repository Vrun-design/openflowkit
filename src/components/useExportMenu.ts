import { useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType, RefObject } from 'react';
import { Figma, FileCode, FileJson, GitBranch, Image, Wand2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFlowStore } from '@/store';

interface UseExportMenuParams {
    onExportPNG: (format: 'png' | 'jpeg') => void;
    onExportJSON: () => void;
    onExportMermaid: () => void;
    onExportPlantUML: () => void;
    onExportOpenFlowDSL: () => void;
    onExportFigma: () => void;
}

interface ExportOption {
    key: string;
    label: string;
    hint: string;
    Icon: ComponentType<{ className?: string }>;
}

interface UseExportMenuResult {
    isOpen: boolean;
    menuRef: RefObject<HTMLDivElement>;
    exportOptions: ExportOption[];
    toggleMenu: () => void;
    handleSelect: (key: string) => void;
}

export function useExportMenu({
    onExportPNG,
    onExportJSON,
    onExportMermaid,
    onExportPlantUML,
    onExportOpenFlowDSL,
    onExportFigma,
}: UseExportMenuParams): UseExportMenuResult {
    const { brandConfig } = useFlowStore();
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const exportOptions = useMemo<ExportOption[]>(() => [
        { key: 'png', label: t('export.png', 'Export PNG'), hint: t('export.hintTransparent4K', 'Transparent (4K)'), Icon: Image },
        { key: 'jpeg', label: t('export.jpeg', 'Export JPG'), hint: t('export.hintWhiteBg4K', 'White Background (4K)'), Icon: Image },
        { key: 'json', label: t('export.jsonLabel', 'JSON File'), hint: t('export.hintDownload', 'Download'), Icon: FileJson },
        { key: 'openflow', label: t('export.openflowdslLabel', { appName: brandConfig.appName, defaultValue: `${brandConfig.appName} DSL` }), hint: t('export.hintClipboard', 'Copy to clipboard'), Icon: Wand2 },
        { key: 'mermaid', label: t('export.mermaid', 'Mermaid'), hint: t('export.hintClipboard', 'Copy to clipboard'), Icon: GitBranch },
        { key: 'plantuml', label: t('export.plantuml', 'PlantUML'), hint: t('export.hintClipboard', 'Copy to clipboard'), Icon: FileCode },
        { key: 'figma', label: t('export.figmaEditable', 'Figma Editable'), hint: t('export.hintClipboard', 'Copy to clipboard'), Icon: Figma },
    ], [brandConfig.appName, t]);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
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

    function toggleMenu(): void {
        setIsOpen((value) => !value);
    }

    function handleSelect(key: string): void {
        handlers[key]?.();
        setIsOpen(false);
    }

    return {
        isOpen,
        menuRef,
        exportOptions,
        toggleMenu,
        handleSelect,
    };
}
