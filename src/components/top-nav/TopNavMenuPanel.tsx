import React from 'react';
import { Clock, FolderOpen, Home, Moon, Settings, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useTheme } from '@/context/ThemeContext';

interface TopNavMenuPanelProps {
    onClose: () => void;
    onGoHome: () => void;
    onOpenSettings: () => void;
    onHistory: () => void;
    onImportJSON: () => void;
}

export function TopNavMenuPanel({
    onClose,
    onGoHome,
    onOpenSettings,
    onHistory,
    onImportJSON,
}: TopNavMenuPanelProps): React.ReactElement {
    const { t } = useTranslation();
    const { resolvedTheme, setTheme } = useTheme();
    const menuItemClass = 'flex items-center gap-3 px-3 py-2.5 text-sm text-[var(--brand-secondary)] hover:bg-[var(--brand-primary-50)] hover:text-[var(--brand-primary)] rounded-[var(--radius-sm)] transition-all font-medium';
    const themeToggleLabel = resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode';

    function handleAction(action: () => void): void {
        action();
        onClose();
    }

    return (
        <>
            <button
                type="button"
                className="fixed inset-0 z-40 bg-transparent"
                onClick={onClose}
                aria-label="Close menu"
            />
            <div className="absolute top-full left-0 mt-3 w-56 bg-[var(--brand-surface)]/94 backdrop-blur-xl rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] border border-[var(--color-brand-border)]/80 ring-1 ring-black/5 p-2 flex flex-col gap-1 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-left">
                <div className="px-3 py-2 text-xs font-bold text-[var(--brand-secondary)] uppercase tracking-widest">
                    {t('nav.menu', 'Menu')}
                </div>
                <button
                    onClick={() => handleAction(onGoHome)}
                    className={menuItemClass}
                >
                    <Home className="w-4 h-4" />
                    {t('nav.goToDashboard', 'Go to Dashboard')}
                </button>
                <button
                    onClick={() => handleAction(onHistory)}
                    data-testid="topnav-history"
                    className={menuItemClass}
                >
                    <Clock className="w-4 h-4" />
                    {t('nav.versionHistory', 'Version History')}
                </button>
                <button
                    onClick={() => handleAction(onImportJSON)}
                    className={menuItemClass}
                >
                    <FolderOpen className="w-4 h-4" />
                    {t('nav.loadJSON', 'Load JSON')}
                </button>
                <button
                    onClick={onOpenSettings}
                    className={menuItemClass}
                >
                    <Settings className="w-4 h-4" />
                    {t('nav.canvasSettings', 'Canvas Settings')}
                </button>

                {/* Single divider before preferences */}
                <div className="my-1 border-t border-[var(--color-brand-border)]" />

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                        className={`${menuItemClass} flex-1`}
                    >
                        {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        {themeToggleLabel}
                    </button>
                    <LanguageSelector variant="minimal" placement="bottom" />
                </div>
            </div>
        </>
    );
}
