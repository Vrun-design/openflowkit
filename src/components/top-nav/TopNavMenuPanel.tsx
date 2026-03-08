import React from 'react';
import { Clock, FolderOpen, Home, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '@/components/LanguageSelector';

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
    const menuItemClass = 'flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 hover:bg-[var(--brand-primary-50)] hover:text-[var(--brand-primary)] rounded-[var(--radius-sm)] transition-all font-medium';

    return (
        <>
            <button
                type="button"
                className="fixed inset-0 z-40 bg-transparent"
                onClick={onClose}
                aria-label="Close menu"
            />
            <div className="absolute top-full left-0 mt-3 w-56 bg-white/90 backdrop-blur-xl rounded-[var(--radius-lg)] shadow-2xl border border-white/50 ring-1 ring-black/5 p-2 flex flex-col gap-1 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-left">
                <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {t('nav.menu', 'Menu')}
                </div>
                <button
                    onClick={() => {
                        onGoHome();
                        onClose();
                    }}
                    className={menuItemClass}
                >
                    <Home className="w-4 h-4" />
                    {t('nav.goToDashboard', 'Go to Dashboard')}
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                    onClick={() => {
                        onHistory();
                        onClose();
                    }}
                    data-testid="topnav-history"
                    className={menuItemClass}
                >
                    <Clock className="w-4 h-4" />
                    {t('nav.versionHistory', 'Version History')}
                </button>
                <button
                    onClick={() => {
                        onImportJSON();
                        onClose();
                    }}
                    className={menuItemClass}
                >
                    <FolderOpen className="w-4 h-4" />
                    {t('nav.loadJSON', 'Load JSON')}
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                    onClick={onOpenSettings}
                    className={menuItemClass}
                >
                    <Settings className="w-4 h-4" />
                    {t('nav.canvasSettings', 'Canvas Settings')}
                </button>
                <div className="my-1 border-t border-slate-100" />
                <div className="px-1 py-1">
                    <LanguageSelector variant="compact" placement="bottom" />
                </div>
            </div>
        </>
    );
}
