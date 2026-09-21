import type { MermaidImportStatus } from './importContracts';
import type { MermaidDiagnosticsSnapshot } from './diagnosticsSnapshot';

export function isMermaidLayoutRecoveryRecommended(
  layoutMode: MermaidDiagnosticsSnapshot['layoutMode'] | undefined
): boolean {
  return (
    layoutMode === 'mermaid_preserved_partial'
    || layoutMode === 'mermaid_partial'
    || layoutMode === 'elk_fallback'
  );
}

export function canRecoverMermaidSource(params: {
  originalSource?: string;
  importState?: MermaidImportStatus;
  layoutMode?: MermaidDiagnosticsSnapshot['layoutMode'];
}): boolean {
  return Boolean(
    params.originalSource
    && (
      params.importState !== 'editable_full'
      || isMermaidLayoutRecoveryRecommended(params.layoutMode)
    )
  );
}
