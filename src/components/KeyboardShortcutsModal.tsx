import React, { useEffect, useMemo, useRef } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { X, Keyboard, Command, MousePointer2, Pencil } from 'lucide-react';
import { getKeyboardShortcuts, isMacLikePlatform } from '../constants';
import { useShortcutHelpActions, useShortcutHelpOpen } from '@/store/viewHooks';

export function KeyboardShortcutsModal(): React.JSX.Element | null {
    const { t } = useTranslation();
    const isShortcutsHelpOpen = useShortcutHelpOpen();
    const { setShortcutsHelpOpen } = useShortcutHelpActions();
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const keyboardShortcuts = useMemo(
        () => getKeyboardShortcuts(typeof navigator !== 'undefined' && isMacLikePlatform(navigator.platform || navigator.userAgent)),
        []
    );

    useEffect(() => {
        if (!isShortcutsHelpOpen) {
            return undefined;
        }

        closeButtonRef.current?.focus();

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setShortcutsHelpOpen(false);
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isShortcutsHelpOpen, setShortcutsHelpOpen]);

    if (!isShortcutsHelpOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="keyboard-shortcuts-title"
                aria-describedby="keyboard-shortcuts-description"
                className="max-w-2xl w-full overflow-hidden border border-slate-200/60 bg-white shadow-[var(--shadow-overlay)] flex flex-col animate-in zoom-in duration-200"
                style={{ borderRadius: 'var(--radius-xl)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3 text-slate-900">
                        <div
                            className="w-10 h-10 flex items-center justify-center"
                            style={{
                                background: 'var(--brand-primary-50, #eef2ff)',
                                color: 'var(--brand-primary, #6366f1)',
                                borderRadius: 'var(--radius-md)'
                            }}
                        >
                            <Keyboard className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 id="keyboard-shortcuts-title" className="text-lg font-bold leading-none">{t('keyboardShortcutsModal.title')}</h2>
                            <p id="keyboard-shortcuts-description" className="text-xs text-slate-500 mt-1">{t('keyboardShortcutsModal.subtitle')}</p>
                        </div>
                    </div>
                    <button
                        ref={closeButtonRef}
                        onClick={() => setShortcutsHelpOpen(false)}
                        className="p-2 hover:bg-slate-100 rounded-full transition-all active:scale-90"
                        aria-label={t('keyboardShortcutsModal.closeAriaLabel')}
                    >
                        <X size={20} className="text-slate-400 hover:text-slate-600" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 overflow-y-auto max-h-[70vh]">
                    {keyboardShortcuts.map((section) => (
                        <ShortcutGroup
                            key={section.title}
                            title={section.title}
                            icon={getSectionIcon(section.title)}
                        >
                            {section.items.map((item) => (
                                <ShortcutItem key={item.label} shortcuts={item.shortcuts} label={item.label} />
                            ))}
                        </ShortcutGroup>
                    ))}
                </div>

                {/* Footer Info */}
                <div className="px-8 py-5 bg-slate-50 text-center border-t border-slate-100">
                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest leading-relaxed">
                        <Trans
                            i18nKey="keyboardShortcutsModal.proTip"
                            components={{
                                key: <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold mx-1">Shift</kbd>
                            }}
                        />
                    </p>
                </div>
            </div>
        </div>
    );
}

function getSectionIcon(title: string) {
    switch (title) {
        case 'shortcuts.essentials': return <Command className="w-4 h-4 text-slate-400" />;
        case 'shortcuts.manipulation': return <Pencil className="w-4 h-4 text-slate-400" />;
        case 'shortcuts.navigation': return <MousePointer2 className="w-4 h-4 text-slate-400" />;
        default: return <Keyboard className="w-4 h-4 text-slate-400" />;
    }
}

interface ShortcutGroupProps {
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
}

function ShortcutGroup({ title, icon, children }: ShortcutGroupProps): React.JSX.Element {
    const { t } = useTranslation();
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                    {t(`${title}`, title)}
                </h3>
            </div>
            <div className="space-y-3">
                {children}
            </div>
        </div>
    );
}

interface ShortcutItemProps {
    shortcuts: string[][];
    label: string;
}

function ShortcutItem({ shortcuts, label }: ShortcutItemProps): React.JSX.Element {
    const { t } = useTranslation();
    return (
        <div className="flex items-center justify-between group py-0.5">
            <span className="text-sm font-medium text-slate-600 transition-colors group-hover:text-[var(--brand-primary)]">
                {t(`${label}`, label)}
            </span>
            <div className="flex flex-wrap items-center justify-end gap-1.5">
                {shortcuts.map((shortcut, shortcutIndex) => (
                    <React.Fragment key={`${label}-${shortcutIndex}`}>
                        {shortcutIndex > 0 ? <span className="text-[10px] font-semibold uppercase text-slate-300">/</span> : null}
                        <div className="flex gap-1.5">
                            {shortcut.map((key, keyIndex) => (
                                <kbd
                                    key={`${label}-${shortcutIndex}-${keyIndex}`}
                                    className="px-2 py-1 min-w-[28px] text-center text-[10px] font-bold bg-white border-b-2 border-slate-200 border-x border-t rounded shadow-sm text-slate-500 uppercase transition-colors group-hover:border-[var(--brand-primary-200)]"
                                >
                                    {key}
                                </kbd>
                            ))}
                        </div>
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}
