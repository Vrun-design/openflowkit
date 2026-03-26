import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

interface UseExportMenuParams {
    onExportPNG: (format: 'png' | 'jpeg') => void;
    onExportSVG: () => void;
    onExportPDF: () => void;
    onExportAnimated: (format: 'video' | 'gif') => void;
    onExportReveal: (format: 'reveal-video' | 'reveal-gif') => void;
    onExportJSON: () => void;
    onExportMermaid: () => void;
    onExportPlantUML: () => void;
    onExportOpenFlowDSL: () => void;
    onExportFigma: () => void;
    onShare: () => void;
}

interface UseExportMenuResult {
    isOpen: boolean;
    menuRef: RefObject<HTMLDivElement>;
    toggleMenu: () => void;
    handleSelect: (key: string) => void;
}

export function useExportMenu({
    onExportPNG,
    onExportSVG,
    onExportPDF,
    onExportAnimated,
    onExportReveal,
    onExportJSON,
    onExportMermaid,
    onExportPlantUML,
    onExportOpenFlowDSL,
    onExportFigma,
    onShare,
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
        svg: onExportSVG,
        pdf: onExportPDF,
        video: () => onExportAnimated('video'),
        gif: () => onExportAnimated('gif'),
        'reveal-video': () => onExportReveal('reveal-video'),
        'reveal-gif': () => onExportReveal('reveal-gif'),
        json: onExportJSON,
        openflow: onExportOpenFlowDSL,
        mermaid: onExportMermaid,
        plantuml: onExportPlantUML,
        figma: onExportFigma,
        share: onShare,
        readme: () => {
            const snippet = [
                '<!-- Diagram built with OpenFlowKit — https://openflowkit.com -->',
                '[![Diagram](./diagram.png)](https://openflowkit.com)',
            ].join('\n');
            void navigator.clipboard.writeText(snippet);
        },
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
