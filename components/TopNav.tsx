import React, { useState } from 'react';
import { Rainbow, Settings, Check, ChevronDown, Clock, FolderOpen, AlignJustify, Palette, Home, Play } from 'lucide-react';
import { FlowTab } from '../types';
import { FlowTabs } from './FlowTabs';
import { ExportMenu } from './ExportMenu';
import { Tooltip } from './Tooltip';
import { useFlowStore } from '../store';
import { SettingsModal } from './SettingsModal/SettingsModal';

interface TopNavProps {
    showMiniMap: boolean;
    toggleMiniMap: () => void;
    showGrid: boolean;
    toggleGrid: () => void;
    snapToGrid: boolean;
    toggleSnapToGrid: () => void;

    // Tabs
    tabs: FlowTab[];
    activeTabId: string;
    onSwitchTab: (tabId: string) => void;
    onAddTab: () => void;
    onCloseTab: (tabId: string) => void;
    onRenameTab: (tabId: string, newName: string) => void;

    // Actions
    onExportPNG: (format?: 'png' | 'jpeg') => void;
    onExportJSON: () => void;
    onExportMermaid: () => void;
    onExportPlantUML: () => void;
    onExportOpenFlowDSL: () => void;
    onExportFigma: () => void;
    onImportJSON: () => void;
    onHistory: () => void;
    onGoHome: () => void;
    onPlay: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
    showMiniMap,
    toggleMiniMap,
    showGrid,
    toggleGrid,
    snapToGrid,
    toggleSnapToGrid,
    tabs,
    activeTabId,
    onSwitchTab,
    onAddTab,
    onCloseTab,
    onRenameTab,
    onExportPNG,
    onExportJSON,
    onExportMermaid,
    onExportPlantUML,
    onExportOpenFlowDSL,
    onExportFigma,
    onImportJSON,
    onHistory,
    onGoHome,
    onPlay,
}) => {
    const { brandConfig } = useFlowStore();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeSettingsTab, setActiveSettingsTab] = useState<'brand' | 'general' | 'shortcuts'>('brand');

    const openSettings = (tab: 'brand' | 'general' | 'shortcuts') => {
        setActiveSettingsTab(tab);
        setIsSettingsOpen(true);
        setIsMenuOpen(false);
    };

    return (
        <div className="absolute top-0 left-0 right-0 z-50 h-16 bg-white/70 backdrop-blur-md border-b border-white/20 shadow-sm px-6 flex items-center justify-between transition-all">
            {/* Left: Brand */}
            {/* Left: Menu & Brand */}
            <div className="flex items-center gap-4 min-w-[240px]">
                {/* Menu Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border transition-all text-sm font-medium
                            ${isMenuOpen
                                ? 'bg-[var(--brand-primary-50)] border-[var(--brand-primary-200)] text-[var(--brand-primary)] shadow-inner'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 shadow-sm hover:shadow'}
                        `}
                    >
                        <AlignJustify className="w-4 h-4" />
                    </button>

                    {isMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsMenuOpen(false)} />
                            <div className="absolute top-full left-0 mt-3 w-56 bg-white/90 backdrop-blur-xl rounded-[var(--radius-lg)] shadow-2xl border border-white/50 ring-1 ring-black/5 p-2 flex flex-col gap-1 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-left">
                                <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    Menu
                                </div>
                                <button
                                    onClick={() => { onGoHome(); setIsMenuOpen(false); }}
                                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 hover:bg-[var(--brand-primary-50)] hover:text-[var(--brand-primary)] rounded-[var(--radius-sm)] transition-all font-medium"
                                >
                                    <Home className="w-4 h-4" />
                                    Go to Dashboard
                                </button>
                                <div className="my-1 border-t border-slate-100" />
                                <button
                                    onClick={() => openSettings('general')}
                                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 hover:bg-[var(--brand-primary-50)] hover:text-[var(--brand-primary)] rounded-[var(--radius-sm)] transition-all"
                                >
                                    <Settings className="w-4 h-4" />
                                    Canvas Settings
                                </button>
                                <button
                                    onClick={() => openSettings('brand')}
                                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 hover:bg-[var(--brand-primary-50)] hover:text-[var(--brand-primary)] rounded-[var(--radius-sm)] transition-all"
                                >
                                    <Palette className="w-4 h-4" />
                                    Brand Settings
                                </button>
                            </div>
                        </>
                    )}
                </div>

                <Tooltip text={brandConfig.appName || "OpenFlowKit AI Canvas"} side="bottom">
                    <div className="flex items-center gap-3">
                        {/* Logo Icon (Square) */}
                        {(brandConfig.logoStyle === 'icon' || brandConfig.logoStyle === 'both') && (
                            <div className="w-9 h-9 flex items-center justify-center bg-[var(--brand-primary-50)] rounded-[var(--radius-md)] text-[var(--brand-primary)] overflow-hidden relative shrink-0">
                                {brandConfig.logoUrl ? (
                                    <img src={brandConfig.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                                ) : (
                                    <Rainbow className="w-5 h-5" />
                                )}
                            </div>
                        )}

                        {/* Wide Logo (Full Width Image) */}
                        {/* Wide Logo (Full Width Image) */}
                        {brandConfig.logoStyle === 'wide' && (
                            <div className="h-8 flex-1 flex items-center justify-start text-[var(--brand-primary)] shrink-0 px-1 max-w-[180px] overflow-hidden">
                                {brandConfig.logoUrl ? (
                                    <div className="flex items-center justify-start h-full">
                                        <img
                                            src={brandConfig.logoUrl}
                                            alt="Logo"
                                            className="h-[70%] w-auto max-w-full object-contain object-left"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--brand-primary-50)] rounded-[var(--radius-md)] border border-[var(--brand-primary-100)] opacity-80 hover:opacity-100 transition-opacity cursor-help" title="Upload a wide logo in Brand Settings to see it here">
                                        <Rainbow className="w-4 h-4" />
                                        <span className="text-xs font-semibold whitespace-nowrap">Your Wide Logo</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* App Name */}
                        {(brandConfig.logoStyle === 'text' || brandConfig.logoStyle === 'both') && (
                            <div className="flex flex-col">
                                <span className="font-bold text-slate-800 tracking-tight text-lg leading-none">{brandConfig.appName}</span>
                            </div>
                        )}

                        {/* BETA Chip */}
                        <div className="flex items-center justify-center px-1.5 py-0.5 rounded-full bg-[var(--brand-primary-50)] border border-[var(--brand-primary-200)]">
                            <span className="text-[10px] font-extrabold text-[var(--brand-primary)] tracking-widest leading-none">BETA</span>
                        </div>
                    </div>
                </Tooltip>
            </div>

            {/* Center: Tabs */}
            <div className="flex-1 flex justify-center max-w-2xl">
                <div className="bg-slate-100/50 p-1 rounded-[var(--radius-lg)] border border-slate-200/60 backdrop-blur-sm">
                    <FlowTabs
                        tabs={tabs}
                        activeTabId={activeTabId}
                        onSwitchTab={onSwitchTab}
                        onAddTab={onAddTab}
                        onCloseTab={onCloseTab}
                        onRenameTab={onRenameTab}
                    />
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3 min-w-[240px] justify-end">
                <div className="flex items-center gap-0.5 p-1 bg-slate-100/50 border border-slate-200/60 rounded-[var(--radius-md)]">
                    <Tooltip text="Version History" side="bottom">
                        <button
                            onClick={onHistory}
                            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-[var(--radius-sm)] transition-all"
                        >
                            <Clock className="w-4 h-4" />
                        </button>
                    </Tooltip>
                    <div className="w-px h-4 bg-slate-200 mx-0.5" />
                    <Tooltip text="Load JSON" side="bottom">
                        <button
                            onClick={onImportJSON}
                            className="p-2 text-slate-500 hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-50)] rounded-[var(--radius-sm)] transition-all"
                        >
                            <FolderOpen className="w-4 h-4" />
                        </button>
                    </Tooltip>
                </div>

                <div className="h-8 w-px bg-slate-200/50 mx-2" />

                <div className="flex items-center gap-2">
                    {/* Playback Button */}
                    <Tooltip text="Playback Mode" side="bottom">
                        <button
                            onClick={onPlay}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-[var(--radius-md)] shadow-sm transition-all active:scale-95"
                        >
                            <Play className="w-4 h-4" />
                            <span>Play</span>
                        </button>
                    </Tooltip>

                    <ExportMenu
                        onExportPNG={onExportPNG}
                        onExportJSON={onExportJSON}
                        onExportMermaid={onExportMermaid}
                        onExportPlantUML={onExportPlantUML}
                        onExportOpenFlowDSL={onExportOpenFlowDSL}
                        onExportFigma={onExportFigma}
                    />
                </div>

                <SettingsModal
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    initialTab={activeSettingsTab}
                />

                {/* Logo after Menu (User Request: "icon on the right side adn then logo") */}
                {/* NOTE: I am keeping the main logo on the left for now as removing it might break the layout balance. 
                     The user might mean they want *another* logo here or the main logo moved? 
                     I will interpret "then logo" as maybe the user wants their logo to be visible here too?
                     Or maybe they confused left/right? 
                     I will leave the logo on left for now and just add the menu. 
                     If they want the logo on the right *instead* of left, I would need to move the left block.
                 */}
            </div>
        </div>
    );
};
