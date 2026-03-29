import React from 'react';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import type { ErField } from '@/lib/types';
import { createDefaultErField } from '@/lib/entityFields';
import { EDITOR_FIELD_COMPACT_CLASS } from '@/components/ui/editorFieldStyles';

interface EntityFieldListEditorProps {
  fields: ErField[];
  onChange: (fields: ErField[]) => void;
}

function updateField(fields: ErField[], index: number, patch: Partial<ErField>): ErField[] {
  return fields.map((field, fieldIndex) => (
    fieldIndex === index ? { ...field, ...patch } : field
  ));
}

function removeField(fields: ErField[], index: number): ErField[] {
  return fields.filter((_, fieldIndex) => fieldIndex !== index);
}

function moveField(fields: ErField[], index: number, direction: -1 | 1): ErField[] {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= fields.length) {
    return fields;
  }

  const nextFields = [...fields];
  const [field] = nextFields.splice(index, 1);
  nextFields.splice(targetIndex, 0, field);
  return nextFields;
}

export function EntityFieldListEditor({
  fields,
  onChange,
}: EntityFieldListEditorProps): React.ReactElement {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-[var(--brand-secondary)]">Fields</label>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-2 py-1 text-[11px] font-medium text-[var(--brand-secondary)] hover:border-[var(--brand-secondary)] hover:text-[var(--brand-text)]"
          onClick={() => onChange([...fields, createDefaultErField()])}
        >
          <Plus className="h-3 w-3" />
          + Add field
        </button>
      </div>

      <div className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] p-2">
        {fields.length > 0 ? fields.map((field, index) => (
          <div key={`er-field-${index}`} className="space-y-2 rounded-[var(--radius-sm)] border border-[var(--color-brand-border)] bg-[var(--brand-background)]/70 p-2">
            <div className="grid grid-cols-[minmax(0,1fr)_140px_auto] gap-2">
              <input
                value={field.name}
                onChange={(event) => onChange(updateField(fields, index, { name: event.target.value }))}
                className={`${EDITOR_FIELD_COMPACT_CLASS} px-2 py-1.5 text-sm`}
                placeholder="field_name"
              />
              <input
                value={field.dataType}
                onChange={(event) => onChange(updateField(fields, index, { dataType: event.target.value }))}
                className={`${EDITOR_FIELD_COMPACT_CLASS} px-2 py-1.5 text-sm`}
                placeholder="VARCHAR(255)"
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="rounded-[var(--radius-xs)] border border-[var(--color-brand-border)] p-1 text-[var(--brand-secondary)] hover:border-[var(--brand-secondary)] hover:text-[var(--brand-text)] disabled:opacity-40"
                  onClick={() => onChange(moveField(fields, index, -1))}
                  disabled={index === 0}
                  aria-label="Move field up"
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  className="rounded-[var(--radius-xs)] border border-[var(--color-brand-border)] p-1 text-[var(--brand-secondary)] hover:border-[var(--brand-secondary)] hover:text-[var(--brand-text)] disabled:opacity-40"
                  onClick={() => onChange(moveField(fields, index, 1))}
                  disabled={index === fields.length - 1}
                  aria-label="Move field down"
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  className="rounded-[var(--radius-xs)] border border-[var(--color-brand-border)] p-1 text-[var(--brand-secondary)] hover:border-rose-300 hover:text-rose-600"
                  onClick={() => onChange(removeField(fields, index))}
                  aria-label="Remove field"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  field.isPrimaryKey
                    ? 'border-amber-300 bg-amber-50 text-amber-700'
                    : 'border-[var(--color-brand-border)] bg-[var(--brand-surface)] text-[var(--brand-secondary)] hover:border-[var(--brand-secondary)] hover:text-[var(--brand-text)]'
                }`}
                onClick={() => onChange(updateField(fields, index, { isPrimaryKey: !field.isPrimaryKey }))}
              >
                PK
              </button>
              <button
                type="button"
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  field.isForeignKey
                    ? 'border-sky-300 bg-sky-50 text-sky-700'
                    : 'border-[var(--color-brand-border)] bg-[var(--brand-surface)] text-[var(--brand-secondary)] hover:border-[var(--brand-secondary)] hover:text-[var(--brand-text)]'
                }`}
                onClick={() => onChange(updateField(fields, index, { isForeignKey: !field.isForeignKey }))}
              >
                FK
              </button>
            </div>
          </div>
        )) : (
          <button
            type="button"
            className="w-full rounded-[var(--radius-sm)] border border-dashed border-[var(--color-brand-border)] px-3 py-2 text-left text-xs text-[var(--brand-secondary)] hover:border-[var(--brand-secondary)] hover:text-[var(--brand-text)]"
            onClick={() => onChange([createDefaultErField()])}
          >
            + Add field
          </button>
        )}
      </div>
    </div>
  );
}
