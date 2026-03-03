import React from 'react';
import { AlignJustify, Home, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TopNavMenuProps {
    isOpen: boolean;
    isBeveled: boolean;
    onToggle: () => void;
    onClose: () => void;
    onGoHome: () => void;
    onOpenSettings: () => void;
}

export function TopNavMenu({
    isOpen,
    isBeveled,
    onToggle,
    onClose,
    onGoHome,
    onOpenSettings,
}: TopNavMenuProps): React.ReactElement {
    const { t } = useTranslation();

    return (
        <div className="relative">
            <button
                onClick={onToggle}
                className={`flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border transition-all text-sm font-medium
                    ${isOpen
                        ? 'bg-[var(--brand-primary-50)] border-[var(--brand-primary-200)] text-[var(--brand-primary)] shadow-inner'
                        : `bg-white border-slate-200 text-slate-600 hover:border-slate-300 ${isBeveled ? 'btn-beveled' : 'shadow-sm hover:shadow'}`}
                `}
            >
                <AlignJustify className="w-4 h-4" />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40 bg-transparent" onClick={onClose} />
                    <div className="absolute top-full left-0 mt-3 w-56 bg-white/90 backdrop-blur-xl rounded-[var(--radius-lg)] shadow-2xl border border-white/50 ring-1 ring-black/5 p-2 flex flex-col gap-1 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-left">
                        <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                            {t('nav.menu', 'Menu')}
                        </div>
                        <button
                            onClick={() => {
                                onGoHome();
                                onClose();
                            }}
                            className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 hover:bg-[var(--brand-primary-50)] hover:text-[var(--brand-primary)] rounded-[var(--radius-sm)] transition-all font-medium"
                        >
                            <Home className="w-4 h-4" />
                            {t('nav.goToDashboard', 'Go to Dashboard')}
                        </button>
                        <div className="my-1 border-t border-slate-100" />
                        <button
                            onClick={onOpenSettings}
                            className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 hover:bg-[var(--brand-primary-50)] hover:text-[var(--brand-primary)] rounded-[var(--radius-sm)] transition-all"
                        >
                            <Settings className="w-4 h-4" />
                            {t('nav.canvasSettings', 'Canvas Settings')}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
