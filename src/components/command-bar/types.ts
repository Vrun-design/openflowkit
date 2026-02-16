import { Node, Edge } from 'reactflow';
import { FlowTemplate } from '../../services/templates';
import { LayoutAlgorithm } from '../../services/elkLayout';

export type CommandView = 'root' | 'ai' | 'mermaid' | 'flowmind' | 'templates' | 'search' | 'layout' | 'visuals' | 'design-system' | 'wireframes';

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
    nodes: Node[];
    edges: Edge[];
    onApply: (nodes: Node[], edges: Edge[]) => void;
    onAIGenerate: (prompt: string, imageBase64?: string) => Promise<void>;
    isGenerating: boolean;
    chatMessages?: { role: 'user' | 'model'; parts: { text?: string; inlineData?: any }[] }[];
    onClearChat?: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
    onFitView?: () => void;
    onLayout?: (direction?: 'TB' | 'LR' | 'RL' | 'BT', algorithm?: LayoutAlgorithm, spacing?: 'compact' | 'normal' | 'loose') => void;
    onSelectTemplate?: (template: FlowTemplate) => void;
    initialView?: CommandView;
    settings?: {
        showGrid: boolean;
        onToggleGrid: () => void;
        snapToGrid: boolean;
        onToggleSnap: () => void;
        showMiniMap: boolean;
        onToggleMiniMap: () => void;
    };
}
