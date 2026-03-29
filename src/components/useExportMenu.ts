import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { captureAnalyticsEvent } from '@/services/analytics/analytics';
import { recordOnboardingEvent } from '@/services/onboarding/events';

interface UseExportMenuParams {
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
    onShare?: () => void;
}

type ExportActionKey = 'download' | 'copy';
type ExportActionHandlers = Record<ExportActionKey, () => void>;

interface UseExportMenuResult {
    isOpen: boolean;
    menuRef: RefObject<HTMLDivElement>;
    toggleMenu: () => void;
    closeMenu: () => void;
    handleSelect: (key: string, action: ExportActionKey) => void;
}

function isSelectPortalTarget(target: EventTarget | null): boolean {
    return target instanceof Element && Boolean(target.closest('[data-floating-select-root="true"]'));
}

function isInsideMenu(menuRef: RefObject<HTMLDivElement>, target: EventTarget | null): boolean {
    return target instanceof Node && Boolean(menuRef.current?.contains(target));
}

export function useExportMenu({
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
    onShare: _onShare,
}: UseExportMenuParams): UseExportMenuResult {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    function closeMenu(): void {
        setIsOpen(false);
    }

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        function shouldCloseForTarget(target: EventTarget | null): boolean {
            return !isSelectPortalTarget(target) && !isInsideMenu(menuRef, target);
        }

        function handleOutsideInteraction(target: EventTarget | null): void {
            if (shouldCloseForTarget(target)) {
                closeMenu();
            }
        }

        function handlePointerDownOutside(event: MouseEvent): void {
            handleOutsideInteraction(event.target);
        }

        function handleFocusOutside(event: FocusEvent): void {
            handleOutsideInteraction(event.target);
        }

        function handleEscape(event: KeyboardEvent): void {
            if (event.key === 'Escape') {
                closeMenu();
            }
        }

        document.addEventListener('mousedown', handlePointerDownOutside);
        document.addEventListener('focusin', handleFocusOutside);
        window.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handlePointerDownOutside);
            document.removeEventListener('focusin', handleFocusOutside);
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    const handlers: Record<string, ExportActionHandlers> = {
        png: { download: () => onExportPNG('png'), copy: () => onCopyImage('png') },
        jpeg: { download: () => onExportPNG('jpeg'), copy: () => onCopyImage('jpeg') },
        svg: { download: onExportSVG, copy: onCopySVG },
        pdf: { download: onExportPDF, copy: onExportPDF },
        'cinematic-video': { download: () => onExportCinematic('cinematic-video'), copy: () => onExportCinematic('cinematic-video') },
        'cinematic-gif': { download: () => onExportCinematic('cinematic-gif'), copy: () => onExportCinematic('cinematic-gif') },
        json: { download: onExportJSON, copy: onCopyJSON },
        openflow: { download: onDownloadOpenFlowDSL, copy: onExportOpenFlowDSL },
        mermaid: { download: onDownloadMermaid, copy: onExportMermaid },
        plantuml: { download: onDownloadPlantUML, copy: onExportPlantUML },
        figma: { download: onDownloadFigma, copy: onExportFigma },
    };

    function toggleMenu(): void {
        setIsOpen((value) => !value);
    }

    function recordSelection(key: string, action: ExportActionKey): void {
        recordOnboardingEvent('first_export_completed', { format: `${key}:${action}` });
        captureAnalyticsEvent('export_used', {
            format: key,
            action,
        });
    }

    function handleSelect(key: string, action: ExportActionKey): void {
        const actionHandler = handlers[key]?.[action];
        if (!actionHandler) {
            return;
        }

        actionHandler();
        recordSelection(key, action);
        closeMenu();
    }

    return {
        isOpen,
        menuRef,
        toggleMenu,
        closeMenu,
        handleSelect,
    };
}
