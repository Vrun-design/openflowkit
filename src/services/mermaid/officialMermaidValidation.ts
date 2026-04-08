import type { ParseDiagnostic } from '@/lib/openFlowDSLParser';
import type { DiagramType } from '@/lib/types';
import type { MermaidImportDiagnostic } from './importContracts';
import { extractMermaidDiagramHeader } from './detectDiagramType';

type ValidationMode = 'detection_only' | 'full';

export interface OfficialMermaidValidationResult {
  isAvailable: boolean;
  isValid: boolean;
  detectedType?: DiagramType;
  rawType?: string;
  diagnostics: MermaidImportDiagnostic[];
  validationMode: ValidationMode;
}

let initialized = false;
let mermaidRuntimePromise: Promise<OfficialMermaidRuntime | null> | null = null;

interface OfficialMermaidRuntime {
  initialize: (config: {
    startOnLoad: boolean;
    securityLevel: 'loose';
    suppressErrorRendering: boolean;
  }) => void;
  parse: (
    input: string,
    options: { suppressErrors: boolean }
  ) => Promise<unknown>;
}

function canLoadOfficialRuntime(): boolean {
  return !import.meta.env.PROD && typeof window !== 'undefined' && typeof document !== 'undefined';
}

function canRunFullOfficialValidation(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

async function getOfficialMermaidRuntime(): Promise<OfficialMermaidRuntime | null> {
  if (!canLoadOfficialRuntime()) {
    return null;
  }

  if (!mermaidRuntimePromise) {
    mermaidRuntimePromise = import('mermaid')
      .then((module) => {
        const runtime = module.default as OfficialMermaidRuntime;
        if (!initialized) {
          runtime.initialize({
            startOnLoad: false,
            securityLevel: 'loose',
            suppressErrorRendering: true,
          });
          initialized = true;
        }
        return runtime;
      })
      .catch(() => null);
  }

  return mermaidRuntimePromise;
}

function mapOfficialType(rawType: string | undefined): DiagramType | undefined {
  if (!rawType) return undefined;

  const normalized = rawType.trim();
  if (normalized === 'flowchart-v2' || normalized === 'flowchart' || normalized === 'graph') {
    return 'flowchart';
  }
  if (normalized === 'stateDiagram' || normalized === 'stateDiagram-v2') {
    return 'stateDiagram';
  }
  if (normalized === 'classDiagram' || normalized === 'class') return 'classDiagram';
  if (normalized === 'erDiagram' || normalized === 'er') return 'erDiagram';
  if (normalized === 'mindmap') return 'mindmap';
  if (normalized === 'journey') return 'journey';
  if (normalized === 'architecture' || normalized === 'architecture-beta') return 'architecture';
  if (normalized === 'sequenceDiagram' || normalized === 'sequence') return 'sequence';
  return undefined;
}

function toDiagnostic(
  message: string,
  mode: ValidationMode,
  severity: MermaidImportDiagnostic['severity'] = 'error'
): MermaidImportDiagnostic {
  return {
    code: mode === 'full' ? 'MERMAID_OFFICIAL_PARSE' : 'MERMAID_OFFICIAL_ENV',
    severity,
    message,
    officialMermaidAccepted: mode === 'full' ? false : undefined,
    editableImpact: severity === 'error' ? 'blocked' : 'none',
  };
}

function isEnvironmentLimitationError(message: string): boolean {
  return message.includes('DOMPurify') || message.includes('document is not defined');
}

export function isOfficialMermaidValidationBlocking(
  result: OfficialMermaidValidationResult
): boolean {
  return result.validationMode === 'full' && !result.isValid;
}

export function getOfficialMermaidDiagnostics(
  result: OfficialMermaidValidationResult
): ParseDiagnostic[] {
  return result.diagnostics.map((diagnostic) => ({
    message: diagnostic.message,
    line: diagnostic.line,
    snippet: diagnostic.snippet,
    hint: diagnostic.hint,
  }));
}

export function getOfficialMermaidErrorMessage(
  result: OfficialMermaidValidationResult
): string | undefined {
  return result.diagnostics[0]?.message;
}

export function detectMermaidWithOfficialParser(input: string): OfficialMermaidValidationResult {
  const header = extractMermaidDiagramHeader(input);
  return {
    isAvailable: true,
    isValid: Boolean(header.rawType),
    rawType: header.rawType,
    detectedType: header.diagramType ?? mapOfficialType(header.rawType),
    diagnostics: [],
    validationMode: 'detection_only',
  };
}

export async function validateMermaidWithOfficialParser(
  input: string
): Promise<OfficialMermaidValidationResult> {
  const detection = detectMermaidWithOfficialParser(input);

  if (!detection.rawType) {
    return {
      ...detection,
      isValid: false,
      validationMode: 'full',
      diagnostics: [toDiagnostic('Official Mermaid could not detect a diagram type.', 'full')],
    };
  }

  const mermaid = await getOfficialMermaidRuntime();
  if (!mermaid || !canRunFullOfficialValidation()) {
    return {
      ...detection,
      validationMode: 'detection_only',
      diagnostics: canLoadOfficialRuntime()
        ? [
            toDiagnostic(
              'Official Mermaid full validation requires a browser-like DOM runtime. Falling back to type detection only.',
              'detection_only',
              'warning'
            ),
          ]
        : [],
    };
  }

  try {
    const parsed = await mermaid.parse(input, { suppressErrors: false });
    return {
      ...detection,
      isValid: Boolean(parsed),
      validationMode: 'full',
      diagnostics: [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isEnvironmentLimitationError(message)) {
      return {
        ...detection,
        validationMode: 'detection_only',
        diagnostics: [
          toDiagnostic(
            `Official Mermaid validation fell back to type detection only in this environment: ${message}`,
            'detection_only',
            'warning'
          ),
        ],
      };
    }

    return {
      ...detection,
      isValid: false,
      validationMode: 'full',
      diagnostics: [toDiagnostic(message, 'full')],
    };
  }
}
