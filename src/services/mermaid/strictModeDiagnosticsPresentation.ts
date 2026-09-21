import type { ParseDiagnostic } from './importContracts';

export interface StrictModeDiagnosticGroup {
  id: 'syntax' | 'identity' | 'recovery' | 'general';
  titleKey: string;
  defaultTitle: string;
  diagnostics: ParseDiagnostic[];
}

function getDiagnosticGroupId(message: string): StrictModeDiagnosticGroup['id'] {
  if (message.includes('Invalid architecture edge syntax') || message.includes('Invalid architecture node syntax')) {
    return 'syntax';
  }
  if (message.includes('Duplicate architecture node id')) {
    return 'identity';
  }
  if (message.includes('Recovered implicit service node')) {
    return 'recovery';
  }
  return 'general';
}

const GROUP_META: Record<StrictModeDiagnosticGroup['id'], Pick<StrictModeDiagnosticGroup, 'titleKey' | 'defaultTitle'>> = {
  syntax: {
    titleKey: 'commandBar.code.diagnosticsGroup.syntax',
    defaultTitle: 'Syntax issues',
  },
  identity: {
    titleKey: 'commandBar.code.diagnosticsGroup.identity',
    defaultTitle: 'Identifier issues',
  },
  recovery: {
    titleKey: 'commandBar.code.diagnosticsGroup.recovery',
    defaultTitle: 'Recovery warnings',
  },
  general: {
    titleKey: 'commandBar.code.diagnosticsGroup.general',
    defaultTitle: 'Diagnostics',
  },
};

const GROUP_ORDER: StrictModeDiagnosticGroup['id'][] = ['syntax', 'identity', 'recovery', 'general'];

export function groupArchitectureStrictModeDiagnostics(
  diagnostics: ParseDiagnostic[]
): StrictModeDiagnosticGroup[] {
  const groups: StrictModeDiagnosticGroup[] = [];

  diagnostics.forEach((diagnostic) => {
    const groupId = getDiagnosticGroupId(diagnostic.message || '');
    const existingGroup = groups.find((group) => group.id === groupId);
    if (existingGroup) {
      existingGroup.diagnostics.push(diagnostic);
      return;
    }

    groups.push({
      id: groupId,
      titleKey: GROUP_META[groupId].titleKey,
      defaultTitle: GROUP_META[groupId].defaultTitle,
      diagnostics: [diagnostic],
    });
  });

  groups.sort((left, right) => GROUP_ORDER.indexOf(left.id) - GROUP_ORDER.indexOf(right.id));

  return groups;
}

export function getLineSelectionRange(source: string, lineNumber: number): { start: number; end: number } | null {
  if (!Number.isInteger(lineNumber) || lineNumber < 1) return null;

  const lines = source.split('\n');
  if (lineNumber > lines.length) return null;

  let start = 0;
  for (let index = 0; index < lineNumber - 1; index += 1) {
    start += lines[index].length + 1;
  }

  const end = start + lines[lineNumber - 1].length;
  return { start, end };
}
