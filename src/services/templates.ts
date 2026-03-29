import { Layout, Cloud, GitBranch, Monitor, Route, ShipWheel } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { FlowEdge, FlowNode } from '@/lib/types';
import type {
  TemplateDifficulty,
  TemplateManifest,
  TemplatePreviewVariant,
} from './templateLibrary/types';
import { createStarterTemplateRegistry } from './templateLibrary/starterTemplates';

export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  msg: string;
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
  nodes: FlowNode[];
  edges: FlowEdge[];
}

function getTemplateIcon(category: string): LucideIcon {
  switch (category) {
    case 'aws':
    case 'azure':
      return Cloud;
    case 'architecture':
      return Layout;
    case 'cncf':
      return ShipWheel;
    case 'mindmap':
    case 'sequence':
      return GitBranch;
    case 'journey':
      return Route;
    case 'wireframe':
      return Monitor;
    case 'flowchart':
    default:
      return Layout;
  }
}

function mapTemplateManifestToFlowTemplate(template: TemplateManifest): FlowTemplate {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    icon: getTemplateIcon(template.category),
    msg: template.category,
    category: template.category,
    tags: [...template.tags],
    audience: template.audience,
    useCase: template.useCase,
    launchPriority: template.launchPriority,
    featured: template.featured,
    difficulty: template.difficulty,
    outcome: template.outcome,
    replacementHints: [...template.replacementHints],
    previewVariant: template.previewVariant,
    nodes: template.graph.nodes,
    edges: template.graph.edges,
  };
}

function compareTemplates(left: FlowTemplate, right: FlowTemplate): number {
  if (left.featured !== right.featured) {
    return left.featured ? -1 : 1;
  }

  const priorityDelta = right.launchPriority - left.launchPriority;
  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  return left.name.localeCompare(right.name);
}

function listRegistryTemplates(): FlowTemplate[] {
  const registry = createStarterTemplateRegistry();
  return registry.listTemplates().map(mapTemplateManifestToFlowTemplate).sort(compareTemplates);
}

export const FLOW_TEMPLATES: FlowTemplate[] = listRegistryTemplates();

export function getFlowTemplates(): FlowTemplate[] {
  return FLOW_TEMPLATES;
}
