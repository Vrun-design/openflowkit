import React, { useState } from 'react';
import { X, Palette, Settings, Keyboard, Monitor } from 'lucide-react';
import { createPortal } from 'react-dom';
import { BrandSettings } from './BrandSettings';
import { GeneralSettings } from './GeneralSettings';
import { ShortcutsSettings } from './ShortcutsSettings';
import { useFlowStore } from '../../store';
import { SidebarItem } from '../ui/SidebarItem';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: 'brand' | 'general' | 'shortcuts';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, initialTab = 'brand' }) => {
    const [activeTab, setActiveTab] = useState<'brand' | 'general' | 'shortcuts'>(initialTab);

    // Update active tab if initialTab changes when opening
    React.useEffect(() => {
        if (isOpen && initialTab) {
            setActiveTab(initialTab);
        }
    }, [isOpen, initialTab]);
    const { brandConfig, viewSettings, toggleGrid, toggleSnap, toggleMiniMap } = useFlowStore();

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white/95 backdrop-blur-xl w-full max-w-3xl h-[80vh] rounded-[calc(var(--brand-radius)*1.5)] shadow-2xl border border-white/20 ring-1 ring-black/5 flex overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Sidebar */}
                <div className="w-64 bg-slate-50/50 border-r border-slate-200/60 p-4 flex flex-col gap-1">
                    <h2 className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Settings</h2>

                    <SidebarItem
                        icon={<Palette className="w-4 h-4" />}
                        isActive={activeTab === 'brand'}
                        onClick={() => setActiveTab('brand')}
                    >
                        Brand Kit
                    </SidebarItem>

                    <SidebarItem
                        icon={<Settings className="w-4 h-4" />}
                        isActive={activeTab === 'general'}
                        onClick={() => setActiveTab('general')}
                    >
                        General
                    </SidebarItem>

                    <SidebarItem
                        icon={<Keyboard className="w-4 h-4" />}
                        isActive={activeTab === 'shortcuts'}
                        onClick={() => setActiveTab('shortcuts')}
                    >
                        Shortcuts
                    </SidebarItem>

                    <div className="mt-auto px-4 py-4 border-t border-slate-100">
                        <div className="text-xs text-slate-400">
                            Running {brandConfig.appName}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col min-h-0 bg-white/50">
                    <div className="flex items-center justify-between p-4 border-b border-slate-100">
                        <h2 className="text-lg font-semibold text-slate-800">
                            {activeTab === 'brand' && 'Brand Customization'}
                            {activeTab === 'general' && 'General Settings'}
                            {activeTab === 'shortcuts' && 'Keyboard Shortcuts'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="p-6">
                            {activeTab === 'brand' && <BrandSettings />}
                            {activeTab === 'general' && <GeneralSettings />}
                            {activeTab === 'shortcuts' && <ShortcutsSettings />}
                        </div>
                    </div>
                </div>
            </div>

            {/* Backdrop click to close */}
            <div className="absolute inset-0 -z-10" onClick={onClose} />
        </div>,
        document.body
    );
};
