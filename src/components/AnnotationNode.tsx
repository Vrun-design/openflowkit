import React, { Suspense, lazy, memo } from 'react';
import type { LegacyNodeProps } from '@/lib/reactflowCompat';
import type { NodeData } from '@/lib/types';
import { useTranslation } from 'react-i18next';
import { useInlineNodeTextEdit } from '@/hooks/useInlineNodeTextEdit';
import { InlineTextEditSurface } from './InlineTextEditSurface';
import { NodeChrome } from './NodeChrome';
import { hasMarkdownSyntax } from './markdownSyntax';
import { useFlowStore } from '@/store';
import { ANNOTATION_COLOR_OPTIONS, resolveAnnotationTheme } from './annotationTheme';
import { resolveSharedColorKey } from '@/theme';

const LazyMarkdownRenderer = lazy(async () => {
  const module = await import('./MarkdownRenderer');
  return { default: module.MarkdownRenderer };
});

function AnnotationNode({ id, data, selected }: LegacyNodeProps<NodeData>): React.ReactElement {
  const { t } = useTranslation();
  const setNodes = useFlowStore((state) => state.setNodes);
  const labelEdit = useInlineNodeTextEdit(id, 'label', data.label || '');
  const subLabelEdit = useInlineNodeTextEdit(id, 'subLabel', data.subLabel || '', {
    multiline: true,
    allowTabCreateSibling: false,
  });
  const annotationTheme = resolveAnnotationTheme(data.color, data.customColor);
  const selectedColorKey = resolveSharedColorKey(data.color, 'yellow');
  const lineCount = (data.subLabel || '').split('\n').length;
  const contentMinHeight = Math.max(100, 84 + lineCount * 18);
  const subLabelContent = data.subLabel || t('annotationNode.placeholder');
  const renderedSubLabel = hasMarkdownSyntax(subLabelContent) ? (
    <Suspense fallback={<span className="whitespace-pre-wrap break-words">{subLabelContent}</span>}>
      <LazyMarkdownRenderer content={subLabelContent} />
    </Suspense>
  ) : (
    <span className="whitespace-pre-wrap break-words">{subLabelContent}</span>
  );
  return (
    <NodeChrome
      nodeId={id}
      selected={Boolean(selected)}
      minWidth={150}
      minHeight={100}
      handleClassName="!w-3 !h-3 !border-2 !border-white transition-all duration-150 hover:scale-125"
      handleVisibilityOptions={{ includeConnectingState: false }}
    >
      <div
        className={`
          relative group flex flex-col shadow-md flow-lod-shadow rounded-br-3xl rounded-tl-sm rounded-tr-sm rounded-bl-sm border transition-all duration-200
          ${selected ? 'z-10' : 'hover:shadow-lg'}
        `}
        style={{
          minWidth: 200,
          width: '100%',
          minHeight: contentMinHeight,
          backgroundColor: annotationTheme.containerBg,
          borderColor: annotationTheme.containerBorder,
        }}
      >
        {selected ? (
          <div className="absolute -top-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-2 py-1 shadow-sm">
            {ANNOTATION_COLOR_OPTIONS.map((option) => {
              const optionTheme = resolveAnnotationTheme(option.id);
              return (
              <button
                key={option.id}
                type="button"
                aria-label={`Set annotation color ${option.label}`}
                className={`h-3.5 w-3.5 rounded-full border transition-transform hover:scale-110 ${selectedColorKey === option.id ? 'ring-2 ring-[var(--brand-secondary)]/70' : ''}`}
                style={{
                  backgroundColor: optionTheme.dot,
                  borderColor: selectedColorKey === option.id ? optionTheme.titleBorder : 'var(--brand-surface)',
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  setNodes((nodes) =>
                    nodes.map((node) =>
                      node.id === id ? { ...node, data: { ...node.data, color: option.id } } : node
                    )
                  );
                }}
              />
              );
            })}
          </div>
        ) : null}
        <div className="p-4 flex flex-col">
          {data.label && (
            <InlineTextEditSurface
              isEditing={labelEdit.isEditing}
              draft={labelEdit.draft}
              displayValue={data.label}
              onBeginEdit={labelEdit.beginEdit}
              onDraftChange={labelEdit.setDraft}
              onCommit={labelEdit.commit}
              onKeyDown={labelEdit.handleKeyDown}
              className="mb-2 border-b pb-2 text-sm font-bold"
              style={{
                color: annotationTheme.titleText,
                borderColor: annotationTheme.titleBorder,
              }}
              isSelected={Boolean(selected)}
            />
          )}
          <InlineTextEditSurface
            isEditing={subLabelEdit.isEditing}
            draft={subLabelEdit.draft}
            displayValue={renderedSubLabel}
            onBeginEdit={subLabelEdit.beginEdit}
            onDraftChange={subLabelEdit.setDraft}
            onCommit={subLabelEdit.commit}
            onKeyDown={subLabelEdit.handleKeyDown}
            className="text-xs font-medium leading-relaxed markdown-content flow-lod-secondary"
            style={{ color: annotationTheme.bodyText }}
            inputMode="multiline"
            isSelected={Boolean(selected)}
          />
        </div>

        {/* Decorative corner fold */}
        <div
          className="absolute bottom-0 right-0 h-8 w-8 rounded-tl-xl border-l border-t"
          style={{
            backgroundColor: annotationTheme.foldBg,
            borderColor: annotationTheme.foldBorder,
          }}
        ></div>
      </div>
    </NodeChrome>
  );
}

export default memo(AnnotationNode);
