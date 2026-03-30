import type { DiagramNodePropertiesComponent } from '@/diagram-types/core';
import type { DiagramType } from '@/lib/types';
import { ArchitectureNodeProperties } from '@/components/properties/families/ArchitectureNodeProperties';
import { ClassDiagramNodeProperties } from '@/components/properties/families/ClassDiagramNodeProperties';
import { ERDiagramNodeProperties } from '@/components/properties/families/ERDiagramNodeProperties';
import { JourneyNodeProperties } from '@/components/properties/families/JourneyNodeProperties';
import { MindmapNodeProperties } from '@/components/properties/families/MindmapNodeProperties';
import { SequenceNodeProperties } from '@/components/properties/families/SequenceNodeProperties';

export interface BuiltInDiagramPropertyPanel {
  diagramType: DiagramType;
  component: DiagramNodePropertiesComponent;
}

export const BUILT_IN_DIAGRAM_PROPERTY_PANELS: BuiltInDiagramPropertyPanel[] = [
  { diagramType: 'classDiagram', component: ClassDiagramNodeProperties },
  { diagramType: 'erDiagram', component: ERDiagramNodeProperties },
  { diagramType: 'mindmap', component: MindmapNodeProperties },
  { diagramType: 'journey', component: JourneyNodeProperties },
  { diagramType: 'architecture', component: ArchitectureNodeProperties },
  { diagramType: 'sequence', component: SequenceNodeProperties },
];
