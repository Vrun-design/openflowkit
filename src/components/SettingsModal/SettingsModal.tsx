import React, { useEffect, useRef, useState } from 'react';
import { X, Settings, Keyboard } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { GeneralSettings } from './GeneralSettings';
import { ShortcutsSettings } from './ShortcutsSettings';
import { SidebarItem } from '../ui/SidebarItem';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: 'general' | 'shortcuts';
}

interface OpenSettingsModalContentProps {
    onClose: () => void;
    initialTab: 'general' | 'shortcuts';
}

function OpenSettingsModalContent({ onClose, initialTab }: OpenSettingsModalContentProps): React.ReactElement {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'general' | 'shortcuts'>(initialTab);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        closeButtonRef.current?.focus();

        function handleEscape(event: KeyboardEvent): void {
            if (event.key === 'Escape') {
                onClose();
            }
        }

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4 sm:p-6">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="settings-modal-title"
                className="bg-white/95 backdrop-blur-xl w-full max-w-3xl max-h-full md:h-[80vh] rounded-[calc(var(--brand-radius)*1.5)] shadow-2xl border border-white/20 ring-1 ring-black/5 flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Sidebar */}
                <div className="w-full md:w-64 bg-slate-50/50 border-b md:border-b-0 md:border-r border-slate-200/60 p-2 md:p-4 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible items-center md:items-stretch custom-scrollbar shrink-0">
                    <h2 className="hidden md:block px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                        {t('settingsModal.settings', 'Settings')}
                    </h2>

                    <SidebarItem
                        icon={<Settings className="w-4 h-4" />}
                        isActive={activeTab === 'general'}
                        onClick={() => setActiveTab('general')}
                        className="whitespace-nowrap w-auto md:w-full px-4 md:px-3 py-2 md:py-2.5 flex-none"
                    >
                        {t('settingsModal.general', 'General')}
                    </SidebarItem>

                    <SidebarItem
                        icon={<Keyboard className="w-4 h-4" />}
                        isActive={activeTab === 'shortcuts'}
                        onClick={() => setActiveTab('shortcuts')}
                        className="whitespace-nowrap w-auto md:w-full px-4 md:px-3 py-2 md:py-2.5 flex-none"
                    >
                        {t('settingsModal.shortcuts', 'Shortcuts')}
                    </SidebarItem>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-white/50">
                    <div className="flex items-center justify-between p-4 border-b border-slate-100">
                        <h2 id="settings-modal-title" className="text-lg font-semibold text-slate-800">
                            {{
                                general: t('settingsModal.canvasSettings', 'Canvas Settings'),
                                shortcuts: t('settingsModal.keyboardShortcuts', 'Keyboard Shortcuts'),
                            }[activeTab]}
                        </h2>
                        <button
                            ref={closeButtonRef}
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                            aria-label={t('settingsModal.close', 'Close settings')}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="p-6">
                            {activeTab === 'general' && <GeneralSettings />}
                            {activeTab === 'shortcuts' && <ShortcutsSettings />}
                        </div>
                    </div>
                </div>
            </div>

            {/* Backdrop click to close */}
            <div className="absolute inset-0 -z-10" onClick={onClose} />
        </div>
    );
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, initialTab = 'general' }) => {
    if (!isOpen) return null;

    return createPortal(
        <OpenSettingsModalContent onClose={onClose} initialTab={initialTab} />,
        document.body
    );
};
