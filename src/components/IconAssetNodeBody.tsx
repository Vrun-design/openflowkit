import React from 'react';
import { NodeChrome } from './NodeChrome';
import { InlineTextEditSurface } from './InlineTextEditSurface';
import MemoizedMarkdown from './MemoizedMarkdown';
import { NamedIcon } from './IconMap';
import { getTransformDiagnosticsAttrs } from './transformDiagnostics';

interface InlineEditLike {
  isEditing: boolean;
  draft: string;
  beginEdit: () => void;
  setDraft: (v: string) => void;
  commit: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
}

interface IconAssetNodeBodyProps {
  nodeId: string;
  selected: boolean;
  connectionHandleClass: string;
  explicitWidth: number | string | undefined;
  nodeHeightPx: number | undefined;
  hasLabel: boolean;
  resolvedAssetIconUrl: string | null;
  activeIconKey: string | null;
  label: string | undefined;
  isActiveSelected: boolean;
  labelEdit: InlineEditLike;
}

function toCssSize(value: number | string | undefined): string | undefined {
  if (value === undefined || value === null) return undefined;
  return typeof value === 'number' ? `${value}px` : value;
}

/** Renders the compact icon-first presentation used for architecture asset nodes. */
export function IconAssetNodeBody({
  nodeId,
  selected,
  connectionHandleClass,
  explicitWidth,
  nodeHeightPx,
  hasLabel,
  resolvedAssetIconUrl,
  activeIconKey,
  label,
  isActiveSelected,
  labelEdit,
}: IconAssetNodeBodyProps): React.ReactElement {
  const iconFrameSize = 72;
  const iconHandleStyleExtras = { left: { top: 42 }, right: { top: 42 } };
  const minWidth = hasLabel ? 116 : 96;
  const minHeight = hasLabel ? 118 : 88;

  return (
    <>
      <NodeChrome
        nodeId={nodeId}
        selected={selected}
        minWidth={minWidth}
        minHeight={minHeight}
        keepAspectRatio={false}
        showQuickCreateButtons={false}
        handleClassName={connectionHandleClass}
        handleStyleExtras={iconHandleStyleExtras}
      >
        <div
          className="inline-flex min-w-[96px] max-w-[128px] flex-col items-center justify-start gap-2.5 bg-transparent px-2 py-1"
          style={{ width: toCssSize(explicitWidth) ?? `${Math.max(minWidth, 116)}px` }}
          {...getTransformDiagnosticsAttrs({
            nodeFamily: 'custom',
            selected,
            compact: false,
            minHeight,
            actualHeight: nodeHeightPx,
            hasIcon: true,
            hasSubLabel: false,
          })}
        >
          <div
            className="flex items-center justify-center overflow-visible"
            style={{ width: iconFrameSize, height: iconFrameSize }}
          >
            {resolvedAssetIconUrl ? (
              <img
                src={resolvedAssetIconUrl}
                alt={typeof label === 'string' ? label : 'icon'}
                className="h-full w-full object-contain"
              />
            ) : activeIconKey ? (
              <div className="flex h-full w-full items-center justify-center rounded-2xl bg-[var(--brand-background)] text-[var(--brand-text)]">
                <NamedIcon name={activeIconKey} fallbackName="Box" className="h-10 w-10" />
              </div>
            ) : null}
          </div>
          {hasLabel ? (
            <InlineTextEditSurface
              isEditing={labelEdit.isEditing}
              draft={labelEdit.draft}
              displayValue={<MemoizedMarkdown content={label} />}
              onBeginEdit={labelEdit.beginEdit}
              onDraftChange={labelEdit.setDraft}
              onCommit={labelEdit.commit}
              onKeyDown={labelEdit.handleKeyDown}
              className="block max-w-full break-words px-1 text-center text-sm font-semibold leading-tight markdown-content [&_p]:m-0"
              style={{ color: 'var(--brand-text)' }}
              inputMode="multiline"
              inputClassName="text-center"
              isSelected={isActiveSelected}
            />
          ) : null}
        </div>
      </NodeChrome>
    </>
  );
}
