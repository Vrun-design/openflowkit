import React, { lazy, Suspense } from 'react';
import { SidebarBody, SidebarHeader, SidebarShell } from './SidebarShell';

const LazyLintRulesPanel = lazy(async () => {
  const module = await import('./architecture-lint/LintRulesPanel');
  return { default: module.LintRulesPanel };
});

interface ArchitectureRulesPanelProps {
  onClose: () => void;
}

export function ArchitectureRulesPanel({
  onClose,
}: ArchitectureRulesPanelProps): React.ReactElement {
  return (
    <SidebarShell>
      <SidebarHeader title="Architecture Rules" onClose={onClose} />
      <SidebarBody scrollable={false} className="px-0 py-0">
        <Suspense fallback={null}>
          <LazyLintRulesPanel />
        </Suspense>
      </SidebarBody>
    </SidebarShell>
  );
}
