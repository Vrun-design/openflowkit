import React, { memo } from 'react';
import type { LegacyNodeProps } from '@/lib/reactflowCompat';
import type { NodeData } from '@/lib/types';
import { useInlineNodeTextEdit } from '@/hooks/useInlineNodeTextEdit';
import { useFlowStore } from '@/store';
import { InlineTextEditSurface } from '@/components/InlineTextEditSurface';
import { getTransformDiagnosticsAttrs } from '@/components/transformDiagnostics';
import { NodeTransformControls } from '@/components/NodeTransformControls';
import { useActiveNodeSelection } from '@/components/useActiveNodeSelection';
import { getStructuredListNavigationAction } from './structuredListNavigation';
import { NodeQuickCreateButtons } from '@/components/NodeQuickCreateButtons';
import { getClassVisibilityTone, parseClassMember } from '@/lib/classMembers';
import { StructuredNodeHandles } from './StructuredNodeHandles';
import { resolveContainerVisualStyle } from '@/theme';

function getClassList(data: NodeData, key: 'classAttributes' | 'classMethods'): string[] {
  return Array.isArray(data[key]) ? data[key] : [];
}

function ClassNode({ id, data, selected }: LegacyNodeProps<NodeData>): React.ReactElement {
  const isActiveSelected = useActiveNodeSelection(Boolean(selected));
  const attributes = getClassList(data, 'classAttributes');
  const methods = getClassList(data, 'classMethods');
  const labelEdit = useInlineNodeTextEdit(id, 'label', data.label || '');
  const stereotypeEdit = useInlineNodeTextEdit(id, 'classStereotype', data.classStereotype || '');
  const setNodes = useFlowStore((state) => state.setNodes);
  const [editingAttributeIndex, setEditingAttributeIndex] = React.useState<number | null>(null);
  const [editingMethodIndex, setEditingMethodIndex] = React.useState<number | null>(null);
  const [listDraft, setListDraft] = React.useState('');
  const classBaseMinHeight = 140;
  const visualStyle = resolveContainerVisualStyle(
    data.color,
    data.colorMode || 'subtle',
    data.customColor,
    'slate'
  );
  const estimatedAttributesHeight =
    attributes.length > 0 ? Math.min(attributes.length, 4) * 18 + 16 : 16;
  const estimatedMethodsHeight = methods.length > 0 ? Math.min(methods.length, 4) * 18 + 16 : 16;
  const contentMinHeight = Math.max(
    classBaseMinHeight,
    76 + estimatedAttributesHeight + estimatedMethodsHeight
  );

  function mutateClassList(
    key: 'classAttributes' | 'classMethods',
    updater: (current: string[]) => string[]
  ): void {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id !== id) return node;
        const current = getClassList(node.data, key);
        return { ...node, data: { ...node.data, [key]: updater([...current]) } };
      })
    );
  }

  function beginEdit(key: 'classAttributes' | 'classMethods', index: number, value: string): void {
    if (key === 'classAttributes') {
      setEditingMethodIndex(null);
      setEditingAttributeIndex(index);
    } else {
      setEditingAttributeIndex(null);
      setEditingMethodIndex(index);
    }
    setListDraft(value);
  }

  function commitBlur(key: 'classAttributes' | 'classMethods'): void {
    const editingIndex = key === 'classAttributes' ? editingAttributeIndex : editingMethodIndex;
    if (editingIndex === null) return;
    const currentItems = key === 'classAttributes' ? attributes : methods;
    const trimmed = listDraft.trim();
    if (trimmed) {
      mutateClassList(key, (list) => {
        if (editingIndex >= list.length) list.push(trimmed);
        else list[editingIndex] = trimmed;
        return list;
      });
    } else if (editingIndex < currentItems.length) {
      mutateClassList(key, (list) => {
        list.splice(editingIndex, 1);
        return list;
      });
    }
    if (key === 'classAttributes') setEditingAttributeIndex(null);
    else setEditingMethodIndex(null);
  }

  function handleListKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
    key: 'classAttributes' | 'classMethods',
    index: number
  ): void {
    event.stopPropagation();
    const currentItems = key === 'classAttributes' ? attributes : methods;
    const action = getStructuredListNavigationAction(
      event.key,
      { ctrlKey: event.ctrlKey, metaKey: event.metaKey, shiftKey: event.shiftKey },
      index,
      currentItems.length
    );

    if (!action) return;
    event.preventDefault();

    if (action.type === 'cancel') {
      if (key === 'classAttributes') setEditingAttributeIndex(null);
      else setEditingMethodIndex(null);
      return;
    }

    // Persist current value without removing empty rows during navigation
    const trimmed = listDraft.trim();
    if (trimmed) {
      mutateClassList(key, (list) => {
        if (index >= list.length) list.push(trimmed);
        else list[index] = trimmed;
        return list;
      });
    }

    if (action.type === 'insertBelow') {
      mutateClassList(key, (list) => {
        list.splice(action.targetIndex, 0, '');
        return list;
      });
      beginEdit(key, action.targetIndex, '');
      return;
    }

    beginEdit(key, action.targetIndex, currentItems[action.targetIndex] ?? '');
  }

  function renderClassMember(value: string): React.ReactElement {
    const parsed = parseClassMember(value);
    return (
      <span className="inline-flex items-start gap-1 break-words">
        <span className={`font-semibold ${getClassVisibilityTone(parsed.visibility)}`}>
          {parsed.symbol}
        </span>
        <span>{parsed.signature}</span>
      </span>
    );
  }

  function renderListSection(
    key: 'classAttributes' | 'classMethods',
    items: string[],
    editingIndex: number | null,
    placeholder: string,
    emptyLabel: string,
    addLabel: string
  ): React.ReactElement {
    return (
      <>
        {items.length > 0 ? (
          <ul className="space-y-1">
            {items.map((item, index) => (
              <li
                key={`${key}-${index}`}
                className="break-words font-mono text-xs"
                style={{ color: visualStyle.text }}
              >
                {editingIndex === index ? (
                  <input
                    autoFocus
                    value={listDraft}
                    onChange={(event) => setListDraft(event.target.value)}
                    onBlur={() => commitBlur(key)}
                    onMouseDown={(event) => event.stopPropagation()}
                    onKeyDown={(event) => handleListKeyDown(event, key, index)}
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
                      beginEdit(key, index, item);
                    }}
                  >
                    {renderClassMember(item)}
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-[11px]" style={{ color: visualStyle.subText }}>{emptyLabel}</div>
        )}
        {editingIndex === items.length ? (
          <input
            autoFocus
            value={listDraft}
            onChange={(event) => setListDraft(event.target.value)}
            onBlur={() => commitBlur(key)}
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => handleListKeyDown(event, key, items.length)}
            placeholder={placeholder}
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
              beginEdit(key, items.length, '');
            }}
          >
            {addLabel}
          </button>
        )}
      </>
    );
  }

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
          nodeFamily: 'class',
          selected: Boolean(selected),
          minHeight: contentMinHeight,
          hasSubLabel: Boolean(data.classStereotype),
        })}
      >
        <NodeQuickCreateButtons nodeId={id} visible={Boolean(selected)} />
        <div
          className="border-b px-3 py-2 text-center"
          style={{
            borderColor: visualStyle.border,
            backgroundColor: visualStyle.accentBg,
          }}
        >
          {data.classStereotype && (
            <InlineTextEditSurface
              isEditing={stereotypeEdit.isEditing}
              draft={stereotypeEdit.draft}
              displayValue={`<<${data.classStereotype}>>`}
              onBeginEdit={stereotypeEdit.beginEdit}
              onDraftChange={stereotypeEdit.setDraft}
              onCommit={stereotypeEdit.commit}
              onKeyDown={stereotypeEdit.handleKeyDown}
              className="text-[10px] leading-tight"
              style={{ color: visualStyle.subText }}
              inputClassName="text-center"
              isSelected={Boolean(selected)}
            />
          )}
          <InlineTextEditSurface
            isEditing={labelEdit.isEditing}
            draft={labelEdit.draft}
            displayValue={data.label || 'Class'}
            onBeginEdit={labelEdit.beginEdit}
            onDraftChange={labelEdit.setDraft}
            onCommit={labelEdit.commit}
            onKeyDown={labelEdit.handleKeyDown}
            className="text-[13px] break-words font-semibold"
            style={{ color: visualStyle.text }}
            inputClassName="text-center"
            isSelected={Boolean(selected)}
          />
        </div>

        <div className="border-b px-3 py-2" style={{ borderColor: visualStyle.border }}>
          {renderListSection(
            'classAttributes',
            attributes,
            editingAttributeIndex,
            '+ attribute: Type',
            'No attributes',
            '+ Add attribute'
          )}
        </div>

        <div className="px-3 py-2" style={{ backgroundColor: visualStyle.hoverBg }}>
          {renderListSection(
            'classMethods',
            methods,
            editingMethodIndex,
            '+ method(): void',
            'No methods',
            '+ Add method'
          )}
        </div>
      </div>

      <StructuredNodeHandles isActiveSelected={isActiveSelected} />
    </>
  );
}

export default memo(ClassNode);
