import React, { memo } from 'react';
import type { LegacyNodeProps } from '@/lib/reactflowCompat';
import type { NodeData } from '@/lib/types';
import { useInlineNodeTextEdit } from '@/hooks/useInlineNodeTextEdit';
import { InlineTextEditSurface } from '@/components/InlineTextEditSurface';
import { getTransformDiagnosticsAttrs } from '@/components/transformDiagnostics';
import { NodeTransformControls } from '@/components/NodeTransformControls';
import { useActiveNodeSelection } from '@/components/useActiveNodeSelection';
import { NodeQuickCreateButtons } from '@/components/NodeQuickCreateButtons';
import {
  formatErFieldLabel,
  normalizeErFields,
  parseErField,
  stringifyErField,
} from '@/lib/entityFields';
import { useStructuredListEditor } from '@/hooks/useStructuredListEditor';
import { StructuredNodeHandles } from './StructuredNodeHandles';
import { resolveContainerVisualStyle } from '@/theme';

const applyErFieldPatch = (items: string[]): Record<string, unknown> => {
  return { erFields: items.map((s) => parseErField(s)) };
};

function EntityNode({ id, data, selected }: LegacyNodeProps<NodeData>): React.ReactElement {
  const isActiveSelected = useActiveNodeSelection(Boolean(selected));
  const fields = normalizeErFields(data.erFields);
  const labelEdit = useInlineNodeTextEdit(id, 'label', data.label || '');
  const fieldStrings = React.useMemo(() => fields.map(stringifyErField), [fields]);
  const fieldEditor = useStructuredListEditor(id, fieldStrings, applyErFieldPatch);
  const entityBaseMinHeight = 130;
  const visualStyle = resolveContainerVisualStyle(
    data.color,
    data.colorMode || 'subtle',
    data.customColor,
    'slate'
  );
  const estimatedFieldsHeight = fields.length > 0 ? Math.min(fields.length, 6) * 18 + 24 : 18;
  const contentMinHeight = Math.max(entityBaseMinHeight, 56 + estimatedFieldsHeight);

  return (
    <>
      <NodeTransformControls
        isVisible={Boolean(selected)}
        minWidth={220}
        minHeight={contentMinHeight}
      />

      <div
        className="relative min-w-[220px] rounded-lg border shadow-sm"
        style={{
          minHeight: contentMinHeight,
          backgroundColor: visualStyle.bg,
          borderColor: visualStyle.border,
        }}
        {...getTransformDiagnosticsAttrs({
          nodeFamily: 'entity',
          selected: Boolean(selected),
          minHeight: contentMinHeight,
          hasSubLabel: fields.length > 0,
        })}
      >
        <NodeQuickCreateButtons nodeId={id} visible={Boolean(selected)} />
        <div
          className="rounded-t-lg border-b px-3 py-2"
          style={{
            borderColor: visualStyle.border,
            backgroundColor: visualStyle.accentBg,
          }}
        >
          <div className="text-[11px] font-semibold" style={{ color: visualStyle.subText }}>Entity</div>
          <InlineTextEditSurface
            isEditing={labelEdit.isEditing}
            draft={labelEdit.draft}
            displayValue={data.label || 'Entity'}
            onBeginEdit={labelEdit.beginEdit}
            onDraftChange={labelEdit.setDraft}
            onCommit={labelEdit.commit}
            onKeyDown={labelEdit.handleKeyDown}
            className="text-[13px] break-words font-semibold"
            style={{ color: visualStyle.text }}
            isSelected={Boolean(selected)}
          />
        </div>

        <div className="px-3 py-2">
          {fields.length > 0 ? (
            <ul className="space-y-1">
              {fields.map((field, index) => (
                <li
                  key={`field-${index}`}
                  className="break-words font-mono text-xs"
                  style={{ color: visualStyle.text }}
                >
                  {fieldEditor.editingIndex === index ? (
                    <input
                      autoFocus
                      value={fieldEditor.draft}
                      onChange={(event) => fieldEditor.setDraft(event.target.value)}
                      onBlur={fieldEditor.commitEdit}
                      onMouseDown={(event) => event.stopPropagation()}
                      onKeyDown={(event) => fieldEditor.handleKeyDown(event, index)}
                      className="w-full rounded border bg-[var(--brand-surface)] px-1 py-0.5 text-[var(--brand-text)] outline-none"
                      style={{ borderColor: visualStyle.border }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="-mx-1 w-full rounded px-1 text-left"
                      style={{ color: visualStyle.text }}
                      onClick={(event) => {
                        event.stopPropagation();
                        fieldEditor.beginEdit(index, stringifyErField(field));
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono">{formatErFieldLabel(field)}</span>
                        <span className="flex shrink-0 gap-1">
                          {field.isPrimaryKey ? (
                            <span
                              className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                              style={{
                                backgroundColor: visualStyle.badgeBg,
                                color: visualStyle.badgeText,
                              }}
                            >
                              PK
                            </span>
                          ) : null}
                          {field.isForeignKey ? (
                            <span className="rounded-full bg-sky-500/12 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-300">
                              FK
                            </span>
                          ) : null}
                        </span>
                      </div>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-[11px]" style={{ color: visualStyle.subText }}>No fields</div>
          )}
          {fieldEditor.editingIndex === fields.length ? (
            <input
              autoFocus
              value={fieldEditor.draft}
              onChange={(event) => fieldEditor.setDraft(event.target.value)}
              onBlur={fieldEditor.commitEdit}
              onMouseDown={(event) => event.stopPropagation()}
              onKeyDown={(event) => fieldEditor.handleKeyDown(event, fields.length)}
              placeholder="fieldName: TYPE"
              className="mt-1 w-full rounded border bg-[var(--brand-surface)] px-1 py-0.5 text-xs font-mono text-[var(--brand-text)] outline-none"
              style={{ borderColor: visualStyle.border }}
            />
          ) : (
            <button
              type="button"
              className="mt-1 text-[11px]"
              style={{ color: visualStyle.subText }}
              onClick={(event) => {
                event.stopPropagation();
                fieldEditor.beginEdit(fields.length, '');
              }}
            >
              + Add field
            </button>
          )}
        </div>
      </div>

      <StructuredNodeHandles isActiveSelected={isActiveSelected} />
    </>
  );
}

export default memo(EntityNode);
