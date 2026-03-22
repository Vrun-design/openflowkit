import { useMemo } from 'react';
import {
    ArrowRight,
    Code2,
    Compass,
    FileCode,
    Palette,
    Search,
    Settings,
    WandSparkles,
    Workflow,
} from 'lucide-react';
import { useFlowStore } from '@/store';
import { APP_NAME } from '@/lib/brand';
import type { CommandItem, CommandBarProps } from './types';
import { AssetsIcon } from '../icons/AssetsIcon';

interface UseCommandBarCommandsParams {
    settings?: CommandBarProps['settings'];
    onUndo?: CommandBarProps['onUndo'];
    onRedo?: CommandBarProps['onRedo'];
    onOpenStudioAI?: CommandBarProps['onOpenStudioAI'];
    onOpenStudioOpenFlow?: CommandBarProps['onOpenStudioOpenFlow'];
    onOpenStudioMermaid?: CommandBarProps['onOpenStudioMermaid'];
    onOpenStudioPlayback?: CommandBarProps['onOpenStudioPlayback'];
}

export function useCommandBarCommands({
    settings,
    onUndo,
    onRedo,
    onOpenStudioAI,
    onOpenStudioOpenFlow,
    onOpenStudioMermaid,
    onOpenStudioPlayback,
}: UseCommandBarCommandsParams): CommandItem[] {
    return useMemo(() => {
        return [
            {
                id: 'studio-ai',
                label: 'Open AI Studio',
                icon: <WandSparkles className="w-4 h-4 text-[var(--brand-primary)]" />,
                type: 'action',
                description: 'Open AI editing in the right rail',
                action: onOpenStudioAI,
            },
            {
                id: 'studio-openflow',
                label: 'Edit Flow DSL',
                icon: <FileCode className="w-4 h-4 text-emerald-500" />,
                type: 'action',
                description: `Open ${APP_NAME} DSL in Studio`,
                action: onOpenStudioOpenFlow,
            },
            {
                id: 'studio-mermaid',
                label: 'Edit Mermaid Code',
                icon: <Code2 className="w-4 h-4 text-pink-500" />,
                type: 'action',
                description: 'Open Mermaid editing in Studio',
                action: onOpenStudioMermaid,
            },
            {
                id: 'studio-playback',
                label: 'Open Playback Studio',
                icon: <Workflow className="w-4 h-4 text-violet-500" />,
                type: 'action' as const,
                description: 'Author scenes, timeline order, and playback preview',
                action: onOpenStudioPlayback,
            },
            {
                id: 'assets',
                label: 'Assets',
                icon: <AssetsIcon className="w-4 h-4 text-[var(--brand-primary)]" />,
                type: 'navigation',
                view: 'assets',
                description: 'Wireframes, notes, sections, and media',
            },
            {
                id: 'search-nodes',
                label: 'Search Nodes',
                icon: <Search className="w-4 h-4 text-[var(--brand-primary-400)]" />,
                shortcut: '⌘F',
                type: 'navigation',
                view: 'search',
                description: 'Find nodes already on the canvas',
            },
            {
                id: 'layout',
                label: 'Auto Layout',
                icon: <Workflow className="w-4 h-4 text-sky-500" />,
                type: 'navigation',
                view: 'layout',
                description: 'Arrange the current flow automatically',
            },
            {
                id: 'templates',
                label: 'Start from Template',
                icon: <Compass className="w-4 h-4 text-blue-500" />,
                type: 'navigation',
                description: 'Browse pre-built flows and starter layouts',
                view: 'templates',
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
                label: 'Design Systems',
                icon: <Palette className="w-4 h-4 text-[var(--brand-primary)]" />,
                type: 'navigation',
                view: 'design-system',
                description: 'Manage themes & styles',
            },
        ];
    }, [onOpenStudioAI, onOpenStudioOpenFlow, onOpenStudioMermaid, onOpenStudioPlayback, settings, onUndo, onRedo]);
}
