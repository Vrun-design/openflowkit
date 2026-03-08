import type { FlowEdge, FlowNode } from '@/lib/types';
import { FlowTemplate } from '../../services/templates';
import { LayoutAlgorithm } from '../../services/elkLayout';
import type { DomainLibraryItem } from '@/services/domainLibrary';

export type CommandView = 'root' | 'templates' | 'search' | 'layout' | 'design-system' | 'assets' | 'layers' | 'pages';

export interface CommandItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    shortcut?: string;
    action?: () => void;
    type: 'action' | 'navigation' | 'ai' | 'toggle';
    description?: string;
    value?: boolean;
    view?: CommandView;
    hidden?: boolean;
}

export interface CommandBarProps {
    isOpen: boolean;
    onClose: () => void;
    nodes: FlowNode[];
    edges: FlowEdge[];
    onUndo?: () => void;
    onRedo?: () => void;
    onLayout?: (direction?: 'TB' | 'LR' | 'RL' | 'BT', algorithm?: LayoutAlgorithm, spacing?: 'compact' | 'normal' | 'loose') => void;
    onSelectTemplate?: (template: FlowTemplate) => void;
    onOpenStudioAI?: () => void;
    onOpenStudioFlowMind?: () => void;
    onOpenStudioMermaid?: () => void;
    initialView?: CommandView;
    onAddAnnotation?: () => void;
    onAddSection?: () => void;
    onAddText?: () => void;
    onAddJourney?: () => void;
    onAddMindmap?: () => void;
    onAddArchitecture?: () => void;
    onAddImage?: (imageUrl: string) => void;
    onAddBrowserWireframe?: () => void;
    onAddMobileWireframe?: () => void;
    onAddDomainLibraryItem?: (item: DomainLibraryItem) => void;
    settings?: {
        showGrid: boolean;
        onToggleGrid: () => void;
        snapToGrid: boolean;
        onToggleSnap: () => void;
    };
}
