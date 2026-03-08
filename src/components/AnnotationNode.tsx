import React, { Suspense, lazy, memo } from 'react';
import type { LegacyNodeProps } from '@/lib/reactflowCompat';
import type { NodeData } from '@/lib/types';
import { useTranslation } from 'react-i18next';
import { useInlineNodeTextEdit } from '@/hooks/useInlineNodeTextEdit';
import { InlineTextEditSurface } from './InlineTextEditSurface';
import { NodeChrome } from './NodeChrome';
import { hasMarkdownSyntax } from './markdownSyntax';

const LazyMarkdownRenderer = lazy(async () => {
  const module = await import('./MarkdownRenderer');
  return { default: module.MarkdownRenderer };
});

function AnnotationNode({ id, data, selected }: LegacyNodeProps<NodeData>): React.ReactElement {
  const { t } = useTranslation();
  const labelEdit = useInlineNodeTextEdit(id, 'label', data.label || '');
  const subLabelEdit = useInlineNodeTextEdit(id, 'subLabel', data.subLabel || '', {
    multiline: true,
    allowTabCreateSibling: false,
  });
  const subLabelContent = data.subLabel || t('annotationNode.placeholder');
  const renderedSubLabel = hasMarkdownSyntax(subLabelContent)
    ? (
        <Suspense fallback={<span className="whitespace-pre-wrap break-words">{subLabelContent}</span>}>
          <LazyMarkdownRenderer content={subLabelContent} />
        </Suspense>
      )
    : <span className="whitespace-pre-wrap break-words">{subLabelContent}</span>;
  return (
    <NodeChrome
      selected={Boolean(selected)}
      minWidth={150}
      minHeight={100}
      handleClassName="!w-3 !h-3 !border-2 !border-white transition-all duration-150 hover:scale-125"
      handleVisibilityOptions={{ includeConnectingState: false }}
    >
      <div
        className={`
          relative group flex flex-col h-full shadow-md flow-lod-shadow rounded-br-3xl rounded-tl-sm rounded-tr-sm rounded-bl-sm border border-yellow-300 transition-all duration-200
          bg-yellow-100/90
          ${selected ? 'z-10' : 'hover:shadow-lg'}
        `}
        style={{ minWidth: 200, width: '100%', height: '100%' }}
      >
        <div className="p-4 flex flex-col h-full">
            {data.label && (
                <InlineTextEditSurface
                    isEditing={labelEdit.isEditing}
                    draft={labelEdit.draft}
                    displayValue={data.label}
                    onBeginEdit={labelEdit.beginEdit}
                    onDraftChange={labelEdit.setDraft}
                    onCommit={labelEdit.commit}
                    onKeyDown={labelEdit.handleKeyDown}
                    className="text-sm font-bold text-yellow-900 border-b border-yellow-200 pb-2 mb-2"
                    inputClassName="text-yellow-900"
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
                className="text-xs text-yellow-800 font-medium leading-relaxed markdown-content flex-1 overflow-hidden flow-lod-secondary"
                inputClassName="text-yellow-800"
                inputMode="multiline"
                isSelected={Boolean(selected)}
            />
        </div>

        {/* Decorative corner fold */}
        <div className="absolute bottom-0 right-0 w-8 h-8 bg-yellow-200/50 rounded-tl-xl border-t border-l border-yellow-300/30"></div>
      </div>
    </NodeChrome>
  );
}

export default memo(AnnotationNode);
