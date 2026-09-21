import { createId } from '@/lib/id';
import type {
  FlowEdge,
  FlowNode,
  MermaidImportMode,
  MermaidVisualMode,
} from '@/lib/types';
import { assignSmartHandles } from '@/services/smartEdgeRouting';
import {
  composeDiagramForDisplay,
  sortParentsBeforeChildren,
  type LayoutResult,
} from '@/services/composeDiagramForDisplay';
import type { LayoutOptions } from '@/services/elk-layout/types';
import type { MermaidDispatchParseResult } from './parseMermaidByType';
import { ensureMermaidMeasurementSupport } from './ensureMermaidMeasurementSupport';

interface MermaidRenderRuntime {
  initialize: (config: {
    startOnLoad: boolean;
    securityLevel: 'loose';
    suppressErrorRendering: boolean;
    theme: string;
    htmlLabels?: boolean;
    flowchart?: {
      defaultRenderer?: 'dagre-d3' | 'dagre-wrapper' | 'elk';
      htmlLabels?: boolean;
      useMaxWidth?: boolean;
    };
  }) => void;
  render: (id: string, text: string, svgContainingElement?: Element) => Promise<{ svg: string }>;
}

export interface MermaidCanvasImportResult {
  nodes: FlowNode[];
  edges: FlowEdge[];
  layoutMode?: LayoutResult['layoutMode'];
  layoutFallbackReason?: string;
  visualMode: MermaidVisualMode;
  svgExtracted?: boolean;
  importMode: MermaidImportMode;
}

export function resolveEffectiveMermaidImportMode(
  requestedMode: MermaidImportMode,
  diagramType?: string
): MermaidImportMode {
  if (diagramType === 'flowchart') {
    return 'native_editable';
  }

  return requestedMode;
}

interface ImportMermaidToCanvasParams {
  parsed: MermaidDispatchParseResult;
  source: string;
  importMode: MermaidImportMode;
  layout: {
    direction: NonNullable<LayoutOptions['direction']>;
    spacing: NonNullable<LayoutOptions['spacing']>;
    contentDensity: NonNullable<LayoutOptions['contentDensity']>;
  };
}

let runtimePromise: Promise<MermaidRenderRuntime | null> | null = null;
let renderCounter = 0;

const MERMAID_RENDERER_FIRST_CONFIG = {
  startOnLoad: false,
  securityLevel: 'loose' as const,
  suppressErrorRendering: true,
  theme: 'default',
  htmlLabels: false,
  flowchart: {
    defaultRenderer: 'dagre-wrapper' as const,
    htmlLabels: false,
    useMaxWidth: false,
  },
};

function canRenderMermaidSvg(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

async function getMermaidRenderRuntime(): Promise<MermaidRenderRuntime | null> {
  if (!canRenderMermaidSvg()) {
    return null;
  }

  if (!runtimePromise) {
    runtimePromise = import('mermaid')
      .then((module) => {
        return module.default as MermaidRenderRuntime;
      })
      .catch(() => null);
  }

  const runtime = await runtimePromise;
  if (runtime) {
    runtime.initialize(MERMAID_RENDERER_FIRST_CONFIG);
  }

  return runtime;
}

function parseNumericDimension(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function extractSvgDimensions(svgMarkup: string): {
  viewBox?: string;
  width: number;
  height: number;
} {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgMarkup, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) {
    return { width: 640, height: 480 };
  }

  const viewBox = svg.getAttribute('viewBox') ?? undefined;
  const widthAttr = parseNumericDimension(svg.getAttribute('width'));
  const heightAttr = parseNumericDimension(svg.getAttribute('height'));

  if (viewBox) {
    const parts = viewBox
      .trim()
      .split(/[,\s]+/)
      .map((value) => Number.parseFloat(value));
    if (parts.length === 4 && parts.every((value) => Number.isFinite(value))) {
      return {
        viewBox,
        width: widthAttr ?? Math.max(parts[2], 1),
        height: heightAttr ?? Math.max(parts[3], 1),
      };
    }
  }

  return {
    viewBox,
    width: widthAttr ?? 640,
    height: heightAttr ?? 480,
  };
}

async function renderMermaidSvgNode(
  source: string,
  diagramType?: string
): Promise<FlowNode> {
  ensureMermaidMeasurementSupport();
  const mermaid = await getMermaidRenderRuntime();
  if (!mermaid) {
    throw new Error('Mermaid renderer is unavailable for fidelity-first import.');
  }

  const containerId = `mermaid-renderer-artifact-${++renderCounter}`;
  const container = document.createElement('div');
  container.id = containerId;
  container.style.cssText =
    'position:absolute;top:-9999px;left:-9999px;opacity:0;pointer-events:none;';
  document.body.appendChild(container);

  try {
    const { svg } = await mermaid.render(containerId, source, container);
    if (!svg) {
      throw new Error('Mermaid render returned empty SVG output.');
    }

    const { viewBox, width, height } = extractSvgDimensions(svg);

    return {
      id: createId('mermaid-svg'),
      position: { x: 40, y: 40 },
      type: 'mermaid_svg',
      data: {
        label: diagramType ? `Mermaid ${diagramType}` : 'Mermaid diagram',
        mermaidSource: source,
        mermaidSvg: svg,
        mermaidViewBox: viewBox,
        mermaidImportMode: 'renderer_first',
        mermaidRendererTheme: 'default',
        transparency: 1,
        rotation: 0,
      },
      draggable: true,
      selectable: true,
      connectable: false,
      style: { width, height },
    };
  } finally {
    container.remove();
  }
}

function layoutModeToVisualMode(
  layoutMode: LayoutResult['layoutMode'] | undefined
): MermaidVisualMode {
  if (layoutMode === 'mermaid_exact') {
    return 'editable_exact';
  }
  if (layoutMode === 'mermaid_preserved_partial' || layoutMode === 'mermaid_partial') {
    return 'editable_partial';
  }
  return 'editable_fallback';
}

async function importEditableGraph({
  parsed,
  source,
  layout,
}: Pick<ImportMermaidToCanvasParams, 'parsed' | 'source' | 'layout'>): Promise<MermaidCanvasImportResult> {
  const { clearLayoutCache } = await import('@/services/elkLayout');
  clearLayoutCache();

  const layoutResult = await composeDiagramForDisplay(parsed.nodes, parsed.edges, {
    direction: layout.direction,
    spacing: layout.spacing,
    contentDensity: layout.contentDensity,
    diagramType: parsed.diagramType,
    source: 'import',
    mermaidSource: source,
  });
  const sortedNodes = sortParentsBeforeChildren(layoutResult.nodes);
  const smartEdges = assignSmartHandles(sortedNodes, layoutResult.edges);

  return {
    nodes: sortedNodes,
    edges: smartEdges,
    layoutMode: layoutResult.layoutMode,
    layoutFallbackReason: layoutResult.layoutFallbackReason,
    visualMode: layoutModeToVisualMode(layoutResult.layoutMode),
    svgExtracted: layoutResult.svgExtracted,
    importMode: 'native_editable',
  };
}

export async function importMermaidToCanvas(
  params: ImportMermaidToCanvasParams
): Promise<MermaidCanvasImportResult> {
  const effectiveImportMode = resolveEffectiveMermaidImportMode(
    params.importMode,
    params.parsed.diagramType
  );

  if (effectiveImportMode === 'renderer_first') {
    try {
      const node = await renderMermaidSvgNode(params.source, params.parsed.diagramType);
      return {
        nodes: [node],
        edges: [],
        visualMode: 'renderer_exact',
        svgExtracted: true,
        importMode: 'renderer_first',
      };
    } catch (error) {
      const rendererFailureReason = error instanceof Error ? error.message : String(error);
      const fallback = await importEditableGraph(params);
      return {
        ...fallback,
        importMode: 'native_editable',
        layoutFallbackReason: fallback.layoutFallbackReason
          ? `Renderer-first Mermaid SVG import failed: ${rendererFailureReason}. ${fallback.layoutFallbackReason}`
          : `Renderer-first Mermaid SVG import failed: ${rendererFailureReason}.`,
      };
    }
  }

  try {
    const editableImport = await importEditableGraph(params);
    if (params.parsed.diagramType !== 'flowchart' || editableImport.layoutMode !== 'elk_fallback') {
      return editableImport;
    }

    const recoveryNode = await renderMermaidSvgNode(params.source, params.parsed.diagramType);
    return {
      nodes: [recoveryNode],
      edges: [],
      visualMode: 'renderer_exact',
      svgExtracted: true,
      importMode: 'renderer_first',
      layoutMode: editableImport.layoutMode,
      layoutFallbackReason: editableImport.layoutFallbackReason
        ? `Editable Mermaid reconstruction failed; showing exact Mermaid SVG instead. ${editableImport.layoutFallbackReason}`
        : 'Editable Mermaid reconstruction failed; showing exact Mermaid SVG instead.',
    };
  } catch (error) {
    if (params.parsed.diagramType === 'flowchart') {
      const rendererFailureReason = error instanceof Error ? error.message : String(error);
      const node = await renderMermaidSvgNode(params.source, params.parsed.diagramType);
      return {
        nodes: [node],
        edges: [],
        visualMode: 'renderer_exact',
        svgExtracted: true,
        importMode: 'renderer_first',
        layoutFallbackReason: `Editable Mermaid reconstruction failed; showing exact Mermaid SVG instead. ${rendererFailureReason}`,
      };
    }

    throw error;
  }
}
