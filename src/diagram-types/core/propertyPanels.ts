import type { Node } from '@/lib/reactflowCompat';
import type React from 'react';
import type { DiagramType, NodeData } from '@/lib/types';

export interface DiagramNodePropertiesComponentProps {
  selectedNode: Node<NodeData>;
  onChange: (id: string, data: Partial<NodeData>) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onAddMindmapChild?: (parentId: string) => void;
  onAddMindmapSibling?: (nodeId: string) => void;
  onAddArchitectureService?: (sourceId: string) => void;
  onCreateArchitectureBoundary?: (sourceId: string) => void;
}

export type DiagramNodePropertiesComponent = React.ComponentType<DiagramNodePropertiesComponentProps>;

const nodePropertiesRegistry = new Map<DiagramType, DiagramNodePropertiesComponent>();

export function registerDiagramNodeProperties(
  diagramType: DiagramType,
  component: DiagramNodePropertiesComponent
): void {
  nodePropertiesRegistry.set(diagramType, component);
}

export function getDiagramNodeProperties(
  diagramType: DiagramType
): DiagramNodePropertiesComponent | undefined {
  return nodePropertiesRegistry.get(diagramType);
}
