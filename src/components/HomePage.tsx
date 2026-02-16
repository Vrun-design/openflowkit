import React, { useState } from 'react';
import { OpenFlowLogo } from './icons/OpenFlowLogo';
import {
    Settings, Layout, Command, Search,
    Home, Clock, Loader2, Plus, Import, Image, FileCode, FileJson, GitBranch, Book, ExternalLink
} from 'lucide-react';
import { useFlowStore } from '../store';
import { useSnapshots } from '../hooks/useSnapshots';
import { Button } from './ui/Button';
import { BrandSettings } from './SettingsModal/BrandSettings';
import { GeneralSettings } from './SettingsModal/GeneralSettings';
import { ShortcutsSettings } from './SettingsModal/ShortcutsSettings';
import { FlowSnapshot } from '@/lib/types';
import { SidebarItem } from './ui/SidebarItem';


interface HomePageProps {
    onLaunch: () => void;
    onImportJSON: () => void;
    onRestoreSnapshot: (snapshot: FlowSnapshot) => void;
    activeTab?: 'home' | 'settings';
    onSwitchTab?: (tab: 'home' | 'settings') => void;
}

export const HomePage: React.FC<HomePageProps> = ({
    onLaunch,
    onImportJSON,
    onRestoreSnapshot,
    activeTab: propActiveTab,
    onSwitchTab
}) => {
    const { brandConfig } = useFlowStore();
    const { snapshots, deleteSnapshot } = useSnapshots();
    const [internalActiveTab, setInternalActiveTab] = useState<'home' | 'settings'>('home');
    const [activeSettingsTab, setActiveSettingsTab] = useState<'brand' | 'general' | 'shortcuts'>('brand');

    const activeTab = propActiveTab || internalActiveTab;

    const handleTabChange = (tab: 'home' | 'settings') => {
        if (onSwitchTab) {
            onSwitchTab(tab);
        } else {
            setInternalActiveTab(tab);
        }
    };

    const handleRestore = (snapshot: FlowSnapshot) => {
        onRestoreSnapshot(snapshot);
        onLaunch(); // Enter editor
    };

    return (
        <div className="min-h-screen bg-[var(--brand-background)] flex text-[var(--brand-text)]">
            {/* Sidebar */}
            {/* Sidebar */}
            <aside className="w-64 border-r border-slate-200 flex flex-col fixed inset-y-0 left-0 z-20 bg-[var(--brand-surface)]">
                <div className="h-14 flex items-center gap-3 px-4 border-b border-slate-100">
                    {(brandConfig.logoStyle === 'icon' || brandConfig.logoStyle === 'both' || !brandConfig.logoStyle) && (
                        <div className="w-8 h-8 flex items-center justify-center bg-[var(--brand-primary)]/10 rounded-lg text-[var(--brand-primary)] overflow-hidden shrink-0">
                            {brandConfig.logoUrl ? (
                                <img src={brandConfig.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                            ) : (
                                <OpenFlowLogo className="w-5 h-5" />
                            )}
                        </div>
                    )}

                    {brandConfig.logoStyle === 'wide' && (
                        <div className="h-8 flex-1 flex items-center justify-start overflow-hidden">
                            {brandConfig.logoUrl ? (
                                <img src={brandConfig.logoUrl} alt="Logo" className="h-[70%] w-auto object-contain max-w-[180px]" />
                            ) : (
                                <span className="text-sm font-semibold text-[var(--brand-primary)] truncate">Wide Logo</span>
                            )}
                        </div>
                    )}

                    {(brandConfig.logoStyle === 'text' || brandConfig.logoStyle === 'both' || !brandConfig.logoStyle) && (
                        <span className="font-semibold text-base tracking-tight text-slate-900 truncate">{brandConfig.appName}</span>
                    )}

                    {/* BETA Chip */}
                    {(brandConfig.ui.showBeta ?? true) && (
                        <div className="flex items-center justify-center px-1.5 py-0.5 rounded-full bg-[var(--brand-primary-50)] border border-[var(--brand-primary-200)]">
                            <span className="text-[10px] font-extrabold text-[var(--brand-primary)] tracking-widest leading-none">BETA</span>
                        </div>
                    )}
                </div>

                <div className="p-3 space-y-1">
                    <SidebarItem
                        icon={<Home className="w-4 h-4" />}
                        isActive={activeTab === 'home'}
                        onClick={() => handleTabChange('home')}
                    >
                        Home
                    </SidebarItem>
                    <SidebarItem
                        icon={<Settings className="w-4 h-4" />}
                        isActive={activeTab === 'settings'}
                        onClick={() => handleTabChange('settings')}
                    >
                        Settings
                    </SidebarItem>

                    <SidebarItem
                        icon={<Book className="w-4 h-4" />}
                        to="#/docs"
                    >
                        Documentation
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                    </SidebarItem>
                </div>

                <div className="mt-auto p-4 border-t border-slate-100">
                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                        v2.1.0 • {brandConfig.appName}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="ml-64 flex-1 flex flex-col min-w-0 bg-[var(--brand-surface)]">

                {activeTab === 'home' && (
                    <div className="flex-1 overflow-y-auto px-10 py-12 animate-in fade-in duration-300">
                        {/* Header & Actions */}
                        <div className="flex items-end justify-between mb-12">
                            <div>
                                <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-1">Dashboard</h1>
                                <p className="text-[var(--brand-secondary)] text-sm">Manage your flows and diagrams.</p>
                            </div>
                            <div className="flex items-center gap-3">


                                <Button
                                    onClick={onLaunch}
                                    variant="primary"
                                    size="md"
                                    icon={<Plus className="w-4 h-4" />}
                                >
                                    Create New
                                </Button>
                            </div>
                        </div>

                        {/* Recent Files */}
                        <section>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recent Files</h2>
                                {snapshots.length > 0 && (
                                    <span className="text-xs text-slate-400">{snapshots.length} files</span>
                                )}
                            </div>

                            {snapshots.length === 0 ? (
                                <div className="text-center py-20 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                                    <div className="w-10 h-10 bg-[var(--brand-surface)] rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-100">
                                        <Plus className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <h3 className="text-slate-900 font-medium text-sm mb-1">Create your first flow</h3>
                                    <p className="text-[var(--brand-secondary)] text-xs">Start from scratch or import an existing diagram.</p>
                                    <div className="mt-6 flex items-center justify-center gap-3">
                                        <Button
                                            onClick={onImportJSON}
                                            variant="secondary"
                                            size="sm"
                                        >
                                            Open File
                                        </Button>
                                        <Button
                                            onClick={onLaunch}
                                            variant="primary"
                                            size="sm"
                                        >
                                            Create New
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {snapshots.map(snapshot => (
                                        <div
                                            key={snapshot.id}
                                            onClick={() => handleRestore(snapshot)}
                                            className="group bg-[var(--brand-surface)] rounded-lg border border-slate-200 overflow-hidden cursor-pointer hover:border-slate-300 hover:shadow-sm transition-all relative"
                                        >
                                            <div className="h-40 bg-slate-50 flex items-center justify-center border-b border-slate-100 relative overflow-hidden">
                                                {/* Minimalist Preview Placeholder */}
                                                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                                                    <code className="text-[8px] leading-relaxed select-none">
                                                        {`graph TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[End]\n  B -->|No| D[Loop]`}
                                                    </code>
                                                </div>
                                                <div className="w-8 h-8 rounded bg-[var(--brand-surface)] shadow-sm border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-[var(--brand-primary)] group-hover:border-[var(--brand-primary-200)] transition-colors z-10">
                                                    <Layout className="w-4 h-4" />
                                                </div>

                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => { e?.stopPropagation(); deleteSnapshot(snapshot.id); }}
                                                    className="absolute top-2 right-2 p-1.5 bg-[var(--brand-surface)] text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 opacity-0 group-hover:opacity-100 transition-all z-20"
                                                    title="Delete"
                                                >
                                                    <Command className="w-3 h-3" />
                                                </Button>
                                            </div>
                                            <div className="p-3">
                                                <h3 className="font-medium text-slate-900 text-sm truncate mb-1 group-hover:text-[var(--brand-primary)] transition-colors">{snapshot.name}</h3>
                                                <div className="flex items-center justify-between text-[11px] text-[var(--brand-secondary)]">
                                                    <span>{new Date(snapshot.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                    <span>{snapshot.nodes.length} nodes</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="flex-1 flex flex-col h-screen overflow-hidden animate-in fade-in duration-300">
                        <header className="px-8 py-6 border-b border-slate-100 bg-[var(--brand-surface)]">
                            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Settings</h1>
                        </header>

                        <div className="flex-1 flex min-h-0 bg-[var(--brand-surface)]">
                            {/* Settings Sidebar */}
                            <div className="w-48 border-r border-slate-100 p-2 space-y-1 overflow-y-auto">
                                <SidebarItem
                                    isActive={activeSettingsTab === 'brand'}
                                    onClick={() => setActiveSettingsTab('brand')}
                                >
                                    Brand Kit
                                </SidebarItem>
                                <SidebarItem
                                    isActive={activeSettingsTab === 'general'}
                                    onClick={() => setActiveSettingsTab('general')}
                                >
                                    General
                                </SidebarItem>
                                <SidebarItem
                                    isActive={activeSettingsTab === 'shortcuts'}
                                    onClick={() => setActiveSettingsTab('shortcuts')}
                                >
                                    Shortcuts
                                </SidebarItem>
                            </div>

                            {/* Settings Content */}
                            <div className="flex-1 overflow-y-auto p-8">
                                <div className="max-w-2xl">
                                    {activeSettingsTab === 'brand' && <BrandSettings />}
                                    {activeSettingsTab === 'general' && <GeneralSettings />}
                                    {activeSettingsTab === 'shortcuts' && <ShortcutsSettings />}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
