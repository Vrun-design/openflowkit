import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Shield, ShieldCheck } from 'lucide-react';
import { useFlowStore } from '@/store';
import { useCanvasState } from '@/store/canvasHooks';
import { useArchitectureLint } from '@/context/ArchitectureLintContext';
import { EXAMPLE_LINT_RULES } from '@/services/architectureLint/defaultRules';
import type { LintSeverity } from '@/services/architectureLint/types';

function SeverityIcon({ severity }: { severity: LintSeverity }): React.ReactElement {
    switch (severity) {
        case 'error':
            return <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />;
        case 'warning':
            return <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />;
        case 'info':
            return <Info className="h-3.5 w-3.5 shrink-0 text-blue-500" />;
    }
}

export function LintRulesPanel(): React.ReactElement {
    const { viewSettings, setViewSettings } = useFlowStore();
    const { nodes } = useCanvasState();
    const { violations, parseError } = useArchitectureLint();
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState('');

    const lintRules = viewSettings.lintRules;
    const hasRules = lintRules.trim().length > 0;
    const errorCount = violations.filter((v) => v.severity === 'error').length;
    const warningCount = violations.filter((v) => v.severity === 'warning').length;

    function openEditor(): void {
        setDraft(lintRules || EXAMPLE_LINT_RULES);
        setIsEditing(true);
    }

    function saveRules(): void {
        setViewSettings({ lintRules: draft });
        setIsEditing(false);
    }

    function clearRules(): void {
        setViewSettings({ lintRules: '' });
        setIsEditing(false);
    }

    if (isEditing) {
        return (
            <div className="flex h-full min-h-0 flex-col gap-3 p-3">
                <div className="rounded-[var(--radius-md)] border border-slate-200 bg-[var(--brand-primary-50)] p-3">
                    <p className="text-xs font-medium text-[var(--brand-primary)]">Architecture Rules</p>
                    <p className="mt-0.5 text-[11px] leading-5 text-slate-500">
                        Define rules in JSON. Violations are highlighted in real time on the canvas.
                    </p>
                </div>

                <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    spellCheck={false}
                    className="min-h-[280px] flex-1 resize-none rounded-[var(--radius-md)] border border-slate-200 bg-white px-3 py-3 font-mono text-xs text-slate-700 outline-none placeholder-slate-300 focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary-100)] custom-scrollbar"
                    placeholder={EXAMPLE_LINT_RULES}
                />

                <div className="flex gap-2">
                    <button
                        onClick={() => setIsEditing(false)}
                        className="flex h-8 flex-1 items-center justify-center rounded-[var(--brand-radius)] border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={saveRules}
                        className="flex h-8 flex-1 items-center justify-center rounded-[var(--brand-radius)] bg-[var(--brand-primary)] text-xs font-medium text-white hover:bg-[var(--brand-primary-600)]"
                    >
                        Save rules
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3 custom-scrollbar">
            <div className="rounded-[var(--radius-md)] border border-slate-200 bg-[var(--brand-primary-50)] p-3">
                <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-[var(--brand-primary)]" />
                    <p className="text-xs font-medium text-[var(--brand-primary)]">Architecture Linting</p>
                </div>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">
                    Write rules to enforce your architecture constraints — like ESLint, but for diagrams. Violations are highlighted on the canvas in real time.
                </p>
            </div>

            {!hasRules ? (
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                    <ShieldCheck className="h-10 w-10 text-slate-200" />
                    <div>
                        <p className="text-sm font-medium text-slate-700">No rules defined yet</p>
                        <p className="mt-1 text-[11px] text-slate-400">
                            Add rules to automatically detect architecture violations as you draw.
                        </p>
                    </div>
                    <button
                        onClick={openEditor}
                        className="flex h-9 items-center gap-2 rounded-[var(--brand-radius)] bg-[var(--brand-primary)] px-4 text-sm font-medium text-white hover:bg-[var(--brand-primary-600)]"
                    >
                        <Shield className="h-4 w-4" />
                        Add rules
                    </button>
                </div>
            ) : (
                <>
                    {parseError ? (
                        <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-3">
                            <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                            <div>
                                <p className="text-[11px] font-medium text-red-700">Rule file error</p>
                                <p className="text-[11px] text-red-600 mt-0.5 font-mono">{parseError}</p>
                            </div>
                        </div>
                    ) : violations.length === 0 ? (
                        <div className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-emerald-200 bg-emerald-50/50 p-3">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                            <div>
                                <p className="text-xs font-medium text-slate-700">All rules pass</p>
                                <p className="text-[11px] text-slate-400">
                                    {nodes.length} node{nodes.length !== 1 ? 's' : ''} checked — no violations found.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-[var(--radius-md)] border border-red-100 bg-red-50/30">
                            <div className="flex items-center justify-between border-b border-red-100 px-3 py-2">
                                <span className="text-xs font-medium text-slate-700">
                                    {violations.length} violation{violations.length !== 1 ? 's' : ''}
                                </span>
                                <div className="flex gap-2 text-[11px]">
                                    {errorCount > 0 && (
                                        <span className="flex items-center gap-1 text-red-600 font-medium">
                                            <AlertCircle className="h-3 w-3" /> {errorCount} error{errorCount !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                    {warningCount > 0 && (
                                        <span className="flex items-center gap-1 text-amber-600 font-medium">
                                            <AlertTriangle className="h-3 w-3" /> {warningCount} warning{warningCount !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="divide-y divide-red-100/60">
                                {violations.map((v, i) => (
                                    <div key={`${v.ruleId}-${i}`} className="flex items-start gap-2 px-3 py-2.5">
                                        <SeverityIcon severity={v.severity} />
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-medium text-slate-700 leading-snug">{v.message}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{v.ruleId}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button
                            onClick={openEditor}
                            className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[var(--brand-radius)] border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                            Edit rules
                        </button>
                        <button
                            onClick={clearRules}
                            className="flex h-8 items-center justify-center gap-1.5 rounded-[var(--brand-radius)] border border-slate-200 px-3 text-xs font-medium text-slate-400 hover:bg-slate-50 hover:text-red-500"
                        >
                            Clear
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
