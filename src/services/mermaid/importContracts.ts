import type { ParseDiagnostic } from '@/lib/openFlowDSLParser';
import type { DiagramType } from '@/lib/types';
import { normalizeParseDiagnostics } from './diagnosticFormatting';

export type MermaidImportStatus =
  | 'editable_full'
  | 'editable_partial'
  | 'invalid_source'
  | 'unsupported_family'
  | 'unsupported_construct';

export interface MermaidImportDiagnostic extends ParseDiagnostic {
  code: string;
  severity: 'info' | 'warning' | 'error';
  family?: DiagramType;
  officialMermaidAccepted?: boolean;
  editableImpact?: 'none' | 'partial' | 'blocked';
}

function inferDiagnosticCode(message: string): MermaidImportDiagnostic['code'] {
  const normalized = message.toLowerCase();

  if (normalized.includes('duplicate')) return 'MERMAID_IDENTITY';
  if (normalized.includes('recovered implicit')) return 'MERMAID_RECOVERY';
  if (
    normalized.includes('invalid')
    || normalized.includes('malformed')
    || normalized.includes('unclosed')
    || normalized.includes('unrecognized')
    || normalized.includes('indentation jump')
    || normalized.includes('odd indentation')
  ) {
    return 'MERMAID_SYNTAX';
  }

  return 'MERMAID_GENERAL';
}

function inferSeverity(
  message: string,
  parseBlocked: boolean
): MermaidImportDiagnostic['severity'] {
  const normalized = message.toLowerCase();

  if (parseBlocked) return 'error';
  if (normalized.includes('recovered implicit')) return 'warning';
  if (normalized.includes('duplicate')) return 'warning';
  if (normalized.includes('invalid') || normalized.includes('malformed')) return 'warning';
  if (normalized.includes('unrecognized') || normalized.includes('unclosed')) return 'warning';
  return 'info';
}

function inferEditableImpact(
  message: string,
  parseBlocked: boolean
): MermaidImportDiagnostic['editableImpact'] {
  if (parseBlocked) return 'blocked';

  const normalized = message.toLowerCase();
  if (
    normalized.includes('invalid')
    || normalized.includes('malformed')
    || normalized.includes('unrecognized')
    || normalized.includes('unclosed')
    || normalized.includes('recovered implicit')
    || normalized.includes('duplicate')
    || normalized.includes('indentation jump')
    || normalized.includes('odd indentation')
  ) {
    return 'partial';
  }

  return 'none';
}

export function normalizeMermaidImportDiagnostics(params: {
  diagnostics: unknown;
  family?: DiagramType;
  parseBlocked?: boolean;
  officialMermaidAccepted?: boolean;
}): MermaidImportDiagnostic[] {
  const normalized = normalizeParseDiagnostics(params.diagnostics);

  return normalized.map((diagnostic) => ({
    ...diagnostic,
    code: inferDiagnosticCode(diagnostic.message),
    severity: inferSeverity(diagnostic.message, Boolean(params.parseBlocked)),
    family: params.family,
    officialMermaidAccepted: params.officialMermaidAccepted,
    editableImpact: inferEditableImpact(diagnostic.message, Boolean(params.parseBlocked)),
  }));
}

export function determineMermaidImportStatus(params: {
  hasHeader: boolean;
  isSupportedFamily: boolean;
  error?: string;
  structuredDiagnostics?: MermaidImportDiagnostic[];
}): MermaidImportStatus {
  if (!params.hasHeader) return 'invalid_source';
  if (!params.isSupportedFamily) return 'unsupported_family';
  if (params.error) return 'unsupported_construct';

  const hasDegradingDiagnostics = (params.structuredDiagnostics ?? []).some(
    (diagnostic) => diagnostic.editableImpact === 'partial' || diagnostic.severity === 'warning'
  );

  return hasDegradingDiagnostics ? 'editable_partial' : 'editable_full';
}
