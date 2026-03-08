import React, { Suspense, lazy } from 'react';
import { AlignJustify } from 'lucide-react';

const LazyTopNavMenuPanel = lazy(async () => {
    const module = await import('./TopNavMenuPanel');
    return { default: module.TopNavMenuPanel };
});

interface TopNavMenuProps {
    isOpen: boolean;
    isBeveled: boolean;
    onToggle: () => void;
    onClose: () => void;
    onGoHome: () => void;
    onOpenSettings: () => void;
    onHistory: () => void;
    onImportJSON: () => void;
}

export function TopNavMenu({
    isOpen,
    isBeveled,
    onToggle,
    onClose,
    onGoHome,
    onOpenSettings,
    onHistory,
    onImportJSON,
}: TopNavMenuProps): React.ReactElement {
    return (
        <div className="relative">
            <button
                onClick={onToggle}
                data-testid="topnav-menu-toggle"
                className={`flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border transition-all text-sm font-medium
                    ${isOpen
                        ? 'bg-[var(--brand-primary-50)] border-[var(--brand-primary-200)] text-[var(--brand-primary)] shadow-inner'
                        : `bg-white border-slate-200 text-slate-600 hover:border-slate-300 ${isBeveled ? 'btn-beveled' : 'shadow-sm hover:shadow'}`}
                `}
            >
                <AlignJustify className="w-4 h-4" />
            </button>

            {isOpen && (
                <Suspense fallback={null}>
                    <LazyTopNavMenuPanel
                        onClose={onClose}
                        onGoHome={onGoHome}
                        onOpenSettings={onOpenSettings}
                        onHistory={onHistory}
                        onImportJSON={onImportJSON}
                    />
                </Suspense>
            )}
        </div>
    );
}
