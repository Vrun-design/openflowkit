import type { ParseDiagnostic } from '@/lib/openFlowDSLParser';
import type {
    MermaidImportDiagnostic,
    MermaidImportStatus,
} from '@/services/mermaid/importContracts';
import {
    getMermaidImportStateDetail,
    getMermaidImportStateGuidance,
    getMermaidImportStateLabel,
} from '@/services/mermaid/importStatePresentation';
import { writeLocalStorageJson } from '@/services/storage/uiLocalStorage';

export type ImportSource = 'json' | 'mermaid' | 'openflowdsl' | 'drawio' | 'visio';
export type ImportSeverity = 'info' | 'warning' | 'error';

export interface ImportIssue {
    code: string;
    severity: ImportSeverity;
    message: string;
    line?: number;
    snippet?: string;
    hint?: string;
}

export interface ImportFidelityReport {
    id: string;
    source: ImportSource;
    importState?: MermaidImportStatus;
    originalSource?: string;
    timestamp: string;
    status: 'success' | 'success_with_warnings' | 'failed';
    nodeCount: number;
    edgeCount: number;
    elapsedMs: number;
    issues: ImportIssue[];
    summary: {
        warningCount: number;
        errorCount: number;
    };
}

const IMPORT_REPORT_STORAGE_KEY = 'openflowkit-import-report-latest';

function createReportId(): string {
    return `import-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export function mapWarningToIssue(warning: string): ImportIssue {
    if (warning.toLowerCase().includes('legacy json')) {
        return { code: 'DOC-001', severity: 'warning', message: warning };
    }
    return { code: 'FMT-001', severity: 'warning', message: warning };
}

export function mapErrorToIssue(error: string): ImportIssue {
    if (error.toLowerCase().includes('unsupported')) {
        return { code: 'UNSUP-001', severity: 'error', message: error };
    }
    if (error.toLowerCase().includes('missing nodes or edges')) {
        return { code: 'FMT-001', severity: 'error', message: error };
    }
    return { code: 'DOC-001', severity: 'error', message: error };
}

export function mapParserDiagnosticToIssue(diagnostic: ParseDiagnostic): ImportIssue {
    const msg = diagnostic.message.toLowerCase();
    let code = 'FMT-001';
    if (msg.includes('no nodes found')) {
        code = 'DOC-001';
    } else if (msg.includes('unrecognized')) {
        code = 'FMT-001';
    } else if (msg.includes('unexpected')) {
        code = 'FMT-001';
    }

    return {
        code,
        severity: 'error',
        message: diagnostic.message,
        line: diagnostic.line,
        snippet: diagnostic.snippet,
        hint: diagnostic.hint,
    };
}

export function mapMermaidDiagnosticToIssue(diagnostic: MermaidImportDiagnostic): ImportIssue {
    return {
        code: diagnostic.code,
        severity: diagnostic.severity,
        message: diagnostic.message,
        line: diagnostic.line,
        snippet: diagnostic.snippet,
        hint: diagnostic.hint,
    };
}

export function buildImportFidelityReport(params: {
    source: ImportSource;
    importState?: MermaidImportStatus;
    originalSource?: string;
    nodeCount: number;
    edgeCount: number;
    elapsedMs: number;
    issues: ImportIssue[];
}): ImportFidelityReport {
    const warningCount = params.issues.filter((issue) => issue.severity === 'warning').length;
    const errorCount = params.issues.filter((issue) => issue.severity === 'error').length;
    const status = errorCount > 0 ? 'failed' : (warningCount > 0 ? 'success_with_warnings' : 'success');

    return {
        id: createReportId(),
        source: params.source,
        importState: params.importState,
        originalSource: params.originalSource,
        timestamp: new Date().toISOString(),
        status,
        nodeCount: params.nodeCount,
        edgeCount: params.edgeCount,
        elapsedMs: params.elapsedMs,
        issues: params.issues,
        summary: {
            warningCount,
            errorCount,
        },
    };
}

export function persistLatestImportReport(report: ImportFidelityReport): void {
    writeLocalStorageJson(IMPORT_REPORT_STORAGE_KEY, report);
}

export function summarizeImportReport(report: ImportFidelityReport): string {
    const { warningCount, errorCount } = report.summary;
    if (report.source === 'mermaid') {
        const label = getMermaidImportStateLabel(report.importState);
        const detail = getMermaidImportStateDetail({
            importState: report.importState,
            nodeCount: report.nodeCount,
            edgeCount: report.edgeCount,
        });
        return `MERMAID import: ${label} (${detail}, ${warningCount} warnings, ${errorCount} errors)`;
    }

    return `${report.source.toUpperCase()} import: ${report.status} (${report.nodeCount} nodes, ${report.edgeCount} edges, ${warningCount} warnings, ${errorCount} errors)`;
}

export function getImportRecoveryGuidance(report: ImportFidelityReport): string {
    if (report.source === 'mermaid') {
        return (
            getMermaidImportStateGuidance(report.importState)
            ?? 'Review the Mermaid diagnostics, then retry with simplified or corrected Mermaid code.'
        );
    }

    return 'If this file came from another tool, try exporting a plain JSON/OpenFlowKit file again or remove unsupported metadata before retrying.';
}
