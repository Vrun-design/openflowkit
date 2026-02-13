import { Edge, Node } from 'reactflow';

export enum NodeType {
  START = 'start',
  PROCESS = 'process',
  DECISION = 'decision',
  END = 'end',
  CUSTOM = 'custom',
  ANNOTATION = 'annotation',
  SECTION = 'section',
  GROUP = 'group',
  SWIMLANE = 'swimlane',
  IMAGE = 'image',
}

export interface NodeData {
  label: string;
  subLabel?: string; // Supports Markdown
  icon?: string; // Key for the icon map
  secondaryIcon?: string; // Optional secondary icon key
  customIconUrl?: string; // User-uploaded icon (base64 or URL)
  imageUrl?: string; // Base64 or URL
  color?: string; // Tailwind color class key (e.g., 'blue', 'red')
  align?: 'left' | 'center' | 'right';
  shape?: 'rectangle' | 'rounded' | 'capsule' | 'diamond' | 'hexagon' | 'cylinder' | 'ellipse' | 'parallelogram' | 'circle';
  rotation?: number;
  width?: number;
  height?: number;
  fontSize?: string;
  fontFamily?: string;
  backgroundColor?: string;
  transparency?: number; // 0-1
  variant?: string; // wireframe preset key (e.g. 'landing', 'modal')
}

export interface AIRequestParams {
  prompt: string;
  apiKey: string;
}

export type FlowNode = Node<NodeData>;

export interface EdgeData {
  condition?: EdgeCondition;
  labelOffsetX?: number;
  labelOffsetY?: number;
  labelPosition?: number; // 0 to 1, default 0.5
  strokeWidth?: number; // 1-6, default 2
  dashPattern?: 'solid' | 'dashed' | 'dotted' | 'dashdot';
  opacity?: number; // 0-1, default 1
}

export interface GlobalEdgeOptions {
  type: 'default' | 'step' | 'smoothstep' | 'bezier' | 'straight';
  animated: boolean;
  strokeWidth: number; // 1-5
  color?: string; // Optional override
}

export type FlowEdge = Edge<EdgeData>;

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
  nodes: FlowNode[];
  edges: FlowEdge[];
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