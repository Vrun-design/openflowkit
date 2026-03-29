import { createElement, useMemo, type ReactElement } from 'react';
import { useFlowStore } from '@/store';
import type { Node } from '@/lib/reactflowCompat';
import { NodeType, type DiagramType, type NodeData } from '@/lib/types';
import { getDiagramNodeProperties } from '@/diagram-types/core';
import { registerBuiltInPropertyPanels } from '@/diagram-types/registerBuiltInPropertyPanels';
import { NodeProperties } from './NodeProperties';

registerBuiltInPropertyPanels();

interface DiagramNodePropertiesRouterProps {
  selectedNode: Node<NodeData>;
  onChange: (id: string, data: Partial<NodeData>) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onFitSectionToContents?: (id: string) => void;
  onReleaseFromSection?: (id: string) => void;
  onBringContentsIntoSection?: (id: string) => void;
  onAddMindmapChild?: (parentId: string) => void;
  onAddMindmapSibling?: (nodeId: string) => void;
  onAddArchitectureService?: (sourceId: string) => void;
  onCreateArchitectureBoundary?: (sourceId: string) => void;
  onApplyArchitectureTemplate?: (
    sourceId: string,
    templateId: import('@/lib/architectureTemplates').ArchitectureTemplateId
  ) => void;
  onGenerateEntityFields?: (nodeId: string) => Promise<void> | void;
  onSuggestArchitectureNode?: (nodeId: string) => Promise<void> | void;
  onConvertEntitySelectionToClassDiagram?: () => void;
  onOpenMermaidCodeEditor?: () => void;
}

const NODE_TYPE_PANEL_MAP: Partial<Record<NodeType, DiagramType>> = {
  [NodeType.ARCHITECTURE]: 'architecture',
  [NodeType.CLASS]: 'classDiagram',
  [NodeType.ER_ENTITY]: 'erDiagram',
  [NodeType.JOURNEY]: 'journey',
  [NodeType.MINDMAP]: 'mindmap',
  [NodeType.SEQUENCE_PARTICIPANT]: 'sequence',
};

export function resolveNodePropertiesPanelDiagramType(
  selectedNodeType: string,
  activeDiagramType: DiagramType
): DiagramType {
  return NODE_TYPE_PANEL_MAP[selectedNodeType as NodeType] ?? activeDiagramType;
}

export function DiagramNodePropertiesRouter({
  selectedNode,
  onChange,
  onDuplicate,
  onDelete,
  onFitSectionToContents,
  onReleaseFromSection,
  onBringContentsIntoSection,
  onAddMindmapChild,
  onAddMindmapSibling,
  onAddArchitectureService,
  onCreateArchitectureBoundary,
  onApplyArchitectureTemplate,
  onGenerateEntityFields,
  onSuggestArchitectureNode,
  onConvertEntitySelectionToClassDiagram,
  onOpenMermaidCodeEditor,
}: DiagramNodePropertiesRouterProps): ReactElement {
  const tabs = useFlowStore((state) => state.tabs);
  const activeTabId = useFlowStore((state) => state.activeTabId);
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const activeDiagramType = activeTab?.diagramType ?? 'flowchart';
  const panelDiagramType = resolveNodePropertiesPanelDiagramType(
    selectedNode.type,
    activeDiagramType
  );
  const registeredComponent = useMemo(
    () => getDiagramNodeProperties(panelDiagramType),
    [panelDiagramType]
  );

  if (!registeredComponent) {
    return (
      <NodeProperties
        selectedNode={selectedNode}
        onChange={onChange}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onFitSectionToContents={onFitSectionToContents}
        onReleaseFromSection={onReleaseFromSection}
        onBringContentsIntoSection={onBringContentsIntoSection}
      />
    );
  }

  return createElement(registeredComponent, {
    selectedNode,
    onChange,
    onDuplicate,
    onDelete,
    onAddMindmapChild,
    onAddMindmapSibling,
    onAddArchitectureService,
    onCreateArchitectureBoundary,
    onApplyArchitectureTemplate,
    onGenerateEntityFields,
    onSuggestArchitectureNode,
    onConvertEntitySelectionToClassDiagram,
    onOpenMermaidCodeEditor,
  });
}
