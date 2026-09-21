import type { DiagramType } from '@/lib/types';
import type { ParseResult } from '@/lib/mermaidParser';
import { ARCHITECTURE_PLUGIN } from './families/architecture';
import { CLASS_DIAGRAM_PLUGIN } from './families/classDiagram';
import { ER_DIAGRAM_PLUGIN } from './families/erDiagram';
import { FLOWCHART_PLUGIN } from './families/flowchart';
import { JOURNEY_PLUGIN } from './families/journey';
import { MINDMAP_PLUGIN } from './families/mindmap';
import type { DiagramPlugin } from './families/plugin';
import { SEQUENCE_PLUGIN } from './families/sequence';
import { STATE_DIAGRAM_PLUGIN } from './families/stateDiagram';
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

const MERMAID_FAMILY_PLUGINS: DiagramPlugin[] = [
  FLOWCHART_PLUGIN,
  STATE_DIAGRAM_PLUGIN,
  CLASS_DIAGRAM_PLUGIN,
  ER_DIAGRAM_PLUGIN,
  MINDMAP_PLUGIN,
  JOURNEY_PLUGIN,
  ARCHITECTURE_PLUGIN,
  SEQUENCE_PLUGIN,
];

const SUPPORTED_MERMAID_FAMILIES: DiagramType[] = MERMAID_FAMILY_PLUGINS.map((plugin) => plugin.id);

const SUPPORTED_MERMAID_FAMILY_LIST = SUPPORTED_MERMAID_FAMILIES.join(', ');

function getUnsupportedEditableModeError(typeLabel: string): string {
  return `Mermaid "${typeLabel}" is not supported yet in editable mode. Supported families: ${SUPPORTED_MERMAID_FAMILY_LIST}.`;
}

function getUnsupportedTypeError(diagramType: DiagramType): string {
  return getUnsupportedEditableModeError(diagramType);
}

function getUnsupportedHeaderError(rawType: string): string {
  return getUnsupportedEditableModeError(rawType);
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
  const diagnosticInput =
    result.structuredDiagnostics
    ?? result.diagnostics
    ?? (result.error ? [result.error] : []);
  const structuredDiagnostics = normalizeMermaidImportDiagnostics({
    diagnostics: diagnosticInput,
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

    return finalizeResult(
      input,
      {
        nodes: [],
        edges: [],
        error:
          'Missing chart type declaration. Start with "flowchart TD", "stateDiagram-v2", or another Mermaid diagram type header.',
        importState: 'invalid_source',
      },
      {
        hasHeader: false,
        isSupportedFamily: false,
        officialMermaidAccepted: oracleValidation.isValid,
      }
    );
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

  const plugin = MERMAID_FAMILY_PLUGINS.find((candidate) => candidate.id === detectedType);
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
