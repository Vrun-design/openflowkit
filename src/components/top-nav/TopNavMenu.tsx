import React, { Suspense, lazy, useEffect, useRef } from 'react';
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
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonClassName = isOpen
        ? 'flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium transition-all sm:min-h-9 bg-[var(--brand-primary-50)] border-[var(--brand-primary-200)] text-[var(--brand-primary)] shadow-inner'
        : `flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium transition-all sm:min-h-9 bg-[var(--brand-surface)] border-[var(--color-brand-border)] text-[var(--brand-secondary)] hover:border-[var(--brand-secondary)] hover:text-[var(--brand-text)] ${isBeveled ? 'btn-beveled' : 'shadow-sm hover:shadow'}`;

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        function handlePointerDownOutside(event: PointerEvent): void {
            const target = event.target as Node;
            if (menuRef.current?.contains(target)) {
                return;
            }
            onClose();
        }

        function handleEscape(event: KeyboardEvent): void {
            if (event.key === 'Escape') {
                onClose();
            }
        }

        document.addEventListener('pointerdown', handlePointerDownOutside, true);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDownOutside, true);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={onToggle}
                data-testid="topnav-menu-toggle"
                aria-label="Open main menu"
                className={buttonClassName}
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
