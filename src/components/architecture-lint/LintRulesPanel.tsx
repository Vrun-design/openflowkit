import React, { useCallback, useState } from 'react';
import {
    AlertCircle,
    AlertTriangle,
    BookOpen,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Download,
    Info,
    Plus,
    Shield,
    ShieldCheck,
    Trash2,
    Globe,
} from 'lucide-react';
import { SegmentedChoice } from '@/components/properties/SegmentedChoice';
import { useFlowStore } from '@/store';
import { useCanvasState } from '@/store/canvasHooks';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useArchitectureLint } from '@/context/ArchitectureLintContext';
import { EXAMPLE_LINT_RULES } from '@/services/architectureLint/defaultRules';
import { RULE_LIBRARY } from '@/services/architectureLint/ruleLibrary';
import { loadWorkspaceRules, saveWorkspaceRules } from '@/services/architectureLint/workspaceRules';
import { parseRulesJson } from '@/services/architectureLint/ruleEngine';
import type { LintRule, LintSeverity, LintRuleType, NodeMatcher } from '@/services/architectureLint/types';

// ─── helpers ────────────────────────────────────────────────────────────────

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

function mergeRulesJson(existing: string, newRules: LintRule[]): string {
    const { rules } = parseRulesJson(existing);
    const merged = [...rules, ...newRules];
    return JSON.stringify({ rules: merged }, null, 2);
}

// ─── NodeMatcher form ────────────────────────────────────────────────────────

type MatcherField = 'labelContains' | 'labelEquals' | 'nodeType' | 'id' | 'none';

const MATCHER_FIELD_OPTIONS: SelectOption[] = [
    { value: 'none', label: 'Any node' },
    { value: 'labelContains', label: 'Label contains' },
    { value: 'labelEquals', label: 'Label equals' },
    { value: 'nodeType', label: 'Node type' },
    { value: 'id', label: 'Node ID' },
];

const RULE_TYPE_OPTIONS: SelectOption[] = [
    { value: 'cannot-connect', label: 'Cannot connect' },
    { value: 'must-connect', label: 'Must connect' },
    { value: 'forbidden-cycle', label: 'Forbidden cycle' },
    { value: 'must-have-node', label: 'Must have node' },
    { value: 'node-count', label: 'Node count' },
];

const SEVERITY_OPTIONS: SelectOption[] = [
    { value: 'error', label: 'Error' },
    { value: 'warning', label: 'Warning' },
    { value: 'info', label: 'Info' },
];

const EDITOR_MODE_ITEMS = [
    { id: 'visual', label: 'Visual' },
    { id: 'json', label: 'JSON' },
] as const;

function matcherToField(m: NodeMatcher | undefined): { field: MatcherField; value: string } {
    if (!m) return { field: 'none', value: '' };
    if (m.labelContains) return { field: 'labelContains', value: m.labelContains };
    if (m.labelEquals) return { field: 'labelEquals', value: m.labelEquals };
    if (m.nodeType) return { field: 'nodeType', value: m.nodeType };
    if (m.id) return { field: 'id', value: m.id };
    return { field: 'none', value: '' };
}

function fieldToMatcher(field: MatcherField, value: string): NodeMatcher | undefined {
    if (field === 'none' || !value.trim()) return undefined;
    return { [field]: value.trim() };
}

interface NodeMatcherFormProps {
    label: string;
    value: NodeMatcher | undefined;
    onChange: (m: NodeMatcher | undefined) => void;
}

function NodeMatcherForm({ label, value, onChange }: NodeMatcherFormProps): React.ReactElement {
    const { field, value: val } = matcherToField(value);

    function onFieldChange(f: MatcherField): void {
        onChange(fieldToMatcher(f, val));
    }

    function onValueChange(v: string): void {
        onChange(fieldToMatcher(field, v));
    }

    return (
        <div className="space-y-1">
            <label className="text-[10px] font-medium uppercase tracking-wide text-[var(--brand-secondary)]">{label}</label>
            <div className="flex gap-1.5">
                <Select
                    value={field}
                    onChange={(nextValue) => onFieldChange(nextValue as MatcherField)}
                    options={MATCHER_FIELD_OPTIONS}
                    className="min-w-[11rem]"
                />
                {field !== 'none' && (
                    <Input
                        type="text"
                        value={val}
                        onChange={(event) => onValueChange(event.target.value)}
                        placeholder="value"
                        className="h-9 min-w-0 flex-1 text-[11px]"
                    />
                )}
            </div>
        </div>
    );
}

// ─── Rule builder form ───────────────────────────────────────────────────────

function emptyRule(): LintRule {
    return { id: `rule-${Date.now()}`, severity: 'error', type: 'cannot-connect', description: '' };
}

interface RuleFormProps {
    initial?: LintRule;
    onSave: (r: LintRule) => void;
    onCancel: () => void;
}

function RuleForm({ initial, onSave, onCancel }: RuleFormProps): React.ReactElement {
    const [rule, setRule] = useState<LintRule>(initial ?? emptyRule());

    function set<K extends keyof LintRule>(key: K, val: LintRule[K]): void {
        setRule((r) => ({ ...r, [key]: val }));
    }

    const showTo = ['cannot-connect', 'must-connect'].includes(rule.type);
    const showCount = rule.type === 'node-count';

    return (
        <div className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] p-3">
            <div className="grid grid-cols-2 gap-2">
                <Input
                    label="Rule ID"
                    type="text"
                    value={rule.id}
                    onChange={(event) => set('id', event.target.value)}
                    className="h-9 text-[11px]"
                />
                <div className="space-y-1">
                    <label className="text-[10px] font-medium uppercase tracking-wide text-[var(--brand-secondary)]">Type</label>
                    <Select
                        value={rule.type}
                        onChange={(nextValue) => set('type', nextValue as LintRuleType)}
                        options={RULE_TYPE_OPTIONS}
                    />
                </div>
            </div>

            <Input
                label="Description (shown in violations)"
                type="text"
                value={rule.description ?? ''}
                onChange={(event) => set('description', event.target.value)}
                placeholder="e.g. Services must not call databases directly"
                className="h-9 text-[11px]"
            />

            <div className="space-y-1">
                <label className="text-[10px] font-medium uppercase tracking-wide text-[var(--brand-secondary)]">Severity</label>
                <Select
                    value={rule.severity}
                    onChange={(nextValue) => set('severity', nextValue as LintSeverity)}
                    options={SEVERITY_OPTIONS}
                />
            </div>

            <NodeMatcherForm
                label={showTo ? 'From node' : 'Node matcher'}
                value={rule.from}
                onChange={(m) => set('from', m)}
            />
            {showTo && (
                <NodeMatcherForm
                    label="To node"
                    value={rule.to}
                    onChange={(m) => set('to', m)}
                />
            )}
            {showCount && (
                <div className="grid grid-cols-2 gap-2">
                    <Input
                        label="Min count"
                        type="number"
                        min={0}
                        value={rule.min ?? ''}
                        onChange={(event) => set('min', event.target.value ? Number(event.target.value) : undefined)}
                        className="h-9 text-[11px]"
                    />
                    <Input
                        label="Max count"
                        type="number"
                        min={0}
                        value={rule.max ?? ''}
                        onChange={(event) => set('max', event.target.value ? Number(event.target.value) : undefined)}
                        className="h-9 text-[11px]"
                    />
                </div>
            )}

            <div className="flex gap-2">
                <Button
                    type="button"
                    onClick={onCancel}
                    variant="secondary"
                    size="sm"
                    className="h-8 flex-1"
                >
                    Cancel
                </Button>
                <Button
                    type="button"
                    onClick={() => onSave(rule)}
                    size="sm"
                    className="h-8 flex-1"
                >
                    {initial ? 'Update rule' : 'Add rule'}
                </Button>
            </div>
        </div>
    );
}

// ─── Rule list row ───────────────────────────────────────────────────────────

interface RuleRowProps {
    rule: LintRule;
    onEdit: () => void;
    onDelete: () => void;
}

function RuleRow({ rule, onEdit, onDelete }: RuleRowProps): React.ReactElement {
    return (
        <div className="flex items-center gap-2 rounded border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-2.5 py-2">
            <SeverityIcon severity={rule.severity} />
            <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium text-[var(--brand-text)]">{rule.description || rule.id}</p>
                <p className="text-[10px] font-mono text-[var(--brand-secondary)]">{rule.type}</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={onEdit} className="h-7 shrink-0 px-2 text-[10px]">
                Edit
            </Button>
            <Button type="button" variant="icon" size="icon" onClick={onDelete} className="h-7 w-7 shrink-0 text-[var(--brand-secondary)] hover:text-red-400">
                <Trash2 className="h-3.5 w-3.5" />
            </Button>
        </div>
    );
}

interface RulesSectionProps {
    title: string;
    icon: React.ReactNode;
    hasRules: boolean;
    rules: LintRule[];
    emptyMessage: string;
    onOpenEditor: () => void;
}

function RulesSection({
    title,
    icon,
    hasRules,
    rules,
    emptyMessage,
    onOpenEditor,
}: RulesSectionProps): React.ReactElement {
    return (
        <div className="rounded border border-[var(--color-brand-border)] bg-[var(--brand-surface)]">
            <div className="flex items-center justify-between border-b border-[var(--color-brand-border)] px-3 py-2">
                <div className="flex items-center gap-1.5">
                    {icon}
                    <p className="text-[11px] font-medium text-[var(--brand-text)]">{title}</p>
                    {hasRules ? (
                        <span className="rounded-full bg-[var(--brand-background)] px-1.5 py-0 text-[10px] text-[var(--brand-secondary)]">
                            {rules.length}
                        </span>
                    ) : null}
                </div>
                <Button
                    type="button"
                    onClick={onOpenEditor}
                    variant="secondary"
                    size="sm"
                    className="h-7 px-2 text-[10px]"
                    icon={!hasRules ? <Plus className="h-3 w-3" /> : undefined}
                >
                    {hasRules ? 'Edit' : 'Add'}
                </Button>
            </div>
            {!hasRules ? (
                <p className="px-3 py-2 text-[11px] text-[var(--brand-secondary)]">{emptyMessage}</p>
            ) : (
                <div className="divide-y divide-[var(--color-brand-border)] px-3">
                    {rules.map((rule) => (
                        <div key={rule.id} className="flex items-center gap-2 py-2">
                            <SeverityIcon severity={rule.severity} />
                            <p className="min-w-0 flex-1 truncate text-[11px] text-[var(--brand-secondary)]">{rule.description || rule.id}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Template library picker ─────────────────────────────────────────────────

interface LibraryPickerProps {
    onApply: (rulesJson: string) => void;
    existingJson: string;
    onClose: () => void;
}

function LibraryPicker({ onApply, existingJson, onClose }: LibraryPickerProps): React.ReactElement {
    const [expanded, setExpanded] = useState<string | null>(null);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-[var(--brand-text)]">Rule Templates</p>
                <Button type="button" variant="ghost" size="sm" onClick={onClose} className="h-7 px-2 text-[11px]">
                    Back
                </Button>
            </div>
            <p className="text-[11px] text-[var(--brand-secondary)]">Pick a template to add to this diagram&apos;s rules.</p>
            {RULE_LIBRARY.map((tpl) => (
                <div key={tpl.id} className="rounded border border-[var(--color-brand-border)] bg-[var(--brand-surface)]">
                    <button
                        onClick={() => setExpanded(expanded === tpl.id ? null : tpl.id)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left"
                    >
                        {expanded === tpl.id
                            ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--brand-secondary)]" />
                            : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--brand-secondary)]" />
                        }
                        <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-medium text-[var(--brand-text)]">{tpl.name}</p>
                            <p className="text-[10px] text-[var(--brand-secondary)]">{tpl.description}</p>
                        </div>
                        <Button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onApply(mergeRulesJson(existingJson, tpl.rules));
                                onClose();
                            }}
                            size="sm"
                            className="h-7 shrink-0 px-2 text-[10px]"
                        >
                            Add
                        </Button>
                    </button>
                    {expanded === tpl.id && (
                        <div className="border-t border-[var(--color-brand-border)] px-3 py-2 space-y-1">
                            {tpl.rules.map((r) => (
                                <div key={r.id} className="flex items-center gap-1.5">
                                    <SeverityIcon severity={r.severity} />
                                    <p className="text-[10px] text-[var(--brand-secondary)]">{r.description}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

// ─── Visual rule editor ──────────────────────────────────────────────────────

type EditorMode = 'visual' | 'json';

interface VisualEditorProps {
    rulesJson: string;
    onSave: (json: string) => void;
    onCancel: () => void;
    showLibrary: boolean;
    onToggleLibrary: () => void;
}

function VisualEditor({ rulesJson, onSave, onCancel, showLibrary, onToggleLibrary }: VisualEditorProps): React.ReactElement {
    const [mode, setMode] = useState<EditorMode>('visual');
    const [draft, setDraft] = useState(rulesJson || JSON.stringify({ rules: [] }, null, 2));
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [addingNew, setAddingNew] = useState(false);

    const { rules, error } = parseRulesJson(draft);

    function updateRules(newRules: LintRule[]): void {
        setDraft(JSON.stringify({ rules: newRules }, null, 2));
    }

    function saveRule(r: LintRule, index: number | null): void {
        if (index === null) {
            updateRules([...rules, r]);
            setAddingNew(false);
        } else {
            const updated = rules.map((existing, i) => (i === index ? r : existing));
            updateRules(updated);
            setEditingIndex(null);
        }
    }

    function deleteRule(index: number): void {
        updateRules(rules.filter((_, i) => i !== index));
    }

    if (showLibrary) {
        return (
            <div className="flex h-full min-h-0 flex-col gap-3 p-3">
                <LibraryPicker
                    existingJson={draft}
                    onApply={(json) => { setDraft(json); onToggleLibrary(); }}
                    onClose={onToggleLibrary}
                />
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-col gap-3 p-3">
            <div className="flex items-center gap-2">
                <p className="flex-1 text-xs font-medium text-[var(--brand-text)]">Edit Rules</p>
                <div className="min-w-[10rem]">
                    <SegmentedChoice
                        items={[...EDITOR_MODE_ITEMS]}
                        selectedId={mode}
                        onSelect={(nextMode) => setMode(nextMode as EditorMode)}
                        columns={2}
                        size="sm"
                    />
                </div>
                <Button
                    type="button"
                    onClick={onToggleLibrary}
                    variant="secondary"
                    size="sm"
                    className="h-8 px-2 text-[10px]"
                    icon={<BookOpen className="h-3 w-3" />}
                >
                    Templates
                </Button>
            </div>

            {mode === 'json' ? (
                <Textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    spellCheck={false}
                    className="min-h-[200px] flex-1 resize-none font-mono text-xs text-[var(--brand-text)] custom-scrollbar"
                    placeholder={EXAMPLE_LINT_RULES}
                />
            ) : (
                <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
                    {error && (
                        <div className="rounded border border-red-200 bg-red-50 p-2">
                            <p className="text-[10px] font-mono text-red-600">{error}</p>
                        </div>
                    )}
                    {rules.map((rule, i) => (
                        editingIndex === i ? (
                            <RuleForm
                                key={rule.id}
                                initial={rule}
                                onSave={(r) => saveRule(r, i)}
                                onCancel={() => setEditingIndex(null)}
                            />
                        ) : (
                            <RuleRow
                                key={rule.id}
                                rule={rule}
                                onEdit={() => setEditingIndex(i)}
                                onDelete={() => deleteRule(i)}
                            />
                        )
                    ))}
                    {addingNew ? (
                        <RuleForm
                            onSave={(r) => saveRule(r, null)}
                            onCancel={() => setAddingNew(false)}
                        />
                    ) : (
                        <Button
                            type="button"
                            onClick={() => setAddingNew(true)}
                            variant="secondary"
                            size="sm"
                            className="h-9 w-full border-dashed text-[11px] text-[var(--brand-secondary)] hover:text-[var(--brand-primary)]"
                            icon={<Plus className="h-3.5 w-3.5" />}
                        >
                            Add rule
                        </Button>
                    )}
                </div>
            )}

            <div className="flex gap-2">
                <Button
                    type="button"
                    onClick={onCancel}
                    variant="secondary"
                    size="sm"
                    className="h-8 flex-1"
                >
                    Cancel
                </Button>
                <Button
                    type="button"
                    onClick={() => onSave(draft)}
                    size="sm"
                    className="h-8 flex-1"
                >
                    Save rules
                </Button>
            </div>
        </div>
    );
}

// ─── Main panel ──────────────────────────────────────────────────────────────

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
                onSave={(json) => { setViewSettings({ lintRules: json }); setView('overview'); }}
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
                onSave={(json) => { saveWorkspaceRules(json); setView('overview'); }}
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

            {/* Violation summary */}
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
                                            <p className="text-[11px] font-medium text-[var(--brand-text)] leading-snug">{v.message}</p>
                                            <p className="text-[10px] text-[var(--brand-secondary)] mt-0.5 font-mono">{v.ruleId}</p>
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

            {/* Empty state */}
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
