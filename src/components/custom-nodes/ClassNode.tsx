import React, { memo } from 'react';
import { Handle, Position } from '@/lib/reactflowCompat';
import type { LegacyNodeProps } from '@/lib/reactflowCompat';
import type { NodeData } from '@/lib/types';
import { useInlineNodeTextEdit } from '@/hooks/useInlineNodeTextEdit';
import { ROLLOUT_FLAGS } from '@/config/rolloutFlags';
import { useFlowStore } from '@/store';
import { getConnectorHandleStyle, getHandlePointerEvents, getV2HandleVisibilityClass } from '@/components/handleInteraction';
import { InlineTextEditSurface } from '@/components/InlineTextEditSurface';
import { getTransformDiagnosticsAttrs } from '@/components/transformDiagnostics';
import { NodeTransformControls } from '@/components/NodeTransformControls';
import { useActiveNodeSelection } from '@/components/useActiveNodeSelection';

function ClassNode({ id, data, selected }: LegacyNodeProps<NodeData>): React.ReactElement {
  const visualQualityV2Enabled = ROLLOUT_FLAGS.visualQualityV2;
  const isActiveSelected = useActiveNodeSelection(Boolean(selected));
  const handlePointerEvents = getHandlePointerEvents(visualQualityV2Enabled, isActiveSelected);
  const handleVisibilityClass = visualQualityV2Enabled
    ? getV2HandleVisibilityClass(isActiveSelected)
    : isActiveSelected
      ? 'opacity-100'
      : 'opacity-0 group-hover:opacity-100 [.is-connecting_&]:opacity-100';
  const attributes = Array.isArray(data.classAttributes) ? data.classAttributes : [];
  const methods = Array.isArray(data.classMethods) ? data.classMethods : [];
  const labelEdit = useInlineNodeTextEdit(id, 'label', data.label || '');
  const stereotypeEdit = useInlineNodeTextEdit(id, 'classStereotype', data.classStereotype || '');
  const { setNodes } = useFlowStore();
  const [editingAttributeIndex, setEditingAttributeIndex] = React.useState<number | null>(null);
  const [editingMethodIndex, setEditingMethodIndex] = React.useState<number | null>(null);
  const [listDraft, setListDraft] = React.useState('');
  const classBaseMinHeight = 140;
  const estimatedAttributesHeight = attributes.length > 0 ? Math.min(attributes.length, 4) * 18 + 16 : 16;
  const estimatedMethodsHeight = methods.length > 0 ? Math.min(methods.length, 4) * 18 + 16 : 16;
  const contentMinHeight = Math.max(classBaseMinHeight, 76 + estimatedAttributesHeight + estimatedMethodsHeight);

  const updateClassList = React.useCallback((key: 'classAttributes' | 'classMethods', index: number, nextValue: string) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id !== id) return node;
        const current = Array.isArray(node.data?.[key]) ? [...(node.data?.[key] as string[])] : [];
        if (index >= current.length) {
          current.push(nextValue);
        } else {
          current[index] = nextValue;
        }
        return { ...node, data: { ...node.data, [key]: current } };
      })
    );
  }, [id, setNodes]);

  const beginAttributeEdit = (index: number, value: string) => {
    setEditingMethodIndex(null);
    setEditingAttributeIndex(index);
    setListDraft(value);
  };

  const beginMethodEdit = (index: number, value: string) => {
    setEditingAttributeIndex(null);
    setEditingMethodIndex(index);
    setListDraft(value);
  };

  const commitAttributeEdit = () => {
    if (editingAttributeIndex === null) return;
    const trimmed = listDraft.trim();
    if (trimmed) {
      updateClassList('classAttributes', editingAttributeIndex, trimmed);
    }
    setEditingAttributeIndex(null);
  };

  const commitMethodEdit = () => {
    if (editingMethodIndex === null) return;
    const trimmed = listDraft.trim();
    if (trimmed) {
      updateClassList('classMethods', editingMethodIndex, trimmed);
    }
    setEditingMethodIndex(null);
  };

  return (
    <>
      <NodeTransformControls
        isVisible={Boolean(selected)}
        minWidth={220}
        minHeight={contentMinHeight}
      />

      <div
        className={`${visualQualityV2Enabled ? 'bg-slate-50' : 'bg-white'} border border-slate-300 rounded-lg shadow-sm min-w-[220px]`}
        style={{
          minHeight: contentMinHeight,
        }}
        {...getTransformDiagnosticsAttrs({
          nodeFamily: 'class',
          selected: Boolean(selected),
          minHeight: contentMinHeight,
          hasSubLabel: Boolean(data.classStereotype),
        })}
      >
        <div className="border-b border-slate-300 px-3 py-2 text-center">
          {data.classStereotype && (
            <InlineTextEditSurface
              isEditing={stereotypeEdit.isEditing}
              draft={stereotypeEdit.draft}
              displayValue={`<<${data.classStereotype}>>`}
              onBeginEdit={stereotypeEdit.beginEdit}
              onDraftChange={stereotypeEdit.setDraft}
              onCommit={stereotypeEdit.commit}
              onKeyDown={stereotypeEdit.handleKeyDown}
              className="text-[10px] text-slate-500 leading-tight"
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
            className={`${visualQualityV2Enabled ? 'text-[13px]' : 'text-sm'} font-semibold text-slate-800 break-words`}
            title={data.label || 'Class'}
            inputClassName="text-center"
            isSelected={Boolean(selected)}
          />
        </div>

        <div className="border-b border-slate-300 px-3 py-2">
          {attributes.length > 0 ? (
            <ul className="space-y-1">
              {attributes.map((attribute, index) => (
                <li key={`attr-${index}`} className="text-xs text-slate-700 font-mono break-words">
                  {editingAttributeIndex === index ? (
                    <input
                      autoFocus
                      value={listDraft}
                      onChange={(event) => setListDraft(event.target.value)}
                      onBlur={commitAttributeEdit}
                      onMouseDown={(event) => event.stopPropagation()}
                      onKeyDown={(event) => {
                        event.stopPropagation();
                        if (event.key === 'Escape') {
                          event.preventDefault();
                          setEditingAttributeIndex(null);
                        }
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          commitAttributeEdit();
                        }
                      }}
                      className="w-full rounded border border-slate-300 bg-white px-1 py-0.5 outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      className="w-full text-left hover:bg-slate-50 rounded px-1 -mx-1"
                      onClick={(event) => {
                        event.stopPropagation();
                        beginAttributeEdit(index, attribute);
                      }}
                    >
                      {attribute}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-[11px] text-slate-400">No attributes</div>
          )}
          <button
            type="button"
            className="mt-1 text-[11px] text-slate-500 hover:text-slate-700"
            onClick={(event) => {
              event.stopPropagation();
              beginAttributeEdit(attributes.length, '');
            }}
          >
            + Add attribute
          </button>
        </div>

        <div className="px-3 py-2">
          {methods.length > 0 ? (
            <ul className="space-y-1">
              {methods.map((method, index) => (
                <li key={`method-${index}`} className="text-xs text-slate-700 font-mono break-words">
                  {editingMethodIndex === index ? (
                    <input
                      autoFocus
                      value={listDraft}
                      onChange={(event) => setListDraft(event.target.value)}
                      onBlur={commitMethodEdit}
                      onMouseDown={(event) => event.stopPropagation()}
                      onKeyDown={(event) => {
                        event.stopPropagation();
                        if (event.key === 'Escape') {
                          event.preventDefault();
                          setEditingMethodIndex(null);
                        }
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          commitMethodEdit();
                        }
                      }}
                      className="w-full rounded border border-slate-300 bg-white px-1 py-0.5 outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      className="w-full text-left hover:bg-slate-50 rounded px-1 -mx-1"
                      onClick={(event) => {
                        event.stopPropagation();
                        beginMethodEdit(index, method);
                      }}
                    >
                      {method}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-[11px] text-slate-400">No methods</div>
          )}
          <button
            type="button"
            className="mt-1 text-[11px] text-slate-500 hover:text-slate-700"
            onClick={(event) => {
              event.stopPropagation();
              beginMethodEdit(methods.length, '');
            }}
          >
            + Add method
          </button>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Top}
        id="top"
        isConnectableStart
        isConnectableEnd
        className={`!w-3 !h-3 !border-2 !border-white transition-all duration-150 hover:scale-125 ${handleVisibilityClass}`}
        style={getConnectorHandleStyle('top', isActiveSelected, handlePointerEvents)}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        isConnectableStart
        isConnectableEnd
        className={`!w-3 !h-3 !border-2 !border-white transition-all duration-150 hover:scale-125 ${handleVisibilityClass}`}
        style={getConnectorHandleStyle('bottom', isActiveSelected, handlePointerEvents)}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        isConnectableStart
        isConnectableEnd
        className={`!w-3 !h-3 !border-2 !border-white transition-all duration-150 hover:scale-125 ${handleVisibilityClass}`}
        style={getConnectorHandleStyle('left', isActiveSelected, handlePointerEvents)}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        isConnectableStart
        isConnectableEnd
        className={`!w-3 !h-3 !border-2 !border-white transition-all duration-150 hover:scale-125 ${handleVisibilityClass}`}
        style={getConnectorHandleStyle('right', isActiveSelected, handlePointerEvents)}
      />
    </>
  );
}

export default memo(ClassNode);
