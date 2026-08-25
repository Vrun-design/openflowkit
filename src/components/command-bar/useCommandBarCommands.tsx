import { useMemo } from 'react';
import {
  ArrowRight,
  Code2,
  Compass,
  Import,
  Layers,
  Monitor,
  MousePointer2,
  PanelsTopLeft,
  Play,
  Search,
  Settings,
  Shield,
  Smartphone,
  Sparkles,
  WandSparkles,
  Workflow,
} from 'lucide-react';
import { FLOWPILOT_NAME } from '@/lib/brand';
import { useFlowStore } from '@/store';
import { AssetsIcon } from '../icons/AssetsIcon';
import type { CommandBarProps, CommandItem } from './types';

type CommandAction = (() => void) | undefined;

interface UseCommandBarCommandsParams {
  settings?: CommandBarProps['settings'];
  onUndo?: CommandBarProps['onUndo'];
  onRedo?: CommandBarProps['onRedo'];
  onOpenStudioAI?: CommandBarProps['onOpenStudioAI'];
  onOpenStudioOpenFlow?: CommandBarProps['onOpenStudioOpenFlow'];
  onOpenStudioMermaid?: CommandBarProps['onOpenStudioMermaid'];
  onOpenStudioPlayback?: CommandBarProps['onOpenStudioPlayback'];
  onOpenArchitectureRules?: CommandBarProps['onOpenArchitectureRules'];
  onAddAnnotation?: CommandBarProps['onAddAnnotation'];
  onAddSection?: CommandBarProps['onAddSection'];
  onAddText?: CommandBarProps['onAddText'];
  onAddJourney?: CommandBarProps['onAddJourney'];
  onAddMindmap?: CommandBarProps['onAddMindmap'];
  onAddArchitecture?: CommandBarProps['onAddArchitecture'];
  onAddSequence?: CommandBarProps['onAddSequence'];
  onAddClassNode?: CommandBarProps['onAddClassNode'];
  onAddEntityNode?: CommandBarProps['onAddEntityNode'];
  onAddBrowserWireframe?: CommandBarProps['onAddBrowserWireframe'];
  onAddMobileWireframe?: CommandBarProps['onAddMobileWireframe'];
  hasImport?: boolean;
}

function actionCommand(command: CommandItem, action: CommandAction): CommandItem | null {
  return action ? { ...command, action } : null;
}

function presentCommands(commands: Array<CommandItem | null>): CommandItem[] {
  return commands.filter((command): command is CommandItem => command !== null);
}

export function useCommandBarCommands(params: UseCommandBarCommandsParams): CommandItem[] {
  const {
    settings,
    onUndo,
    onRedo,
    onOpenStudioAI,
    onOpenStudioOpenFlow,
    onOpenStudioMermaid,
    onOpenStudioPlayback,
    onOpenArchitectureRules,
    onAddAnnotation,
    onAddSection,
    onAddText,
    onAddJourney,
    onAddMindmap,
    onAddArchitecture,
    onAddSequence,
    onAddClassNode,
    onAddEntityNode,
    onAddBrowserWireframe,
    onAddMobileWireframe,
    hasImport = false,
  } = params;

  return useMemo(() => {
    const navigationCommands: CommandItem[] = [
      ...(hasImport
        ? [
            {
              id: 'import',
              label: 'Import from data',
              icon: <Import className="h-4 w-4 text-violet-500" />,
              tier: 'core' as const,
              type: 'navigation' as const,
              view: 'import' as const,
              description: 'Create diagrams from code, schemas, APIs, and infrastructure',
              keywords: ['sql', 'erd', 'terraform', 'openapi', 'codebase', 'database', 'schema'],
              badge: 'Beta',
            },
          ]
        : []),
      {
        id: 'templates',
        label: 'Start from Template',
        icon: <Compass className="h-4 w-4 text-blue-500" />,
        tier: 'core',
        type: 'navigation',
        view: 'templates',
        description: 'Browse pre-built flows and starter layouts',
        keywords: ['starter', 'gallery', 'example'],
      },
      {
        id: 'assets',
        label: 'Assets',
        icon: <AssetsIcon className="h-4 w-4 text-[var(--brand-primary)]" />,
        tier: 'advanced',
        type: 'navigation',
        view: 'assets',
        description: 'Browse reusable domain shapes and media',
        keywords: ['library', 'components', 'shapes', 'media'],
      },
      {
        id: 'search-nodes',
        label: 'Search Nodes',
        icon: <Search className="h-4 w-4 text-[var(--brand-primary-400)]" />,
        tier: 'core',
        shortcut: '⌘F',
        type: 'navigation',
        view: 'search',
        description: 'Find nodes already on the canvas',
        keywords: ['find', 'locate', 'canvas content'],
      },
      {
        id: 'layout',
        label: 'Auto Layout',
        icon: <Workflow className="h-4 w-4 text-sky-500" />,
        tier: 'core',
        type: 'navigation',
        view: 'layout',
        description: 'Arrange the current flow automatically',
        keywords: ['organize', 'arrange', 'direction', 'spacing'],
      },
      {
        id: 'layers',
        label: 'Manage Layers',
        icon: <Layers className="h-4 w-4 text-indigo-500" />,
        tier: 'advanced',
        type: 'navigation',
        view: 'layers',
        hidden: true,
        description: 'Inspect sections and canvas stacking',
        keywords: ['z index', 'stack', 'sections'],
      },
      {
        id: 'pages',
        label: 'Manage Pages',
        icon: <PanelsTopLeft className="h-4 w-4 text-teal-500" />,
        tier: 'advanced',
        type: 'navigation',
        view: 'pages',
        hidden: true,
        description: 'Create and switch document pages',
        keywords: ['screens', 'multi page', 'documents'],
      },
      {
        id: 'design-system',
        label: 'Design System',
        icon: <Sparkles className="h-4 w-4 text-fuchsia-500" />,
        tier: 'advanced',
        type: 'navigation',
        view: 'design-system',
        hidden: true,
        description: 'Edit reusable visual tokens and styles',
        keywords: ['theme', 'tokens', 'colors', 'typography', 'styles'],
      },
    ];

    const actions = presentCommands([
      actionCommand(
        {
          id: 'studio-ai',
          label: `Open ${FLOWPILOT_NAME}`,
          icon: <WandSparkles className="h-4 w-4 text-[var(--brand-primary)]" />,
          tier: 'core',
          type: 'action',
          description: `Open ${FLOWPILOT_NAME} in the right rail`,
          keywords: ['assistant', 'ai', 'generate', 'copilot'],
          badge: 'Beta',
        },
        onOpenStudioAI
      ),
      actionCommand(
        {
          id: 'studio-openflow',
          label: 'Edit OpenFlow',
          icon: <Code2 className="h-4 w-4 text-violet-500" />,
          tier: 'advanced',
          type: 'action',
          description: 'Open the canonical diagram source editor',
          keywords: ['dsl', 'diagram source', 'text format', 'flow code'],
          hidden: true,
        },
        onOpenStudioOpenFlow
      ),
      actionCommand(
        {
          id: 'studio-mermaid',
          label: 'Edit Mermaid Code',
          icon: <Code2 className="h-4 w-4 text-pink-500" />,
          tier: 'advanced',
          type: 'action',
          description: 'Open Mermaid editing in Studio',
          keywords: ['diagram source', 'flowchart', 'sequence syntax'],
        },
        onOpenStudioMermaid
      ),
      actionCommand(
        {
          id: 'studio-playback',
          label: 'Open Playback',
          icon: <Play className="h-4 w-4 text-emerald-500" />,
          tier: 'advanced',
          type: 'action',
          description: 'Present the document as a guided sequence',
          keywords: ['present', 'slideshow', 'tour', 'story'],
          hidden: true,
        },
        onOpenStudioPlayback
      ),
      actionCommand(
        {
          id: 'architecture-rules',
          label: 'Architecture Rules',
          icon: <Shield className="h-4 w-4 text-amber-500" />,
          tier: 'advanced',
          type: 'action',
          description: 'Open architecture guardrails and rule templates',
          keywords: ['lint', 'validate', 'governance', 'policy'],
        },
        onOpenArchitectureRules
      ),
      actionCommand(
        {
          id: 'add-annotation',
          label: 'Add Annotation',
          icon: <MousePointer2 className="h-4 w-4" />,
          tier: 'advanced',
          type: 'action',
          description: 'Add a canvas annotation',
          keywords: ['note', 'callout', 'comment'],
          hidden: true,
        },
        onAddAnnotation
      ),
      actionCommand(
        {
          id: 'add-section',
          label: 'Add Section',
          icon: <PanelsTopLeft className="h-4 w-4" />,
          tier: 'advanced',
          type: 'action',
          description: 'Group content in a section',
          keywords: ['frame', 'group', 'container'],
          hidden: true,
        },
        onAddSection
      ),
      actionCommand(
        {
          id: 'add-text',
          label: 'Add Text',
          icon: <Code2 className="h-4 w-4" />,
          tier: 'advanced',
          type: 'action',
          description: 'Add freeform text to the canvas',
          keywords: ['label', 'heading', 'copy'],
          hidden: true,
        },
        onAddText
      ),
      actionCommand(
        {
          id: 'add-journey',
          label: 'Add Journey Map',
          icon: <Workflow className="h-4 w-4" />,
          tier: 'advanced',
          type: 'action',
          description: 'Add a journey mapping canvas',
          keywords: ['customer journey', 'experience map'],
          hidden: true,
        },
        onAddJourney
      ),
      actionCommand(
        {
          id: 'add-mindmap',
          label: 'Add Mind Map',
          icon: <Workflow className="h-4 w-4" />,
          tier: 'advanced',
          type: 'action',
          description: 'Add a mind map root',
          keywords: ['brainstorm', 'ideas', 'tree'],
          hidden: true,
        },
        onAddMindmap
      ),
      actionCommand(
        {
          id: 'add-architecture',
          label: 'Add Architecture Diagram',
          icon: <Workflow className="h-4 w-4" />,
          tier: 'advanced',
          type: 'action',
          description: 'Add an architecture diagram',
          keywords: ['system design', 'cloud', 'infrastructure'],
          hidden: true,
        },
        onAddArchitecture
      ),
      actionCommand(
        {
          id: 'add-sequence',
          label: 'Add Sequence Diagram',
          icon: <Workflow className="h-4 w-4" />,
          tier: 'advanced',
          type: 'action',
          description: 'Add a sequence diagram',
          keywords: ['interaction', 'messages', 'uml'],
          hidden: true,
        },
        onAddSequence
      ),
      actionCommand(
        {
          id: 'add-class',
          label: 'Add Class Diagram',
          icon: <Workflow className="h-4 w-4" />,
          tier: 'advanced',
          type: 'action',
          description: 'Add a UML class diagram',
          keywords: ['uml', 'object model', 'types'],
          hidden: true,
        },
        onAddClassNode
      ),
      actionCommand(
        {
          id: 'add-entity',
          label: 'Add Entity',
          icon: <Workflow className="h-4 w-4" />,
          tier: 'advanced',
          type: 'action',
          description: 'Add a database entity',
          keywords: ['erd', 'table', 'database', 'schema'],
          hidden: true,
        },
        onAddEntityNode
      ),
      actionCommand(
        {
          id: 'add-browser-wireframe',
          label: 'Add Browser Wireframe',
          icon: <Monitor className="h-4 w-4" />,
          tier: 'advanced',
          type: 'action',
          description: 'Add a desktop browser mockup',
          keywords: ['website', 'desktop', 'screen', 'mockup'],
          hidden: true,
        },
        onAddBrowserWireframe
      ),
      actionCommand(
        {
          id: 'add-mobile-wireframe',
          label: 'Add Mobile Wireframe',
          icon: <Smartphone className="h-4 w-4" />,
          tier: 'advanced',
          type: 'action',
          description: 'Add a mobile device mockup',
          keywords: ['phone', 'app screen', 'mockup', 'iphone'],
          hidden: true,
        },
        onAddMobileWireframe
      ),
      actionCommand(
        {
          id: 'undo',
          label: 'Undo',
          icon: <ArrowRight className="h-4 w-4 rotate-180" />,
          tier: 'advanced',
          shortcut: '⌘Z',
          type: 'action',
          keywords: ['revert', 'back'],
          hidden: true,
        },
        onUndo
      ),
      actionCommand(
        {
          id: 'redo',
          label: 'Redo',
          icon: <ArrowRight className="h-4 w-4" />,
          tier: 'advanced',
          shortcut: '⌘Y',
          type: 'action',
          keywords: ['repeat', 'forward'],
          hidden: true,
        },
        onRedo
      ),
    ]);

    const selectionCommands: CommandItem[] = [
      {
        id: 'select-all-nodes',
        label: 'Select All Nodes',
        icon: <MousePointer2 className="h-4 w-4 text-cyan-500" />,
        tier: 'advanced',
        type: 'action',
        description: 'Select every node on the canvas',
        keywords: ['highlight everything', 'all shapes'],
        hidden: true,
        action: () =>
          useFlowStore
            .getState()
            .setNodes((nodes) => nodes.map((node) => ({ ...node, selected: true }))),
      },
      {
        id: 'select-all-edges',
        label: 'Select All Edges',
        icon: <ArrowRight className="h-4 w-4 text-cyan-500" />,
        tier: 'advanced',
        type: 'action',
        description: 'Select every connection on the canvas',
        keywords: ['highlight connections', 'all lines'],
        hidden: true,
        action: () =>
          useFlowStore
            .getState()
            .setEdges((edges) => edges.map((edge) => ({ ...edge, selected: true }))),
      },
      {
        id: 'clear-selection',
        label: 'Clear Selection',
        icon: <MousePointer2 className="h-4 w-4 text-slate-500" />,
        tier: 'advanced',
        type: 'action',
        description: 'Deselect every node and connection',
        keywords: ['deselect all', 'unselect', 'escape'],
        hidden: true,
        action: () => {
          const { setEdges, setNodes, setSelectedEdgeId, setSelectedNodeId } =
            useFlowStore.getState();
          setNodes((nodes) => nodes.map((node) => ({ ...node, selected: false })));
          setEdges((edges) => edges.map((edge) => ({ ...edge, selected: false })));
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
        },
      },
    ];

    const settingsCommands: CommandItem[] = settings
      ? [
          {
            id: 'toggle-grid',
            label: 'Show Grid',
            icon: <Settings className="h-4 w-4" />,
            tier: 'advanced',
            type: 'toggle',
            value: settings.showGrid,
            action: settings.onToggleGrid,
            description: settings.showGrid ? 'On' : 'Off',
            keywords: ['canvas grid', 'background'],
            hidden: true,
          },
          {
            id: 'toggle-snap',
            label: 'Snap to Grid',
            icon: <Settings className="h-4 w-4" />,
            tier: 'advanced',
            type: 'toggle',
            value: settings.snapToGrid,
            action: settings.onToggleSnap,
            description: settings.snapToGrid ? 'On' : 'Off',
            keywords: ['align', 'magnet', 'position'],
            hidden: true,
          },
        ]
      : [];

    return [
      ...actions.slice(0, 1),
      ...navigationCommands,
      ...actions.slice(1),
      ...selectionCommands,
      ...settingsCommands,
    ];
  }, [
    hasImport,
    onAddAnnotation,
    onAddArchitecture,
    onAddBrowserWireframe,
    onAddClassNode,
    onAddEntityNode,
    onAddJourney,
    onAddMindmap,
    onAddMobileWireframe,
    onAddSection,
    onAddSequence,
    onAddText,
    onOpenArchitectureRules,
    onOpenStudioAI,
    onOpenStudioMermaid,
    onOpenStudioOpenFlow,
    onOpenStudioPlayback,
    onRedo,
    onUndo,
    settings,
  ]);
}
