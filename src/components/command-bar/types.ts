import type { FlowEdge, FlowNode } from '@/lib/types';
import { FlowTemplate } from '../../services/templates';
import { LayoutAlgorithm } from '../../services/elkLayout';
import type { DomainLibraryItem } from '@/services/domainLibrary';
import type { SupportedLanguage } from '@/hooks/ai-generation/codeToArchitecture';
import type { TerraformInputFormat } from '@/hooks/ai-generation/terraformToCloud';
import type { EditorSurfaceTier } from '@/components/editorSurfaceTiers';

export type CommandView =
  | 'root'
  | 'templates'
  | 'search'
  | 'layout'
  | 'design-system'
  | 'assets'
  | 'layers'
  | 'pages'
  | 'import';

export interface CommandItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  tier: EditorSurfaceTier;
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
  onLayout?: (
    direction?: 'TB' | 'LR' | 'RL' | 'BT',
    algorithm?: LayoutAlgorithm,
    spacing?: 'compact' | 'normal' | 'loose'
  ) => void;
  onSelectTemplate?: (template: FlowTemplate) => void;
  onOpenStudioAI?: () => void;
  onOpenStudioOpenFlow?: () => void;
  onOpenStudioMermaid?: () => void;
  onOpenStudioPlayback?: () => void;
  initialView?: CommandView;
  onAddAnnotation?: () => void;
  onAddSection?: () => void;
  onAddText?: () => void;
  onAddJourney?: () => void;
  onAddMindmap?: () => void;
  onAddArchitecture?: () => void;
  onAddSequence?: () => void;
  onAddClassNode?: () => void;
  onAddEntityNode?: () => void;
  onAddImage?: (imageUrl: string) => void;
  onAddBrowserWireframe?: () => void;
  onAddMobileWireframe?: () => void;
  onAddDomainLibraryItem?: (item: DomainLibraryItem) => void;
  onCodeAnalysis?: (code: string, language: SupportedLanguage) => Promise<void>;
  onSqlAnalysis?: (sql: string) => Promise<void>;
  onTerraformAnalysis?: (input: string, format: TerraformInputFormat) => Promise<void>;
  onOpenApiAnalysis?: (spec: string) => Promise<void>;
  onApplyDsl?: (dsl: string) => void;
  onCodebaseAnalysis?: (summary: string) => Promise<void>;
  settings?: {
    showGrid: boolean;
    onToggleGrid: () => void;
    snapToGrid: boolean;
    onToggleSnap: () => void;
  };
}
