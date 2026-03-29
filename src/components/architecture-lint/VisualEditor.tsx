import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { SegmentedChoice } from '@/components/properties/SegmentedChoice';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { EXAMPLE_LINT_RULES } from '@/services/architectureLint/defaultRules';
import { RULE_LIBRARY } from '@/services/architectureLint/ruleLibrary';
import { parseRulesJson } from '@/services/architectureLint/ruleEngine';
import type { LintRule } from '@/services/architectureLint/types';
import { SeverityIcon, RuleForm, RuleRow } from './RuleForm';

function mergeRulesJson(existing: string, newRules: LintRule[]): string {
  const { rules } = parseRulesJson(existing);
  const merged = [...rules, ...newRules];
  return JSON.stringify({ rules: merged }, null, 2);
}

const EDITOR_MODE_ITEMS = [
  { id: 'visual', label: 'Visual' },
  { id: 'json', label: 'JSON' },
] as const;

type EditorMode = 'visual' | 'json';

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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-7 px-2 text-[11px]"
        >
          Back
        </Button>
      </div>
      <p className="text-[11px] text-[var(--brand-secondary)]">
        Pick a template to add to this diagram&apos;s rules.
      </p>
      {RULE_LIBRARY.map((tpl) => (
        <div
          key={tpl.id}
          className="rounded border border-[var(--color-brand-border)] bg-[var(--brand-surface)]"
        >
          <button
            onClick={() => setExpanded(expanded === tpl.id ? null : tpl.id)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left"
          >
            {expanded === tpl.id ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--brand-secondary)]" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--brand-secondary)]" />
            )}
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

export interface VisualEditorProps {
  rulesJson: string;
  onSave: (json: string) => void;
  onCancel: () => void;
  showLibrary: boolean;
  onToggleLibrary: () => void;
}

export function VisualEditor({
  rulesJson,
  onSave,
  onCancel,
  showLibrary,
  onToggleLibrary,
}: VisualEditorProps): React.ReactElement {
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
          onApply={(json) => {
            setDraft(json);
            onToggleLibrary();
          }}
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
          {rules.map((rule, i) =>
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
          )}
          {addingNew ? (
            <RuleForm onSave={(r) => saveRule(r, null)} onCancel={() => setAddingNew(false)} />
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
        <Button type="button" onClick={() => onSave(draft)} size="sm" className="h-8 flex-1">
          Save rules
        </Button>
      </div>
    </div>
  );
}
