import type { EdgeTypes, NodeTypes } from '@/lib/reactflowCompat';
import AnnotationNode from '@/components/AnnotationNode';
import CustomNode from '@/components/CustomNode';
import {
  CustomBezierEdge,
  CustomSmoothStepEdge,
  CustomStepEdge,
  CustomStraightEdge,
} from '@/components/CustomEdge';
import SequenceMessageEdge from '@/components/custom-edge/SequenceMessageEdge';
import ImageNode from '@/components/ImageNode';
import MermaidSvgNode from '@/components/MermaidSvgNode';
import SwimlaneNode from '@/components/SwimlaneNode';
import TextNode from '@/components/TextNode';
import BrowserNode from '@/components/custom-nodes/BrowserNode';
import MobileNode from '@/components/custom-nodes/MobileNode';
import ClassNode from '@/components/custom-nodes/ClassNode';
import EntityNode from '@/components/custom-nodes/EntityNode';
import MindmapNode from '@/components/custom-nodes/MindmapNode';
import JourneyNode from '@/components/custom-nodes/JourneyNode';
import ArchitectureNode from '@/components/custom-nodes/ArchitectureNode';
import SequenceParticipantNode from '@/components/custom-nodes/SequenceParticipantNode';
import SequenceNoteNode from '@/components/custom-nodes/SequenceNoteNode';
import SectionNode from '@/components/SectionNode';
import StrokeNode from '@/components/StrokeNode';

export const flowCanvasNodeTypes: NodeTypes = {
  start: CustomNode,
  process: CustomNode,
  decision: CustomNode,
  end: CustomNode,
  custom: CustomNode,
  class: ClassNode,
  er_entity: EntityNode,
  mindmap: MindmapNode,
  journey: JourneyNode,
  architecture: ArchitectureNode,
  annotation: AnnotationNode,
  text: TextNode,
  section: SectionNode,
  swimlane: SwimlaneNode,
  image: ImageNode,
  mermaid_svg: MermaidSvgNode,
  browser: BrowserNode,
  mobile: MobileNode,
  sequence_participant: SequenceParticipantNode,
  sequence_note: SequenceNoteNode,
  pen: StrokeNode,
  highlighter: StrokeNode,
  line: StrokeNode,
  arrow: StrokeNode,
};

export const flowCanvasEdgeTypes: EdgeTypes = {
  default: CustomBezierEdge,
  smoothstep: CustomSmoothStepEdge,
  step: CustomStepEdge,
  bezier: CustomBezierEdge,
  straight: CustomStraightEdge,
  sequence_message: SequenceMessageEdge,
};

interface ConnectionLike {
  source?: string | null;
  target?: string | null;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export function isDuplicateConnection(
  connection: ConnectionLike,
  edges: ConnectionLike[]
): boolean {
  return edges.some((edge) => {
    return (
      edge.source === connection.source &&
      edge.target === connection.target &&
      edge.sourceHandle === connection.sourceHandle &&
      edge.targetHandle === connection.targetHandle
    );
  });
}
