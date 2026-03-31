import { useMemo } from 'react';
import {
    ArrowRight,
    Code2,
    Compass,
    FileCode,
    Import,
    Search,
    Settings,
    Shield,
    WandSparkles,
    Workflow,
} from 'lucide-react';
import { useFlowStore } from '@/store';
import { APP_NAME, FLOWPILOT_NAME } from '@/lib/brand';
import type { CommandItem, CommandBarProps } from './types';
import { AssetsIcon } from '../icons/AssetsIcon';

interface UseCommandBarCommandsParams {
    settings?: CommandBarProps['settings'];
    onUndo?: CommandBarProps['onUndo'];
    onRedo?: CommandBarProps['onRedo'];
    onOpenStudioAI?: CommandBarProps['onOpenStudioAI'];
    onOpenStudioOpenFlow?: CommandBarProps['onOpenStudioOpenFlow'];
    onOpenStudioMermaid?: CommandBarProps['onOpenStudioMermaid'];
    onOpenArchitectureRules?: CommandBarProps['onOpenArchitectureRules'];
    hasImport?: boolean;
}

export function useCommandBarCommands({
    settings,
    onUndo,
    onRedo,
    onOpenStudioAI,
    onOpenStudioOpenFlow,
    onOpenStudioMermaid,
    onOpenArchitectureRules,
    hasImport = false,
}: UseCommandBarCommandsParams): CommandItem[] {
    return useMemo(() => {
        const importCommands: CommandItem[] = hasImport
            ? [{
                id: 'import',
                label: 'Import from data',
                icon: <Import className="w-4 h-4 text-violet-500" />,
                tier: 'core',
                type: 'navigation',
                view: 'import',
                description: 'SQL -> ERD, Terraform -> Cloud, OpenAPI -> Sequence, Code -> Architecture',
                badge: 'Beta',
            }]
            : [];

        const settingsCommands: CommandItem[] = settings
            ? [
                {
                    id: 'toggle-grid',
                    label: 'Show Grid',
                    icon: <Settings className="w-4 h-4 text-[var(--brand-secondary)]" />,
                    tier: 'advanced',
                    type: 'toggle',
                    value: settings.showGrid,
                    action: settings.onToggleGrid,
                    description: settings.showGrid ? 'On' : 'Off',
                    hidden: true,
                },
                {
                    id: 'toggle-snap',
                    label: 'Snap to Grid',
                    icon: <Settings className="w-4 h-4 text-[var(--brand-secondary)]" />,
                    tier: 'advanced',
                    type: 'toggle',
                    value: settings.snapToGrid,
                    action: settings.onToggleSnap,
                    description: settings.snapToGrid ? 'On' : 'Off',
                    hidden: true,
                },
            ]
            : [];

        return [
            {
                id: 'studio-ai',
                label: `Open ${FLOWPILOT_NAME}`,
                icon: <WandSparkles className="w-4 h-4 text-[var(--brand-primary)]" />,
                tier: 'core',
                type: 'action',
                description: `Open ${FLOWPILOT_NAME} in the right rail`,
                action: onOpenStudioAI,
                badge: 'Beta',
            },
            ...importCommands,
            {
                id: 'templates',
                label: 'Start from Template',
                icon: <Compass className="w-4 h-4 text-blue-500" />,
                tier: 'core',
                type: 'navigation',
                description: 'Browse pre-built flows and starter layouts',
                view: 'templates',
            },
            {
                id: 'assets',
                label: 'Assets',
                icon: <AssetsIcon className="w-4 h-4 text-[var(--brand-primary)]" />,
                tier: 'advanced',
                type: 'navigation',
                view: 'assets',
                description: 'Wireframes, notes, sections, and media',
            },
            {
                id: 'search-nodes',
                label: 'Search Nodes',
                icon: <Search className="w-4 h-4 text-[var(--brand-primary-400)]" />,
                tier: 'core',
                shortcut: '⌘F',
                type: 'navigation',
                view: 'search',
                description: 'Find nodes already on the canvas',
            },
            {
                id: 'layout',
                label: 'Auto Layout',
                icon: <Workflow className="w-4 h-4 text-sky-500" />,
                tier: 'core',
                type: 'navigation',
                view: 'layout',
                description: 'Arrange the current flow automatically',
            },
            {
                id: 'architecture-rules',
                label: 'Architecture Rules',
                icon: <Shield className="w-4 h-4 text-amber-500" />,
                tier: 'advanced',
                type: 'action',
                description: 'Open architecture guardrails and rule templates',
                action: onOpenArchitectureRules,
            },
            {
                id: 'studio-openflow',
                label: 'Edit Flow DSL',
                icon: <FileCode className="w-4 h-4 text-emerald-500" />,
                tier: 'advanced',
                type: 'action',
                description: `Open ${APP_NAME} DSL in Studio`,
                action: onOpenStudioOpenFlow,
            },
            {
                id: 'studio-mermaid',
                label: 'Edit Mermaid Code',
                icon: <Code2 className="w-4 h-4 text-pink-500" />,
                tier: 'advanced',
                type: 'action',
                description: 'Open Mermaid editing in Studio',
                action: onOpenStudioMermaid,
            },
            ...settingsCommands,
            {
                id: 'undo',
                label: 'Undo',
                icon: <ArrowRight className="w-4 h-4 rotate-180 text-[var(--brand-secondary)]" />,
                tier: 'advanced',
                shortcut: '⌘Z',
                type: 'action',
                action: onUndo,
                hidden: true,
            },
            {
                id: 'redo',
                label: 'Redo',
                icon: <ArrowRight className="w-4 h-4 text-[var(--brand-secondary)]" />,
                tier: 'advanced',
                shortcut: '⌘Y',
                type: 'action',
                action: onRedo,
                hidden: true,
            },
            {
                id: 'select-all-edges',
                label: 'Select All Edges',
                icon: <ArrowRight className="w-4 h-4 text-cyan-500" />,
                tier: 'advanced',
                type: 'action',
                description: 'Highlight all connections',
                action: () => {
                    const { edges, setEdges } = useFlowStore.getState();
                    setEdges(edges.map((edge) => ({ ...edge, selected: true })));
                },
                hidden: true,
            },
        ];
    }, [
        hasImport,
        onOpenArchitectureRules,
        onOpenStudioAI,
        onOpenStudioMermaid,
        onOpenStudioOpenFlow,
        onRedo,
        onUndo,
        settings,
    ]);
}
