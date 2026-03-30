import type { DiagramPlugin } from '@/diagram-types/core';
import { ARCHITECTURE_PLUGIN } from '@/diagram-types/architecture/plugin';
import { CLASS_DIAGRAM_PLUGIN } from '@/diagram-types/classDiagram/plugin';
import { ER_DIAGRAM_PLUGIN } from '@/diagram-types/erDiagram/plugin';
import { FLOWCHART_PLUGIN } from '@/diagram-types/flowchart/plugin';
import { JOURNEY_PLUGIN } from '@/diagram-types/journey/plugin';
import { MINDMAP_PLUGIN } from '@/diagram-types/mindmap/plugin';
import { SEQUENCE_PLUGIN } from '@/diagram-types/sequence/plugin';
import { STATE_DIAGRAM_PLUGIN } from '@/diagram-types/stateDiagram/plugin';

export const BUILT_IN_DIAGRAM_PLUGINS: DiagramPlugin[] = [
  FLOWCHART_PLUGIN,
  STATE_DIAGRAM_PLUGIN,
  CLASS_DIAGRAM_PLUGIN,
  ER_DIAGRAM_PLUGIN,
  MINDMAP_PLUGIN,
  JOURNEY_PLUGIN,
  ARCHITECTURE_PLUGIN,
  SEQUENCE_PLUGIN,
];
