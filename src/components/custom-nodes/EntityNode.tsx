import React, { memo } from 'react';
import { Handle, Position } from '@/lib/reactflowCompat';
import type { LegacyNodeProps } from '@/lib/reactflowCompat';
import type { NodeData } from '@/lib/types';
import { useInlineNodeTextEdit } from '@/hooks/useInlineNodeTextEdit';
import { ROLLOUT_FLAGS } from '@/config/rolloutFlags';
import { useFlowStore } from '@/store';
import { getConnectorHandleStyle, getHandlePointerEvents, getV2HandleVisibilityClass } from '@/components/handleInteraction';
import { getTransformDiagnosticsAttrs } from '@/components/transformDiagnostics';
import { NodeTransformControls } from '@/components/NodeTransformControls';
import { useActiveNodeSelection } from '@/components/useActiveNodeSelection';

function EntityNode({ id, data, selected }: LegacyNodeProps<NodeData>): React.ReactElement {
  const visualQualityV2Enabled = ROLLOUT_FLAGS.visualQualityV2;
  const isActiveSelected = useActiveNodeSelection(Boolean(selected));
  const handlePointerEvents = getHandlePointerEvents(visualQualityV2Enabled, isActiveSelected);
  const handleVisibilityClass = visualQualityV2Enabled
    ? getV2HandleVisibilityClass(isActiveSelected)
    : isActiveSelected
      ? 'opacity-100'
      : 'opacity-0 group-hover:opacity-100 [.is-connecting_&]:opacity-100';
  const fields = Array.isArray(data.erFields) ? data.erFields : [];
  const labelEdit = useInlineNodeTextEdit(id, 'label', data.label || '');
  const { setNodes } = useFlowStore();
  const [editingFieldIndex, setEditingFieldIndex] = React.useState<number | null>(null);
  const [fieldDraft, setFieldDraft] = React.useState('');
  const entityBaseMinHeight = 130;
  const estimatedFieldsHeight = fields.length > 0 ? Math.min(fields.length, 6) * 18 + 24 : 18;
  const contentMinHeight = Math.max(entityBaseMinHeight, 56 + estimatedFieldsHeight);

  const updateField = React.useCallback((index: number, value: string) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id !== id) return node;
        const current = Array.isArray(node.data?.erFields) ? [...node.data.erFields] : [];
        if (index >= current.length) {
          current.push(value);
        } else {
          current[index] = value;
        }
        return { ...node, data: { ...node.data, erFields: current } };
      })
    );
  }, [id, setNodes]);

  const beginFieldEdit = (index: number, value: string) => {
    setEditingFieldIndex(index);
    setFieldDraft(value);
  };

  const commitFieldEdit = () => {
    if (editingFieldIndex === null) return;
    const trimmed = fieldDraft.trim();
    if (trimmed) {
      updateField(editingFieldIndex, trimmed);
    }
    setEditingFieldIndex(null);
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
          nodeFamily: 'entity',
          selected: Boolean(selected),
          minHeight: contentMinHeight,
          hasSubLabel: fields.length > 0,
        })}
      >
        <div className="border-b border-slate-300 px-3 py-2 bg-slate-50 rounded-t-lg">
          <div className="text-[11px] font-semibold text-slate-500">Entity</div>
          <div
            className={`${visualQualityV2Enabled ? 'text-[13px]' : 'text-sm'} font-semibold text-slate-800 break-words`}
            title={data.label || 'Entity'}
            onClick={(event) => {
              event.stopPropagation();
              labelEdit.beginEdit();
            }}
          >
            {labelEdit.isEditing ? (
              <input
                autoFocus
                value={labelEdit.draft}
                onChange={(event) => labelEdit.setDraft(event.target.value)}
                onBlur={labelEdit.commit}
                onKeyDown={labelEdit.handleKeyDown}
                onMouseDown={(event) => event.stopPropagation()}
                className="w-full rounded border border-slate-300 bg-white/90 px-1 py-0.5 outline-none"
              />
            ) : (
              data.label || 'Entity'
            )}
          </div>
        </div>

        <div className="px-3 py-2">
          {fields.length > 0 ? (
            <ul className="space-y-1">
              {fields.map((field, index) => (
                <li key={`field-${index}`} className="text-xs text-slate-700 font-mono break-words">
                  {editingFieldIndex === index ? (
                    <input
                      autoFocus
                      value={fieldDraft}
                      onChange={(event) => setFieldDraft(event.target.value)}
                      onBlur={commitFieldEdit}
                      onMouseDown={(event) => event.stopPropagation()}
                      onKeyDown={(event) => {
                        event.stopPropagation();
                        if (event.key === 'Escape') {
                          event.preventDefault();
                          setEditingFieldIndex(null);
                        }
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          commitFieldEdit();
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
                        beginFieldEdit(index, field);
                      }}
                    >
                      {field}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-[11px] text-slate-400">No fields</div>
          )}
          <button
            type="button"
            className="mt-1 text-[11px] text-slate-500 hover:text-slate-700"
            onClick={(event) => {
              event.stopPropagation();
              beginFieldEdit(fields.length, '');
            }}
          >
            + Add field
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

export default memo(EntityNode);
