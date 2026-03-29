import React, { useCallback, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Download,
  Globe,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import { useFlowStore } from '@/store';
import { useCanvasState } from '@/store/canvasHooks';
import { Button } from '@/components/ui/Button';
import { useArchitectureLint } from '@/context/ArchitectureLintContext';
import { parseRulesJson } from '@/services/architectureLint/ruleEngine';
import { loadWorkspaceRules, saveWorkspaceRules } from '@/services/architectureLint/workspaceRules';
import { SeverityIcon, RulesSection } from './RuleForm';
import { VisualEditor } from './VisualEditor';

type PanelView = 'overview' | 'diagram-rules' | 'workspace-rules';

export function LintRulesPanel(): React.ReactElement {
  const { viewSettings, setViewSettings } = useFlowStore();
  const { nodes } = useCanvasState();
  const { violations, parseError } = useArchitectureLint();
  const [view, setView] = useState<PanelView>('overview');
  const [showLibrary, setShowLibrary] = useState(false);

  const lintRules = viewSettings.lintRules;
  const hasRules = lintRules.trim().length > 0;
  const { rules: diagramRules } = parseRulesJson(lintRules);
  const workspaceRulesJson = loadWorkspaceRules();
  const hasWorkspaceRules = workspaceRulesJson.trim().length > 0;
  const { rules: workspaceRules } = parseRulesJson(workspaceRulesJson);

  const errorCount = violations.filter((v) => v.severity === 'error').length;
  const warningCount = violations.filter((v) => v.severity === 'warning').length;
  const handleDiagramRulesOpen = () => {
    setShowLibrary(false);
    setView('diagram-rules');
  };
  const handleWorkspaceRulesOpen = () => {
    setShowLibrary(false);
    setView('workspace-rules');
  };
  const handleBrowseTemplates = () => {
    setShowLibrary(true);
    setView('diagram-rules');
  };

  const exportViolations = useCallback(() => {
    const data = JSON.stringify({ violations, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lint-violations.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [violations]);

  if (view === 'diagram-rules') {
    return (
      <VisualEditor
        rulesJson={lintRules}
        onSave={(json) => {
          setViewSettings({ lintRules: json });
          setView('overview');
        }}
        onCancel={() => setView('overview')}
        showLibrary={showLibrary}
        onToggleLibrary={() => setShowLibrary((s) => !s)}
      />
    );
  }

  if (view === 'workspace-rules') {
    return (
      <VisualEditor
        rulesJson={workspaceRulesJson}
        onSave={(json) => {
          saveWorkspaceRules(json);
          setView('overview');
        }}
        onCancel={() => setView('overview')}
        showLibrary={showLibrary}
        onToggleLibrary={() => setShowLibrary((s) => !s)}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3 custom-scrollbar">
      <div className="rounded-[var(--radius-md)] border border-[var(--color-brand-border)] bg-[var(--brand-primary-50)] p-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-[var(--brand-primary)]" />
          <p className="text-xs font-medium text-[var(--brand-primary)]">Architecture Linting</p>
        </div>
        <p className="mt-1 text-[11px] leading-5 text-[var(--brand-secondary)]">
          Enforce architecture constraints in real time — like ESLint for diagrams.
        </p>
      </div>

      {(hasRules || hasWorkspaceRules) && (
        <>
          {parseError ? (
            <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 p-3">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
              <div>
                <p className="text-[11px] font-medium text-red-700">Rule file error</p>
                <p className="text-[11px] text-red-600 mt-0.5 font-mono">{parseError}</p>
              </div>
            </div>
          ) : violations.length === 0 ? (
            <div className="flex items-center gap-2.5 rounded border border-emerald-200 bg-emerald-50/50 p-3">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <div>
                <p className="text-xs font-medium text-[var(--brand-text)]">All rules pass</p>
                <p className="text-[11px] text-[var(--brand-secondary)]">
                  {nodes.length} node{nodes.length !== 1 ? 's' : ''} checked, no violations found.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded border border-red-100 bg-red-50/30">
              <div className="flex items-center justify-between border-b border-red-100 px-3 py-2">
                <span className="text-xs font-medium text-[var(--brand-text)]">
                  {violations.length} violation{violations.length !== 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-2 text-[11px]">
                  {errorCount > 0 && (
                    <span className="flex items-center gap-1 text-red-600 font-medium">
                      <AlertCircle className="h-3 w-3" /> {errorCount}
                    </span>
                  )}
                  {warningCount > 0 && (
                    <span className="flex items-center gap-1 text-amber-600 font-medium">
                      <AlertTriangle className="h-3 w-3" /> {warningCount}
                    </span>
                  )}
                  <Button
                    type="button"
                    onClick={exportViolations}
                    variant="secondary"
                    size="sm"
                    className="h-7 px-2 text-[10px]"
                    icon={<Download className="h-2.5 w-2.5" />}
                  >
                    Export
                  </Button>
                </div>
              </div>
              <div className="divide-y divide-red-100/60">
                {violations.map((v, i) => (
                  <div key={`${v.ruleId}-${i}`} className="flex items-start gap-2 px-3 py-2.5">
                    <SeverityIcon severity={v.severity} />
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-[var(--brand-text)] leading-snug">
                        {v.message}
                      </p>
                      <p className="text-[10px] text-[var(--brand-secondary)] mt-0.5 font-mono">
                        {v.ruleId}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <RulesSection
        title="Diagram rules"
        icon={<Shield className="h-3.5 w-3.5 text-[var(--brand-secondary)]" />}
        hasRules={hasRules}
        rules={diagramRules}
        emptyMessage="No diagram-level rules yet."
        onOpenEditor={handleDiagramRulesOpen}
      />

      <RulesSection
        title="Workspace rules"
        icon={<Globe className="h-3.5 w-3.5 text-[var(--brand-secondary)]" />}
        hasRules={hasWorkspaceRules}
        rules={workspaceRules}
        emptyMessage="Workspace rules apply to all diagrams. Good for org-wide standards."
        onOpenEditor={handleWorkspaceRulesOpen}
      />

      {!hasRules && !hasWorkspaceRules && (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <ShieldCheck className="h-10 w-10 text-[var(--color-brand-border)]" />
          <div>
            <p className="text-sm font-medium text-[var(--brand-text)]">No rules defined yet</p>
            <p className="mt-1 text-[11px] text-[var(--brand-secondary)]">
              Add rules to automatically detect architecture violations as you draw.
            </p>
          </div>
          <Button
            type="button"
            onClick={handleBrowseTemplates}
            variant="secondary"
            className="h-9 border-[var(--brand-primary)] text-sm font-medium text-[var(--brand-primary)] hover:bg-[var(--brand-primary-50)]"
            icon={<BookOpen className="h-4 w-4" />}
          >
            Browse templates
          </Button>
        </div>
      )}
    </div>
  );
}
