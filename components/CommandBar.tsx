import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    Sparkles,
    Layout,
    Command,
    Settings,
    Zap,
    ArrowRight,
    Code2,
    FileCode,
    Search,
    Palette
} from 'lucide-react';

import { useFlowStore } from '../store';
import { CommandBarProps, CommandItem, CommandView } from './command-bar/types';

// Import newly refactored views
import { RootView } from './command-bar/RootView';
import { AIView } from './command-bar/AIView';
import { CodeView } from './command-bar/CodeView';
import { TemplatesView } from './command-bar/TemplatesView';
import { SearchView } from './command-bar/SearchView';
import { LayoutView } from './command-bar/LayoutView';
import { VisualsView } from './command-bar/VisualsView';

import { DesignSystemView } from './command-bar/DesignSystemView';
import { WireframesView } from './command-bar/WireframesView';


export const CommandBar: React.FC<CommandBarProps> = ({
    isOpen,
    onClose,
    nodes,
    edges,
    onApply,
    onAIGenerate,
    isGenerating,
    onUndo,
    onRedo,
    onFitView,
    onLayout,
    onSelectTemplate,
    initialView = 'root',
    settings,
}) => {
    const [view, setView] = useState<CommandView>(initialView);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setView(initialView);
            setSearchQuery('');
            setSelectedIndex(-1);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen, initialView]);

    const handleBack = useCallback(() => {
        if (view === 'root') {
            onClose();
        } else {
            setView('root');
            setSearchQuery('');
        }
    }, [view, onClose]);

    const commands: CommandItem[] = useMemo(() => [
        {
            id: 'ai-generate',
            label: 'Ask AI to build flow...',
            icon: <Sparkles className="w-4 h-4 text-[var(--brand-primary)]" />,
            type: 'navigation',
            description: 'Generate flow from text',
            view: 'ai'
        },
        {
            id: 'templates',
            label: 'Templates',
            icon: <Layout className="w-4 h-4 text-blue-500" />,
            type: 'navigation',
            description: 'Browse pre-built flows',
            view: 'templates'
        },
        {
            id: 'mermaid',
            label: 'Paste Mermaid Code',
            icon: <Code2 className="w-4 h-4 text-pink-500" />,
            type: 'navigation',
            view: 'mermaid'
        },
        {
            id: 'flowmind',
            label: `Paste ${useFlowStore.getState().brandConfig.appName} DSL`,
            icon: <FileCode className="w-4 h-4 text-emerald-500" />,
            type: 'navigation',
            view: 'flowmind'
        },
        {
            id: 'fit-view',
            label: 'Fit View',
            icon: <Command className="w-4 h-4 text-slate-500" />,
            shortcut: '⇧1',
            type: 'action',
            action: onFitView
        },
        {
            id: 'search-nodes',
            label: 'Search Nodes',
            icon: <Search className="w-4 h-4 text-[var(--brand-primary-400)]" />,
            shortcut: '⌘F',
            type: 'navigation',
            view: 'search'
        },
        {
            id: 'auto-layout',
            label: 'Layout Studio...',
            icon: <Zap className="w-4 h-4 text-amber-500" />,
            type: 'navigation',
            view: 'layout',
            description: 'Advanced algorithms & settings'
        },
        {
            id: 'visuals',
            label: 'Global Visuals...',
            icon: <Palette className="w-4 h-4 text-pink-500" />,
            type: 'navigation',
            view: 'visuals',
            description: 'Edge styles & theme'
        },
        {
            id: 'wireframes',
            label: 'Wireframe Elements...',
            icon: <Layout className="w-4 h-4 text-purple-500" />,
            type: 'navigation',
            view: 'wireframes',
            description: 'Browser, Mobile, UI Controls'
        },
        // Hidden Commands (Search only)
        ...(settings ? [
            {
                id: 'toggle-grid',
                label: 'Show Grid',
                icon: <Settings className="w-4 h-4 text-slate-500" />,
                type: 'toggle' as const,
                value: settings.showGrid,
                action: settings.onToggleGrid,
                description: settings.showGrid ? 'On' : 'Off',
                hidden: true
            },
            {
                id: 'toggle-snap',
                label: 'Snap to Grid',
                icon: <Settings className="w-4 h-4 text-slate-500" />,
                type: 'toggle' as const,
                value: settings.snapToGrid,
                action: settings.onToggleSnap,
                description: settings.snapToGrid ? 'On' : 'Off',
                hidden: true
            },
            {
                id: 'toggle-minimap',
                label: 'Show MiniMap',
                icon: <Settings className="w-4 h-4 text-slate-500" />,
                type: 'toggle' as const,
                value: settings.showMiniMap,
                action: settings.onToggleMiniMap,
                description: settings.showMiniMap ? 'On' : 'Off',
                hidden: true
            }
        ] : []),
        {
            id: 'undo',
            label: 'Undo',
            icon: <ArrowRight className="w-4 h-4 rotate-180 text-slate-500" />,
            shortcut: '⌘Z',
            type: 'action',
            action: onUndo,
            hidden: true
        },
        {
            id: 'redo',
            label: 'Redo',
            icon: <ArrowRight className="w-4 h-4 text-slate-500" />,
            shortcut: '⌘Y',
            type: 'action',
            action: onRedo,
            hidden: true
        },
        {
            id: 'select-all-edges',
            label: 'Select All Edges',
            icon: <ArrowRight className="w-4 h-4 text-cyan-500" />,
            type: 'action',
            description: 'Highlight all connections',
            action: () => {
                const { edges, setEdges } = useFlowStore.getState();
                setEdges(edges.map(e => ({ ...e, selected: true })));
            },
            hidden: true
        },
        // Bottom aligned
        {
            id: 'design-systems',
            label: 'Design Systems...',
            icon: <Palette className="w-4 h-4 text-[var(--brand-primary)]" />,
            type: 'navigation',
            view: 'design-system',
            description: 'Manage themes & styles'
        },
    ], [settings, onFitView, onUndo, onRedo]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center pb-24 pointer-events-none">
            <div className="absolute inset-0 bg-black/5 pointer-events-auto transition-opacity" onClick={onClose} />

            <div
                ref={containerRef}
                className="pointer-events-auto w-[600px] h-[480px] bg-white/95 backdrop-blur-xl rounded-[var(--radius-lg)] shadow-2xl border border-white/40 ring-1 ring-black/5 overflow-hidden animate-in slide-in-from-bottom-4 duration-200 flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {view === 'root' && (
                    <RootView
                        commands={commands}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        selectedIndex={selectedIndex}
                        setSelectedIndex={setSelectedIndex}
                        onClose={onClose}
                        setView={setView}
                        inputRef={inputRef}
                    />
                )}
                {view === 'visuals' && (
                    <VisualsView onBack={handleBack} />
                )}
                {view === 'design-system' && (
                    <DesignSystemView
                        onClose={onClose}
                        handleBack={handleBack}
                    />
                )}
                {view === 'ai' && (
                    <AIView
                        searchQuery={searchQuery}
                        onAIGenerate={onAIGenerate}
                        onClose={onClose}
                        handleBack={handleBack}
                        isGenerating={isGenerating}
                    />
                )}
                {view === 'mermaid' && (
                    <CodeView
                        mode="mermaid"
                        nodes={nodes}
                        edges={edges}
                        onApply={onApply}
                        onClose={onClose}
                        handleBack={handleBack}
                    />
                )}
                {view === 'flowmind' && (
                    <CodeView
                        mode="flowmind"
                        nodes={nodes}
                        edges={edges}
                        onApply={onApply}
                        onClose={onClose}
                        handleBack={handleBack}
                    />
                )}
                {view === 'templates' && (
                    <TemplatesView
                        onSelectTemplate={onSelectTemplate}
                        onClose={onClose}
                        handleBack={handleBack}
                    />
                )}
                {view === 'layout' && (
                    <LayoutView
                        onLayout={onLayout}
                        onClose={onClose}
                        handleBack={handleBack}
                    />
                )}
                {view === 'search' && (
                    <SearchView
                        nodes={nodes}
                        onClose={onClose}
                        handleBack={handleBack}
                    />
                )}
                {view === 'wireframes' && (
                    <WireframesView
                        onClose={onClose}
                        handleBack={handleBack}
                    />
                )}

                {/* Footer (only show on root?) */}
                {view === 'root' && (
                    <div className="bg-slate-50/50 border-t border-slate-200/50 px-4 py-2 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                                <span className="w-4 h-4 flex items-center justify-center bg-white border border-slate-200 rounded shadow-sm text-[9px]">↵</span>
                                <span>to select</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-4 h-4 flex items-center justify-center bg-white border border-slate-200 rounded shadow-sm text-[9px]">↑↓</span>
                                <span>to navigate</span>
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 bg-slate-200 rounded text-slate-500">Esc</span>
                            <span>to close</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
