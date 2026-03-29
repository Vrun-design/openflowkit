import { type LegacyEdge, type LegacyNode } from '@/lib/reactflowCompat';
import type { ClassRelationToken, ERRelationToken } from '@/lib/relationSemantics';

export interface ErField {
  name: string;
  dataType: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isNotNull?: boolean;
  isUnique?: boolean;
  referencesTable?: string;
  referencesField?: string;
}

export const DIAGRAM_TYPES = [
  'flowchart',
  'stateDiagram',
  'classDiagram',
  'erDiagram',
  'gitGraph',
  'mindmap',
  'journey',
  'architecture',
  'sequence',
] as const;

export type DiagramType = (typeof DIAGRAM_TYPES)[number];

export function isDiagramType(value: unknown): value is DiagramType {
  return typeof value === 'string' && (DIAGRAM_TYPES as readonly string[]).includes(value);
}

export enum NodeType {
  START = 'start',
  PROCESS = 'process',
  JOURNEY = 'journey',
  MINDMAP = 'mindmap',
  ARCHITECTURE = 'architecture',
  CLASS = 'class',
  ER_ENTITY = 'er_entity',
  DECISION = 'decision',
  END = 'end',
  CUSTOM = 'custom',
  ANNOTATION = 'annotation',
  SECTION = 'section',
  GROUP = 'group',
  SWIMLANE = 'swimlane',
  IMAGE = 'image',
  TEXT = 'text',
  BROWSER = 'browser',
  MOBILE = 'mobile',
  SEQUENCE_PARTICIPANT = 'sequence_participant',
  SEQUENCE_MESSAGE = 'sequence_message',
}

export interface NodeData {
  [key: string]: unknown;
  label: string;
  subLabel?: string; // Supports Markdown
  icon?: string; // Key for the icon map
  secondaryIcon?: string; // Optional secondary icon key
  customIconUrl?: string; // User-uploaded icon (base64 or URL)
  imageUrl?: string; // Base64 or URL
  color?: string; // Preset color key (e.g., 'white', 'blue', 'custom')
  colorMode?: 'subtle' | 'filled';
  customColor?: string; // Hex color for the "custom" preset
  align?: 'left' | 'center' | 'right';
  shape?:
    | 'rectangle'
    | 'rounded'
    | 'capsule'
    | 'diamond'
    | 'hexagon'
    | 'cylinder'
    | 'ellipse'
    | 'parallelogram'
    | 'circle';
  rotation?: number;
  width?: number;
  height?: number;
  fontSize?: string;
  fontFamily?: string;
  fontWeight?: string; // 'normal', 'bold', '100'-'900'
  fontStyle?: string; // 'normal', 'italic'
  subLabelFontSize?: string;
  subLabelFontFamily?: string;
  subLabelFontWeight?: string; // 'normal', 'bold', '100'-'900'
  subLabelFontStyle?: string; // 'normal', 'italic'
  backgroundColor?: string;
  transparency?: number; // 0-1
  variant?: string; // wireframe preset key (e.g. 'landing', 'modal')
  layerId?: string; // layer identifier for visibility/lock/group operations
  classStereotype?: string;
  classAttributes?: string[];
  classMethods?: string[];
  erFields?: Array<string | ErField>;
  journeySection?: string;
  journeyActor?: string;
  journeyTask?: string;
  journeyScore?: number;
  mindmapDepth?: number;
  mindmapParentId?: string;
  mindmapSide?: 'left' | 'right';
  mindmapBranchStyle?: 'curved' | 'straight';
  mindmapCollapsed?: boolean;
  archProvider?: string;
  archProviderLabel?: string;
  archResourceType?: string;
  archEnvironment?: string;
  archBoundaryId?: string;
  archZone?: string;
  archTrustDomain?: string;
  archIconPackId?: string;
  archIconShapeId?: string;
  assetPresentation?: 'icon';
  assetProvider?: string;
  assetCategory?: string;
  seqParticipantKind?: 'participant' | 'actor';
  seqParticipantAlias?: string;
  seqMessageKind?: 'sync' | 'async' | 'return' | 'self' | 'create' | 'destroy';
  seqMessageFrom?: string;
  seqMessageTo?: string;
  seqMessageOrder?: number;
  seqActivations?: number[];
  seqNoteTarget?: string;
  seqNotePosition?: 'over' | 'left' | 'right';
  seqFragmentId?: string;
  sectionSizingMode?: 'manual' | 'fit';
  sectionLayoutMode?: 'freeform';
  sectionOrder?: number;
  sectionLocked?: boolean;
  sectionHidden?: boolean;
  sectionCollapsed?: boolean;
}

export interface AIRequestParams {
  prompt: string;
  apiKey: string;
}

export type FlowNode = LegacyNode<NodeData>;

export interface EdgeData {
  [key: string]: unknown;
  routingMode?: 'auto' | 'elk' | 'manual';
  condition?: EdgeCondition;
  labelOffsetX?: number;
  labelOffsetY?: number;
  labelPosition?: number; // 0 to 1, default 0.5
  strokeWidth?: number; // 1-6, default 2
  dashPattern?: 'solid' | 'dashed' | 'dotted' | 'dashdot';
  opacity?: number; // 0-1, default 1
  archProtocol?: string;
  archPort?: string;
  archDirection?: '-->' | '<--' | '<-->';
  archSourceSide?: 'L' | 'R' | 'T' | 'B';
  archTargetSide?: 'L' | 'R' | 'T' | 'B';
  classRelation?: ClassRelationToken;
  classRelationLabel?: string;
  erRelation?: ERRelationToken;
  erRelationLabel?: string;
  elkPoints?: {
    x: number;
    y: number;
  }[];
  mindmapBranchKind?: 'root' | 'branch';
  seqMessageKind?: 'sync' | 'async' | 'return' | 'self' | 'create' | 'destroy';
  connectionType?: 'fixed' | 'dynamic';
  seqFragment?: {
    type: 'alt' | 'loop' | 'opt' | 'par' | 'break' | 'critical';
    condition: string;
    edgeIds: string[];
  } | null;
  waypoint?: {
    x: number;
    y: number;
  };
  waypoints?: {
    x: number;
    y: number;
  }[];
  animation?: EdgeAnimationConfig;
}

export interface GlobalEdgeOptions {
  type: 'default' | 'step' | 'smoothstep' | 'bezier' | 'straight';
  animated: boolean;
  strokeWidth: number; // 1-5
  color?: string; // Optional override
}

export type FlowEdge = LegacyEdge<EdgeData>;

export interface EdgeAnimationConfig {
  enabled?: boolean;
  state?: 'idle' | 'active';
  style?: 'flow';
  durationMs?: number;
  dashArray?: string;
}

export interface PlaybackScene {
  id: string;
  name: string;
  stepIds: string[];
  mode?: 'auto' | 'manual';
}

export interface PlaybackTimelineStep {
  id: string;
  nodeId: string;
  durationMs?: number;
  sceneId?: string;
  emphasis?: 'focus';
}

export interface PlaybackState {
  version: 1;
  scenes: PlaybackScene[];
  timeline: PlaybackTimelineStep[];
  selectedSceneId: string | null;
  defaultStepDurationMs: number;
}

export interface GeneratedFlowData {
  nodes: {
    id: string;
    type: string;
    label: string;
    description?: string;
    x: number;
    y: number;
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    label?: string;
  }[];
}

export interface FlowHistoryState {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface FlowTab {
  id: string;
  name: string;
  diagramType?: DiagramType;
  updatedAt?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  playback?: PlaybackState;
  history: {
    past: FlowHistoryState[];
    future: FlowHistoryState[];
  };
}

export type EdgeCondition = 'default' | 'yes' | 'no' | 'success' | 'error' | 'timeout';

export interface FlowSnapshot {
  id: string;
  name: string;
  timestamp: string;
  kind?: 'manual' | 'auto';
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface DesignSystem {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    border: string;
    text: {
      primary: string;
      secondary: string;
    };
    nodeBackground: string;
    nodeBorder: string;
    nodeText: string;
    edge: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };
  };
  components: {
    node: {
      borderRadius: string;
      borderWidth: string;
      boxShadow: string;
      padding: string;
    };
    edge: {
      strokeWidth: number;
    };
  };
}
