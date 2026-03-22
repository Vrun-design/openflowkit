import { Layout, Cloud, GitBranch, Monitor, Route, ShipWheel } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { FlowEdge, FlowNode } from '@/lib/types';
import type { TemplateManifest } from './templateLibrary/types';
import { createStarterTemplateRegistry } from './templateLibrary/starterTemplates';

export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  msg: string;
  category: string;
  tags: string[];
  nodes: FlowNode[];
  edges: FlowEdge[];
}

function getTemplateIcon(category: string): LucideIcon {
  switch (category) {
    case 'aws':
    case 'azure':
      return Cloud;
    case 'cncf':
      return ShipWheel;
    case 'mindmap':
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
    nodes: template.graph.nodes,
    edges: template.graph.edges,
  };
}

function listRegistryTemplates(): FlowTemplate[] {
  const registry = createStarterTemplateRegistry();
  return registry.listTemplates().map(mapTemplateManifestToFlowTemplate);
}

export const FLOW_TEMPLATES: FlowTemplate[] = listRegistryTemplates();

export function getFlowTemplates(): FlowTemplate[] {
  return FLOW_TEMPLATES;
}
