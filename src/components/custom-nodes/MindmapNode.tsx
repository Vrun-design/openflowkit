import React, { memo } from 'react';
import { Position } from '@/lib/reactflowCompat';
import type { LegacyNodeProps } from '@/lib/reactflowCompat';
import type { NodeData } from '@/lib/types';
import { useInlineNodeTextEdit } from '@/hooks/useInlineNodeTextEdit';
import { InlineTextEditSurface } from '@/components/InlineTextEditSurface';
import { NodeChrome } from '@/components/NodeChrome';
import { resolveNodeVisualStyle } from '@/theme';
import { requestMindmapTopicAction } from '@/hooks/mindmapTopicActionRequest';
import { useFlowStore } from '@/store';
import { getMindmapChildrenById, getMindmapDescendantIds } from '@/lib/mindmapTree';

function MindmapNode({ id, data, selected }: LegacyNodeProps<NodeData>): React.ReactElement {
  const HANDLE_INSET_PX = 8;
  const SOCKET_DOT_SIZE_PX = 8;
  const labelEdit = useInlineNodeTextEdit(id, 'label', data.label || '', { multiline: true });
  const depth = typeof data.mindmapDepth === 'number' ? data.mindmapDepth : 0;
  const side = data.mindmapSide;

  const isRoot = depth === 0;
  const isLeftBranch = side === 'left';
  const inwardSide = isRoot ? null : isLeftBranch ? 'right' : 'left';
  const outwardSide = isRoot ? null : isLeftBranch ? 'left' : 'right';
  const activeColor = data.color || (isRoot ? 'slate' : 'white');
  const activeColorMode = data.colorMode || (isRoot ? 'filled' : 'subtle');
  const visualStyle = resolveNodeVisualStyle(activeColor, activeColorMode, data.customColor);
  const setNodes = useFlowStore((state) => state.setNodes);
  const setEdges = useFlowStore((state) => state.setEdges);
  const { childCount, hiddenDescendantCount } = useFlowStore((state) => {
    const childrenById = getMindmapChildrenById(state.nodes, state.edges);
    return {
      childCount: (childrenById.get(id) ?? []).length,
      hiddenDescendantCount: getMindmapDescendantIds(id, childrenById).size,
    };
  });
  const isCollapsed = data.mindmapCollapsed === true;
  const branchHandles = [
    { id: 'left', position: Position.Left, side: 'left' as const },
    { id: 'right', position: Position.Right, side: 'right' as const },
  ];
  const handleStyleExtras = {
    left: {
      left: `${HANDLE_INSET_PX}px`,
      transform: 'translate(-50%, -50%)',
    },
    right: {
      left: `calc(100% - ${HANDLE_INSET_PX}px)`,
      transform: 'translate(-50%, -50%)',
    },
  } as const;
  const affordanceVisibilityClass = selected
    ? 'opacity-100'
    : 'opacity-0 transition-opacity duration-150 group-hover:opacity-100';
  const containerClass = isRoot
    ? 'rounded-2xl border px-5 py-3 shadow-[0_18px_48px_rgba(15,23,42,0.18)]'
    : 'rounded-full border px-4 py-2 shadow-[0_10px_28px_rgba(15,23,42,0.08)]';
  const alignmentClass = isRoot ? 'text-center' : isLeftBranch ? 'text-right' : 'text-left';
  const requestChildTopic =
    (side: 'left' | 'right' | null) => (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      requestMindmapTopicAction(id, 'child', side);
    };
  const requestSiblingTopic = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    requestMindmapTopicAction(id, 'sibling');
  };
  const toggleCollapsed = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const nextCollapsed = !isCollapsed;
    const { nodes: currentNodes, edges: currentEdges } = useFlowStore.getState();
    const currentChildrenById = getMindmapChildrenById(currentNodes, currentEdges);
    const descendantIds = getMindmapDescendantIds(id, currentChildrenById);
    setNodes((prev) =>
      prev.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, mindmapCollapsed: nextCollapsed } };
        }
        if (descendantIds.has(node.id)) {
          return { ...node, hidden: nextCollapsed };
        }
        return node;
      })
    );
    setEdges((prev) =>
      prev.map((edge) =>
        descendantIds.has(edge.source) || descendantIds.has(edge.target)
          ? { ...edge, hidden: nextCollapsed }
          : edge
      )
    );
  };

  return (
    <NodeChrome
      selected={Boolean(selected)}
      minWidth={isRoot ? 180 : 140}
      minHeight={isRoot ? 60 : 48}
      handleClassName="!h-5 !w-5 !border-0 !opacity-0"
      handleStyleExtras={handleStyleExtras}
      handles={branchHandles}
    >
      <div
        className={`relative min-w-[140px] max-w-[280px] transition-all ${containerClass}`}
        style={{
          backgroundColor: visualStyle.bg,
          borderColor: visualStyle.border,
          color: visualStyle.text,
        }}
      >
        {childCount > 0 ? (
          <button
            type="button"
            aria-label={isCollapsed ? 'Expand branch' : 'Collapse branch'}
            onClick={toggleCollapsed}
            className={`absolute -bottom-2 left-1/2 z-10 flex h-5 min-w-5 -translate-x-1/2 items-center justify-center rounded-full border bg-white px-1 text-[10px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50 ${selected ? 'opacity-100' : 'opacity-0 transition-opacity duration-150 group-hover:opacity-100'}`}
            style={{ borderColor: visualStyle.border }}
          >
            {isCollapsed ? `+${hiddenDescendantCount}` : '▾'}
          </button>
        ) : null}
        {isRoot ? (
          <>
            <button
              type="button"
              aria-label="Add left topic"
              onClick={requestChildTopic('left')}
              className={`absolute top-1/2 flex h-6 w-6 items-center justify-center rounded-full border bg-white/96 text-xs font-semibold text-slate-500 shadow-sm transition-colors hover:bg-white ${affordanceVisibilityClass}`}
              style={{
                left: `${HANDLE_INSET_PX}px`,
                transform: 'translate(-50%, -50%)',
                borderColor: visualStyle.border,
              }}
            >
              +
            </button>
            <button
              type="button"
              aria-label="Add right topic"
              onClick={requestChildTopic('right')}
              className={`absolute top-1/2 flex h-6 w-6 items-center justify-center rounded-full border bg-white/96 text-xs font-semibold text-slate-500 shadow-sm transition-colors hover:bg-white ${affordanceVisibilityClass}`}
              style={{
                right: `${HANDLE_INSET_PX}px`,
                transform: 'translate(50%, -50%)',
                borderColor: visualStyle.border,
              }}
            >
              +
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              aria-label="Add sibling topic"
              onClick={requestSiblingTopic}
              className={`absolute left-1/2 top-0 flex h-5 w-5 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full border bg-white/96 text-[10px] font-semibold text-slate-500 shadow-sm transition-colors hover:bg-white ${affordanceVisibilityClass}`}
              style={{ borderColor: visualStyle.border }}
            >
              +
            </button>
            <div
              className={`pointer-events-none absolute top-1/2 flex h-3 items-center -translate-y-1/2 ${affordanceVisibilityClass}`}
              style={
                inwardSide === 'left'
                  ? { left: 0, width: `${HANDLE_INSET_PX + SOCKET_DOT_SIZE_PX / 2}px` }
                  : { right: 0, width: `${HANDLE_INSET_PX + SOCKET_DOT_SIZE_PX / 2}px` }
              }
            >
              {inwardSide === 'left' ? (
                <>
                  <div
                    className="h-0.5 flex-1 rounded-full"
                    style={{ backgroundColor: visualStyle.border }}
                  />
                  <div
                    className="rounded-full"
                    style={{
                      width: `${SOCKET_DOT_SIZE_PX}px`,
                      height: `${SOCKET_DOT_SIZE_PX}px`,
                      backgroundColor: visualStyle.border,
                    }}
                  />
                </>
              ) : (
                <>
                  <div
                    className="rounded-full"
                    style={{
                      width: `${SOCKET_DOT_SIZE_PX}px`,
                      height: `${SOCKET_DOT_SIZE_PX}px`,
                      backgroundColor: visualStyle.border,
                    }}
                  />
                  <div
                    className="h-0.5 flex-1 rounded-full"
                    style={{ backgroundColor: visualStyle.border }}
                  />
                </>
              )}
            </div>
            <button
              type="button"
              aria-label="Add child topic"
              onClick={requestChildTopic(outwardSide)}
              className={`absolute top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border bg-white/96 text-[10px] font-semibold text-slate-500 shadow-sm transition-colors hover:bg-white ${outwardSide === 'left' ? '-left-2.5 -translate-x-full' : '-right-2.5 translate-x-full'} ${affordanceVisibilityClass}`}
              style={{ borderColor: visualStyle.border }}
            >
              +
            </button>
          </>
        )}
        <InlineTextEditSurface
          isEditing={labelEdit.isEditing}
          draft={labelEdit.draft}
          displayValue={data.label || (isRoot ? 'Central Topic' : 'Topic')}
          onBeginEdit={labelEdit.beginEdit}
          onDraftChange={labelEdit.setDraft}
          onCommit={labelEdit.commit}
          onKeyDown={labelEdit.handleKeyDown}
          inputMode="multiline"
          className={`block text-sm leading-snug break-words ${alignmentClass} ${isRoot ? 'font-semibold tracking-tight' : 'font-medium'}`}
          inputClassName={isRoot ? 'font-semibold' : 'font-medium'}
          isSelected={Boolean(selected)}
        />
      </div>
    </NodeChrome>
  );
}

export default memo(MindmapNode);
