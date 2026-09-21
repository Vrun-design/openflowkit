import type { ParseDiagnostic } from './importContracts';

export interface StrictModeGuidanceItem {
  key: string;
  defaultText: string;
}

function addUnique(items: StrictModeGuidanceItem[], nextItem: StrictModeGuidanceItem): void {
  if (!items.some((item) => item.key === nextItem.key)) {
    items.push(nextItem);
  }
}

export function buildArchitectureStrictModeGuidance(diagnostics: ParseDiagnostic[]): StrictModeGuidanceItem[] {
  const guidance: StrictModeGuidanceItem[] = [];

  diagnostics.forEach((diagnostic) => {
    const message = diagnostic.message || '';
    if (message.includes('Recovered implicit service node')) {
      addUnique(guidance, {
        key: 'commandBar.code.strictModeGuidance.defineEndpoints',
        defaultText: 'Define every edge endpoint as an explicit architecture node before connecting edges.',
      });
    }
    if (message.includes('Duplicate architecture node id')) {
      addUnique(guidance, {
        key: 'commandBar.code.strictModeGuidance.uniqueIds',
        defaultText: 'Use unique ids for each service/group/junction node (no duplicate architecture ids).',
      });
    }
    if (message.includes('Invalid architecture edge syntax')) {
      addUnique(guidance, {
        key: 'commandBar.code.strictModeGuidance.edgeSyntax',
        defaultText: 'Use architecture edge arrows `-->`, `<--`, or `<-->` and side qualifiers like `api:R --> L:db`.',
      });
    }
    if (message.includes('Invalid architecture node syntax')) {
      addUnique(guidance, {
        key: 'commandBar.code.strictModeGuidance.nodeSyntax',
        defaultText: 'Use valid node declarations: `service id(icon)[Label]`, `group id[Label]`, `junction id[Label]`.',
      });
    }
  });

  if (guidance.length === 0) {
    guidance.push({
      key: 'commandBar.code.strictModeGuidance.fallback',
      defaultText: 'Switch off Architecture Strict Mode to allow auto-recovery, or fix diagnostics and retry.',
    });
  }

  return guidance;
}
