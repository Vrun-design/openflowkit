import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, Info, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';
import type {
  LintRule,
  LintSeverity,
  LintRuleType,
  NodeMatcher,
} from '@/services/architectureLint/types';

export function SeverityIcon({ severity }: { severity: LintSeverity }): React.ReactElement {
  switch (severity) {
    case 'error':
      return <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />;
    case 'warning':
      return <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />;
    case 'info':
      return <Info className="h-3.5 w-3.5 shrink-0 text-blue-500" />;
  }
}

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
      <label className="text-[10px] font-medium uppercase tracking-wide text-[var(--brand-secondary)]">
        {label}
      </label>
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

function emptyRule(): LintRule {
  return { id: `rule-${Date.now()}`, severity: 'error', type: 'cannot-connect', description: '' };
}

export interface RuleFormProps {
  initial?: LintRule;
  onSave: (r: LintRule) => void;
  onCancel: () => void;
}

export function RuleForm({ initial, onSave, onCancel }: RuleFormProps): React.ReactElement {
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
          <label className="text-[10px] font-medium uppercase tracking-wide text-[var(--brand-secondary)]">
            Type
          </label>
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
        <label className="text-[10px] font-medium uppercase tracking-wide text-[var(--brand-secondary)]">
          Severity
        </label>
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
      {showTo && <NodeMatcherForm label="To node" value={rule.to} onChange={(m) => set('to', m)} />}
      {showCount && (
        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Min count"
            type="number"
            min={0}
            value={rule.min ?? ''}
            onChange={(event) =>
              set('min', event.target.value ? Number(event.target.value) : undefined)
            }
            className="h-9 text-[11px]"
          />
          <Input
            label="Max count"
            type="number"
            min={0}
            value={rule.max ?? ''}
            onChange={(event) =>
              set('max', event.target.value ? Number(event.target.value) : undefined)
            }
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
        <Button type="button" onClick={() => onSave(rule)} size="sm" className="h-8 flex-1">
          {initial ? 'Update rule' : 'Add rule'}
        </Button>
      </div>
    </div>
  );
}

interface RuleRowProps {
  rule: LintRule;
  onEdit: () => void;
  onDelete: () => void;
}

export function RuleRow({ rule, onEdit, onDelete }: RuleRowProps): React.ReactElement {
  return (
    <div className="flex items-center gap-2 rounded border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-2.5 py-2">
      <SeverityIcon severity={rule.severity} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium text-[var(--brand-text)]">
          {rule.description || rule.id}
        </p>
        <p className="text-[10px] font-mono text-[var(--brand-secondary)]">{rule.type}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onEdit}
        className="h-7 shrink-0 px-2 text-[10px]"
      >
        Edit
      </Button>
      <Button
        type="button"
        variant="icon"
        size="icon"
        onClick={onDelete}
        className="h-7 w-7 shrink-0 text-[var(--brand-secondary)] hover:text-red-400"
      >
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

export function RulesSection({
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
              <p className="min-w-0 flex-1 truncate text-[11px] text-[var(--brand-secondary)]">
                {rule.description || rule.id}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
