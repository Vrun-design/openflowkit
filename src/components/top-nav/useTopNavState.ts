import { useState } from 'react';

interface UseTopNavStateResult {
    isMenuOpen: boolean;
    isSettingsOpen: boolean;
    activeSettingsTab: 'canvas' | 'shortcuts' | 'ai';
    toggleMenu: () => void;
    closeMenu: () => void;
    openSettings: (tab: 'canvas' | 'shortcuts' | 'ai') => void;
    closeSettings: () => void;
}

export function useTopNavState(): UseTopNavStateResult {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [activeSettingsTab, setActiveSettingsTab] = useState<'canvas' | 'shortcuts' | 'ai'>('canvas');

    function toggleMenu(): void {
        setIsMenuOpen((value) => !value);
    }

    function closeMenu(): void {
        setIsMenuOpen(false);
    }

    function openSettings(tab: 'canvas' | 'shortcuts' | 'ai'): void {
        setActiveSettingsTab(tab);
        setIsSettingsOpen(true);
        setIsMenuOpen(false);
    }

    function closeSettings(): void {
        setIsSettingsOpen(false);
    }

    return {
        isMenuOpen,
        isSettingsOpen,
        activeSettingsTab,
        toggleMenu,
        closeMenu,
        openSettings,
        closeSettings,
    };
}
