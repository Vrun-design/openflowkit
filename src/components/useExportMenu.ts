import { useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';

interface UseExportMenuParams {
    onExportPNG: (format: 'png' | 'jpeg') => void;
    onExportJSON: () => void;
    onExportMermaid: () => void;
    onExportPlantUML: () => void;
    onExportOpenFlowDSL: () => void;
    onExportFigma: () => void;
}

interface UseExportMenuResult {
    isOpen: boolean;
    menuRef: RefObject<HTMLDivElement>;
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
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

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
        toggleMenu,
        handleSelect,
    };
}
