import React, { useState } from 'react';
import { Rainbow, Settings, Check, ChevronDown, Clock, FolderOpen } from 'lucide-react';
import { FlowTab } from '../types';
import { FlowTabs } from './FlowTabs';
import { ExportMenu } from './ExportMenu';
import { Tooltip } from './Tooltip';

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
    onExportPNG: () => void;
    onExportJSON: () => void;
    onExportMermaid: () => void;
    onExportPlantUML: () => void;
    onExportFlowMindDSL: () => void;
    onImportJSON: () => void;
    onHistory: () => void;
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
    onExportFlowMindDSL,
    onImportJSON,
    onHistory,
}) => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    return (
        <div className="absolute top-0 left-0 right-0 z-50 h-16 bg-white/70 backdrop-blur-md border-b border-white/20 shadow-sm px-6 flex items-center justify-between transition-all">
            {/* Left: Brand */}
            <Tooltip text="FlowMind AI Canvas" side="bottom">
                <div className="flex items-center gap-3 min-w-[240px]">
                    <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                        <Rainbow className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-800 tracking-tight text-lg leading-none">FlowMind</span>
                    </div>
                </div>
            </Tooltip>

            {/* Center: Tabs */}
            <div className="flex-1 flex justify-center max-w-2xl">
                <div className="bg-slate-100/50 p-1 rounded-xl border border-slate-200/60 backdrop-blur-sm">
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
                <div className="flex items-center gap-1 bg-slate-50/80 p-1 rounded-xl border border-slate-200/60 backdrop-blur-sm">
                    <Tooltip text="Version History" side="bottom">
                        <button
                            onClick={onHistory}
                            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-white rounded-lg transition-all shadow-sm hover:shadow"
                        >
                            <Clock className="w-4 h-4" />
                        </button>
                    </Tooltip>
                    <div className="w-px h-4 bg-slate-200 mx-1" />
                    <Tooltip text="Load JSON" side="bottom">
                        <button
                            onClick={onImportJSON}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-all shadow-sm hover:shadow"
                        >
                            <FolderOpen className="w-4 h-4" />
                        </button>
                    </Tooltip>
                    <ExportMenu
                        onExportPNG={onExportPNG}
                        onExportJSON={onExportJSON}
                        onExportMermaid={onExportMermaid}
                        onExportPlantUML={onExportPlantUML}
                        onExportFlowMindDSL={onExportFlowMindDSL}
                    />
                </div>

                <div className="relative">
                    <Tooltip text="Canvas Settings" side="bottom">
                        <button
                            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-sm font-medium
                                ${isSettingsOpen
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-inner'
                                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 shadow-sm hover:shadow'}
                            `}
                        >
                            <Settings className="w-4 h-4" />
                            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isSettingsOpen ? 'rotate-180' : ''}`} />
                        </button>
                    </Tooltip>

                    {isSettingsOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-40 bg-transparent"
                                onClick={() => setIsSettingsOpen(false)}
                            />
                            <div className="absolute top-full right-0 mt-3 w-64 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 ring-1 ring-black/5 p-2 flex flex-col gap-1 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    Canvas Settings
                                </div>

                                <button
                                    onClick={toggleMiniMap}
                                    title="Toggle Mini Map"
                                    className="flex items-center justify-between px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50/80 hover:text-slate-900 rounded-xl transition-all group"
                                >
                                    <span className="font-medium">Mini Map</span>
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${showMiniMap ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-300'}`}>
                                        {showMiniMap && <Check className="w-3.5 h-3.5" />}
                                    </div>
                                </button>

                                <button
                                    onClick={toggleGrid}
                                    title="Toggle Grid"
                                    className="flex items-center justify-between px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50/80 hover:text-slate-900 rounded-xl transition-all group"
                                >
                                    <span className="font-medium">Show Grid</span>
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${showGrid ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-300'}`}>
                                        {showGrid && <Check className="w-3.5 h-3.5" />}
                                    </div>
                                </button>

                                <button
                                    onClick={toggleSnapToGrid}
                                    title="Toggle Snap to Grid"
                                    className="flex items-center justify-between px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50/80 hover:text-slate-900 rounded-xl transition-all group"
                                >
                                    <span className="font-medium">Snap to Grid</span>
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${snapToGrid ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-300'}`}>
                                        {snapToGrid && <Check className="w-3.5 h-3.5" />}
                                    </div>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
