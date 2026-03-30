import { ROLLOUT_FLAGS } from '@/config/rolloutFlags';
import { isDiagramType, type DiagramType, type FlowEdge, type FlowNode, type PlaybackState } from '@/lib/types';
import { diagramDocumentEnvelopeSchema } from './diagramDocumentSchemas';
import { sanitizePlaybackState } from './playback/model';

export const DIAGRAM_DOCUMENT_VERSION = '1.0';
export const EXTENDED_DIAGRAM_DOCUMENT_VERSION = '1.1';
const DIAGRAM_DOCUMENT_NAME = 'OpenFlowKit Diagram';
export const DEFAULT_DIAGRAM_TYPE: DiagramType = 'flowchart';

export interface DiagramDocumentV1 {
  version: string;
  name: string;
  createdAt: string;
  diagramType: DiagramType;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export type DiagramDocumentCapabilityKey =
  | 'animationTimeline'
  | 'playbackStudio'
  | 'animatedExport'
  | 'importAdapters'
  | 'terraformImport'
  | 'openApiImport'
  | 'liveBindings';

export type DiagramDocumentCapabilities = Partial<Record<DiagramDocumentCapabilityKey, boolean>>;

export interface DiagramDocumentScene {
  id: string;
  name: string;
  stepIds: string[];
}

export interface DiagramDocumentTimelineStep {
  id: string;
  nodeId: string;
  durationMs?: number;
}

export interface DiagramDocumentExportPreset {
  id: string;
  name: string;
  format: string;
}

export interface DiagramDocumentBinding {
  id: string;
  targetId: string;
  type: string;
}

export interface DiagramDocumentV1_1 extends DiagramDocumentV1 {
  version: typeof EXTENDED_DIAGRAM_DOCUMENT_VERSION;
  documentCapabilities?: DiagramDocumentCapabilities;
  scenes?: DiagramDocumentScene[];
  timeline?: DiagramDocumentTimelineStep[];
  exportPresets?: DiagramDocumentExportPreset[];
  bindings?: DiagramDocumentBinding[];
  playback?: PlaybackState;
}

export type DiagramDocument = DiagramDocumentV1 | DiagramDocumentV1_1;

export interface ImportCompatibilityResult {
  diagramType: DiagramType;
  nodes: FlowNode[];
  edges: FlowEdge[];
  warnings: string[];
  documentCapabilities?: DiagramDocumentCapabilities;
  scenes?: DiagramDocumentScene[];
  timeline?: DiagramDocumentTimelineStep[];
  exportPresets?: DiagramDocumentExportPreset[];
  bindings?: DiagramDocumentBinding[];
  playback?: PlaybackState;
}

export interface CreateDiagramDocumentOptions {
  extendedDocumentModel?: boolean;
  documentCapabilities?: DiagramDocumentCapabilities;
  scenes?: DiagramDocumentScene[];
  timeline?: DiagramDocumentTimelineStep[];
  exportPresets?: DiagramDocumentExportPreset[];
  bindings?: DiagramDocumentBinding[];
  playback?: PlaybackState;
}

export interface ParseDiagramDocumentOptions {
  extendedDocumentModel?: boolean;
}

function getVersionParts(version: string): { major: number | null; minor: number | null } {
  const [majorRaw, minorRaw] = version.split('.', 2);
  const major = Number(majorRaw);
  const minor = Number(minorRaw ?? '0');
  return {
    major: Number.isFinite(major) ? major : null,
    minor: Number.isFinite(minor) ? minor : null,
  };
}

export function createDiagramDocument(
  nodes: FlowNode[],
  edges: FlowEdge[],
  diagramType: DiagramType = DEFAULT_DIAGRAM_TYPE,
  options: CreateDiagramDocumentOptions = {}
): DiagramDocument {
  const extendedDocumentModel = options.extendedDocumentModel ?? ROLLOUT_FLAGS.documentModelV2;
  const baseDocument: DiagramDocumentV1 = {
    version: DIAGRAM_DOCUMENT_VERSION,
    name: DIAGRAM_DOCUMENT_NAME,
    createdAt: new Date().toISOString(),
    diagramType,
    nodes,
    edges,
  };

  if (!extendedDocumentModel) {
    return baseDocument;
  }

  return {
    ...baseDocument,
    version: EXTENDED_DIAGRAM_DOCUMENT_VERSION,
    documentCapabilities: options.documentCapabilities,
    scenes: options.playback?.scenes ?? options.scenes,
    timeline: options.playback?.timeline ?? options.timeline,
    exportPresets: options.exportPresets,
    bindings: options.bindings,
    playback: options.playback,
  };
}

export function parseDiagramDocumentImport(
  raw: unknown,
  options: ParseDiagramDocumentOptions = {}
): ImportCompatibilityResult {
  const parsedEnvelope = diagramDocumentEnvelopeSchema.safeParse(raw);
  if (!parsedEnvelope.success) {
    throw new Error('Invalid flow file: missing nodes or edges arrays.');
  }

  const candidate = parsedEnvelope.data as Record<string, unknown>;
  const warnings: string[] = [];
  const versionRaw = typeof candidate.version === 'string' ? candidate.version : null;
  const diagramType = isDiagramType(candidate.diagramType) ? candidate.diagramType : DEFAULT_DIAGRAM_TYPE;
  const { major } = getVersionParts(versionRaw ?? DIAGRAM_DOCUMENT_VERSION);
  const extendedDocumentModel = options.extendedDocumentModel ?? ROLLOUT_FLAGS.documentModelV2;

  if (versionRaw === null) {
    warnings.push('Imported legacy JSON without version metadata; loaded with compatibility mode.');
  } else if (major !== null && major > 1) {
    throw new Error(
      `Unsupported flow file version "${versionRaw}". This app supports version ${DIAGRAM_DOCUMENT_VERSION}.x.`
    );
  }

  const hasExtendedFields = [
    candidate.documentCapabilities,
    candidate.scenes,
    candidate.timeline,
    candidate.exportPresets,
    candidate.bindings,
    candidate.playback,
  ].some((value) => value !== undefined);

  const playback = extendedDocumentModel
    ? sanitizePlaybackState(
      candidate.playback ?? {
        scenes: candidate.scenes,
        timeline: candidate.timeline,
      }
    )
    : undefined;

  if (hasExtendedFields && !extendedDocumentModel) {
    warnings.push('Imported document metadata was preserved only at the core graph level because extended document support is disabled.');
  }

  return {
    diagramType,
    nodes: candidate.nodes as FlowNode[],
    edges: candidate.edges as FlowEdge[],
    warnings,
    documentCapabilities: extendedDocumentModel && candidate.documentCapabilities && typeof candidate.documentCapabilities === 'object'
      ? candidate.documentCapabilities as DiagramDocumentCapabilities
      : undefined,
    scenes: playback?.scenes
      ?? (extendedDocumentModel && Array.isArray(candidate.scenes)
        ? candidate.scenes as DiagramDocumentScene[]
        : undefined),
    timeline: playback?.timeline
      ?? (extendedDocumentModel && Array.isArray(candidate.timeline)
        ? candidate.timeline as DiagramDocumentTimelineStep[]
        : undefined),
    exportPresets: extendedDocumentModel && Array.isArray(candidate.exportPresets)
      ? candidate.exportPresets as DiagramDocumentExportPreset[]
      : undefined,
    bindings: extendedDocumentModel && Array.isArray(candidate.bindings)
      ? candidate.bindings as DiagramDocumentBinding[]
      : undefined,
    playback,
  };
}
