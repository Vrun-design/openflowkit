import { useMemo } from 'react';
import {
    Activity,
    ArrowRight,
    Code2,
    FileCode,
    Palette,
    Search,
    Settings,
    Sparkles,
    Zap,
} from 'lucide-react';
import { useFlowStore } from '@/store';
import type { CommandItem, CommandBarProps } from './types';

interface UseCommandBarCommandsParams {
    settings?: CommandBarProps['settings'];
    onUndo?: CommandBarProps['onUndo'];
    onRedo?: CommandBarProps['onRedo'];
}

export function useCommandBarCommands({
    settings,
    onUndo,
    onRedo,
}: UseCommandBarCommandsParams): CommandItem[] {
    return useMemo(() => {
        return [
            {
                id: 'ai-generate',
                label: 'Ask Flowpilot to build flow...',
                icon: <Sparkles className="w-4 h-4 text-[var(--brand-primary)]" />,
                type: 'navigation',
                description: 'Generate flow from text',
                view: 'ai',
            },
            {
                id: 'templates',
                label: 'Templates',
                icon: <Zap className="w-4 h-4 text-blue-500" />,
                type: 'navigation',
                description: 'Browse pre-built flows',
                view: 'templates',
            },
            {
                id: 'mermaid',
                label: 'Paste Mermaid Code',
                icon: <Code2 className="w-4 h-4 text-pink-500" />,
                type: 'navigation',
                view: 'mermaid',
            },
            {
                id: 'flowmind',
                label: `Paste ${useFlowStore.getState().brandConfig.appName} DSL`,
                icon: <FileCode className="w-4 h-4 text-emerald-500" />,
                type: 'navigation',
                view: 'flowmind',
            },
            {
                id: 'search-nodes',
                label: 'Search Nodes',
                icon: <Search className="w-4 h-4 text-[var(--brand-primary-400)]" />,
                shortcut: '⌘F',
                type: 'navigation',
                view: 'search',
            },
            {
                id: 'visuals',
                label: 'Connection Styles...',
                icon: <Activity className="w-4 h-4 text-pink-500" />,
                type: 'navigation',
                view: 'visuals',
                description: 'Edge styles & theme',
            },
            {
                id: 'wireframes',
                label: 'Wireframe Elements...',
                icon: <Activity className="w-4 h-4 text-purple-500" />,
                type: 'navigation',
                view: 'wireframes',
                description: 'Browser, Mobile, UI Controls',
            },
            ...(settings
                ? [
                    {
                        id: 'toggle-grid',
                        label: 'Show Grid',
                        icon: <Settings className="w-4 h-4 text-slate-500" />,
                        type: 'toggle' as const,
                        value: settings.showGrid,
                        action: settings.onToggleGrid,
                        description: settings.showGrid ? 'On' : 'Off',
                        hidden: true,
                    },
                    {
                        id: 'toggle-snap',
                        label: 'Snap to Grid',
                        icon: <Settings className="w-4 h-4 text-slate-500" />,
                        type: 'toggle' as const,
                        value: settings.snapToGrid,
                        action: settings.onToggleSnap,
                        description: settings.snapToGrid ? 'On' : 'Off',
                        hidden: true,
                    },
                    {
                        id: 'toggle-minimap',
                        label: 'Show MiniMap',
                        icon: <Settings className="w-4 h-4 text-slate-500" />,
                        type: 'toggle' as const,
                        value: settings.showMiniMap,
                        action: settings.onToggleMiniMap,
                        description: settings.showMiniMap ? 'On' : 'Off',
                        hidden: true,
                    },
                ]
                : []),
            {
                id: 'undo',
                label: 'Undo',
                icon: <ArrowRight className="w-4 h-4 rotate-180 text-slate-500" />,
                shortcut: '⌘Z',
                type: 'action',
                action: onUndo,
                hidden: true,
            },
            {
                id: 'redo',
                label: 'Redo',
                icon: <ArrowRight className="w-4 h-4 text-slate-500" />,
                shortcut: '⌘Y',
                type: 'action',
                action: onRedo,
                hidden: true,
            },
            {
                id: 'select-all-edges',
                label: 'Select All Edges',
                icon: <ArrowRight className="w-4 h-4 text-cyan-500" />,
                type: 'action',
                description: 'Highlight all connections',
                action: () => {
                    const { edges, setEdges } = useFlowStore.getState();
                    setEdges(edges.map((edge) => ({ ...edge, selected: true })));
                },
                hidden: true,
            },
            {
                id: 'design-systems',
                label: 'Design Systems...',
                icon: <Palette className="w-4 h-4 text-[var(--brand-primary)]" />,
                type: 'navigation',
                view: 'design-system',
                description: 'Manage themes & styles',
            },
        ];
    }, [settings, onUndo, onRedo]);
}
