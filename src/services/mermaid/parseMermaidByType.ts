import type { DiagramType } from '@/lib/types';
import type { ParseResult } from '@/lib/mermaidParser';
import { getDiagramPlugin } from '@/diagram-types/core';
import { initializeDiagramTypeRuntime } from '@/diagram-types/bootstrap';
import {
  determineMermaidImportStatus,
  normalizeMermaidImportDiagnostics,
  type MermaidImportDiagnostic,
  type MermaidImportStatus,
} from './importContracts';
import { detectMermaidDiagramType, extractMermaidDiagramHeader } from './detectDiagramType';
import { detectMermaidWithOfficialParser } from './officialMermaidValidation';

export interface MermaidDispatchParseResult extends ParseResult {
  diagramType?: DiagramType;
  diagnostics?: string[];
  structuredDiagnostics?: MermaidImportDiagnostic[];
  importState?: MermaidImportStatus;
  originalSource?: string;
}

export interface ParseMermaidByTypeOptions {
  architectureStrictMode?: boolean;
}

const SUPPORTED_MERMAID_FAMILIES: DiagramType[] = [
  'flowchart',
  'stateDiagram',
  'classDiagram',
  'erDiagram',
  'mindmap',
  'journey',
  'architecture',
  'sequence',
];

function getUnsupportedTypeError(diagramType: DiagramType): string {
  return `Mermaid "${diagramType}" is not supported yet in editable mode. Supported families: flowchart, stateDiagram, classDiagram, erDiagram, mindmap, journey, architecture, sequence.`;
}

function getUnsupportedHeaderError(rawType: string): string {
  return `Mermaid "${rawType}" is not supported yet in editable mode. Supported families: flowchart, stateDiagram, classDiagram, erDiagram, mindmap, journey, architecture, sequence.`;
}

function finalizeResult(
  input: string,
  result: MermaidDispatchParseResult,
  params: {
    hasHeader: boolean;
    isSupportedFamily: boolean;
    family?: DiagramType;
    officialMermaidAccepted?: boolean;
  }
): MermaidDispatchParseResult {
  const structuredDiagnostics = normalizeMermaidImportDiagnostics({
    diagnostics: result.structuredDiagnostics ?? result.diagnostics,
    family: params.family,
    parseBlocked: Boolean(result.error),
    officialMermaidAccepted: params.officialMermaidAccepted,
  });

  return {
    ...result,
    structuredDiagnostics,
    importState:
      result.importState
      ?? determineMermaidImportStatus({
        hasHeader: params.hasHeader,
        isSupportedFamily: params.isSupportedFamily,
        error: result.error,
        structuredDiagnostics,
      }),
    originalSource: input,
  };
}

function applyArchitectureStrictMode(
  result: MermaidDispatchParseResult
): MermaidDispatchParseResult {
  const diagnostics = Array.isArray(result.diagnostics) ? result.diagnostics : [];
  const strictViolations = diagnostics.filter(
    (message) =>
      message.startsWith('Invalid architecture ') ||
      message.startsWith('Duplicate architecture node id') ||
      message.startsWith('Recovered implicit service node')
  );

  if (strictViolations.length === 0) {
    return result;
  }

  return {
    ...result,
    nodes: [],
    edges: [],
    error: `Architecture strict mode rejected ${strictViolations.length} validation issue(s).`,
  };
}

export function parseMermaidByType(
  input: string,
  options: ParseMermaidByTypeOptions = {}
): MermaidDispatchParseResult {
  initializeDiagramTypeRuntime();

  const oracleValidation = detectMermaidWithOfficialParser(input);
  const header = extractMermaidDiagramHeader(input);
  const detectedType = oracleValidation.detectedType ?? detectMermaidDiagramType(input);

  if (!detectedType) {
    if (header.rawType) {
      return finalizeResult(
        input,
        {
          nodes: [],
          edges: [],
          error: getUnsupportedHeaderError(header.rawType),
        },
        {
          hasHeader: true,
          isSupportedFamily: false,
          officialMermaidAccepted: oracleValidation.isValid,
        }
      );
    }

    return {
      nodes: [],
      edges: [],
      error:
        'Missing chart type declaration. Start with "flowchart TD", "stateDiagram-v2", or another Mermaid diagram type header.',
      importState: 'invalid_source',
      originalSource: input,
    };
  }

  if (!SUPPORTED_MERMAID_FAMILIES.includes(detectedType)) {
    return finalizeResult(
      input,
      {
        nodes: [],
        edges: [],
        diagramType: detectedType,
        error: getUnsupportedTypeError(detectedType),
      },
      {
        hasHeader: true,
        isSupportedFamily: false,
        family: detectedType,
        officialMermaidAccepted: oracleValidation.isValid,
      }
    );
  }

  const plugin = getDiagramPlugin(detectedType);
  if (plugin) {
    const parsed = finalizeResult(
      input,
      {
        ...plugin.parseMermaid(input),
        diagramType: detectedType,
      },
      {
        hasHeader: true,
        isSupportedFamily: true,
        family: detectedType,
        officialMermaidAccepted: oracleValidation.isValid,
      }
    );
    if (detectedType === 'architecture' && options.architectureStrictMode) {
      return finalizeResult(
        input,
        applyArchitectureStrictMode(parsed),
        {
          hasHeader: true,
          isSupportedFamily: true,
          family: detectedType,
          officialMermaidAccepted: oracleValidation.isValid,
        }
      );
    }
    return parsed;
  }

  return finalizeResult(
    input,
    {
      nodes: [],
      edges: [],
      diagramType: detectedType,
      error: `Mermaid "${detectedType}" plugin is not registered.`,
    },
    {
      hasHeader: true,
      isSupportedFamily: true,
      family: detectedType,
      officialMermaidAccepted: oracleValidation.isValid,
    }
  );
}
