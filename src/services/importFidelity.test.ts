import { describe, expect, it } from 'vitest';
import {
    buildImportFidelityReport,
    getImportRecoveryGuidance,
    mapErrorToIssue,
    mapMermaidDiagnosticToIssue,
    mapParserDiagnosticToIssue,
    mapWarningToIssue,
    summarizeImportReport,
} from './importFidelity';

describe('importFidelity', () => {
    it('maps warning and error messages to taxonomy codes', () => {
        expect(mapWarningToIssue('Imported legacy JSON without version metadata; loaded with compatibility mode.').code).toBe('DOC-001');
        expect(mapErrorToIssue('Unsupported flow file version "2.0".').code).toBe('UNSUP-001');
        expect(mapErrorToIssue('Invalid flow file: missing nodes or edges arrays.').code).toBe('FMT-001');
    });

    it('maps parser diagnostics to structured issues', () => {
        const issue = mapParserDiagnosticToIssue({
            message: 'Unrecognized syntax near token',
            line: 4,
            snippet: 'bad token',
            hint: 'Fix syntax',
        });
        expect(issue.code).toBe('FMT-001');
        expect(issue.severity).toBe('error');
        expect(issue.line).toBe(4);
    });

    it('maps Mermaid structured diagnostics to fidelity issues', () => {
        const issue = mapMermaidDiagnosticToIssue({
            code: 'MERMAID_SYNTAX',
            severity: 'warning',
            message: 'Invalid class declaration',
            line: 6,
            editableImpact: 'partial',
        });

        expect(issue.code).toBe('MERMAID_SYNTAX');
        expect(issue.severity).toBe('warning');
        expect(issue.line).toBe(6);
    });

    it('builds and summarizes import report', () => {
        const report = buildImportFidelityReport({
            source: 'json',
            nodeCount: 3,
            edgeCount: 2,
            elapsedMs: 14,
            issues: [
                { code: 'DOC-001', severity: 'warning', message: 'legacy' },
            ],
        });
        expect(report.status).toBe('success_with_warnings');
        expect(report.summary.warningCount).toBe(1);
        expect(report.summary.errorCount).toBe(0);
        expect(summarizeImportReport(report)).toContain('JSON import');
    });

    it('includes Mermaid import state in summaries', () => {
        const report = buildImportFidelityReport({
            source: 'mermaid',
            importState: 'editable_partial',
            originalSource: 'flowchart TD\nA-->B',
            nodeCount: 2,
            edgeCount: 1,
            elapsedMs: 9,
            issues: [{ code: 'MERMAID_SYNTAX', severity: 'warning', message: 'diag' }],
        });

        expect(report.originalSource).toContain('flowchart TD');
        expect(summarizeImportReport(report)).toContain('Ready with warnings');
        expect(getImportRecoveryGuidance(report)).toContain('fully editable');
    });
});
