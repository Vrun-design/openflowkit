import type { FlowEdge, FlowNode } from '@/lib/types';

export interface TemplateGraphSnapshot {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export type TemplateDifficulty = 'starter' | 'intermediate' | 'advanced';

export type TemplatePreviewVariant = 'diagram' | 'asset-rich' | 'sequence';

export interface TemplateManifest {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  audience: 'developers' | 'builders';
  useCase: string;
  launchPriority: number;
  featured: boolean;
  difficulty: TemplateDifficulty;
  outcome: string;
  replacementHints: string[];
  previewVariant?: TemplatePreviewVariant;
  graph: TemplateGraphSnapshot;
}
