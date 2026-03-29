import { useCallback, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useFlowStore } from '@/store';
import type { NodeData } from '@/lib/types';
import { createConnectedSibling } from './node-operations/createConnectedSibling';
import { useNodeLabelEditRequest } from './nodeLabelEditRequest';

type EditableField = 'label' | 'subLabel' | 'classStereotype';
type BeginEditOptions = {
  seedText?: string;
  replaceExisting?: boolean;
};
type InlineNodeTextEditOptions = {
  multiline?: boolean;
  allowTabCreateSibling?: boolean;
  getPatch?: (nextValue: string) => Partial<NodeData>;
  allowFormattingToggle?: boolean;
};

export function useInlineNodeTextEdit(
  nodeId: string,
  field: EditableField,
  initialValue: string,
  options: InlineNodeTextEditOptions = {}
): {
  isEditing: boolean;
  draft: string;
  beginEdit: (options?: BeginEditOptions) => void;
  setDraft: (value: string) => void;
  commit: () => void;
  cancel: () => void;
  handleKeyDown: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
} {
  const { setNodes, recordHistoryV2 } = useFlowStore();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraftState] = useState(initialValue ?? '');
  const multiline = options.multiline ?? false;
  const allowTabCreateSibling = options.allowTabCreateSibling ?? field === 'label';
  const getPatch = options.getPatch;
  const allowFormattingToggle = options.allowFormattingToggle ?? field === 'label';

  const beginEdit = useCallback(
    (options?: BeginEditOptions) => {
      const nextDraft = options?.replaceExisting
        ? (options.seedText ?? '')
        : (options?.seedText ?? initialValue ?? '');
      setDraftState(nextDraft);
      setIsEditing(true);
    },
    [initialValue]
  );

  useNodeLabelEditRequest(nodeId, beginEdit);

  const setDraft = useCallback((value: string) => {
    setDraftState(value);
  }, []);

  const commit = useCallback(() => {
    const nextValue = draft.trim();
    recordHistoryV2();
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                ...(getPatch ? getPatch(nextValue) : { [field]: nextValue }),
              } as NodeData,
            }
          : node
      )
    );
    setIsEditing(false);
  }, [draft, field, getPatch, nodeId, setNodes, recordHistoryV2]);

  const cancel = useCallback(() => {
    setDraftState(initialValue ?? '');
    setIsEditing(false);
  }, [initialValue]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        cancel();
        return;
      }
      if (
        (event.key === 'b' || event.key === 'B') &&
        (event.ctrlKey || event.metaKey) &&
        allowFormattingToggle
      ) {
        event.preventDefault();
        recordHistoryV2();
        setNodes((nodes) =>
          nodes.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    fontWeight: node.data.fontWeight === 'bold' ? 'normal' : 'bold',
                  },
                }
              : node
          )
        );
        return;
      }
      if (
        (event.key === 'i' || event.key === 'I') &&
        (event.ctrlKey || event.metaKey) &&
        allowFormattingToggle
      ) {
        event.preventDefault();
        recordHistoryV2();
        setNodes((nodes) =>
          nodes.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    fontStyle: node.data.fontStyle === 'italic' ? 'normal' : 'italic',
                  },
                }
              : node
          )
        );
        return;
      }
      if (event.key === 'Enter' && !multiline) {
        event.preventDefault();
        commit();
        return;
      }
      if (event.key === 'Enter' && multiline && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        commit();
        return;
      }
      if (event.key === 'Tab' && !event.shiftKey && allowTabCreateSibling) {
        event.preventDefault();
        commit();
        createConnectedSibling(nodeId);
      }
    },
    [
      allowTabCreateSibling,
      allowFormattingToggle,
      cancel,
      commit,
      multiline,
      nodeId,
      recordHistoryV2,
      setNodes,
    ]
  );

  return { isEditing, draft, beginEdit, setDraft, commit, cancel, handleKeyDown };
}
