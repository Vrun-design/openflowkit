import React from 'react';
import MemoizedMarkdown from './MemoizedMarkdown';
import { InlineTextEditSurface } from './InlineTextEditSurface';
import { NamedIcon } from './IconMap';

interface InlineEditState {
  isEditing: boolean;
  draft: string;
  beginEdit: () => void;
  setDraft: (value: string) => void;
  commit: () => void;
  handleKeyDown: React.KeyboardEventHandler;
}

interface CustomNodeContentProps {
  data: {
    label?: string;
    subLabel?: string;
    imageUrl?: string;
  };
  hasIcon: boolean;
  hasSubLabel: boolean;
  resolvedAssetIconUrl: string | null | undefined;
  iconName: string | null;
  iconSizeClassName: string;
  iconImageSizeClassName: string;
  namedIconSizeClassName: string;
  iconBackgroundColor: string;
  iconColor: string;
  textAlignStyle: React.CSSProperties;
  textClassName: string;
  textStyle: React.CSSProperties;
  subTextClassName: string;
  subTextStyle: React.CSSProperties;
  displayLabel: React.ReactNode;
  labelEdit: InlineEditState;
  subLabelEdit: InlineEditState;
  hasLabelSelection: boolean;
  hasSubLabelSelection: boolean;
  lodPreserveClassName: string;
  isCompactNode: boolean;
  isComplexShape: boolean;
  complexShapePaddingClassName: string;
  contentPadding: string;
}

export function CustomNodeContent({
  data,
  hasIcon,
  hasSubLabel,
  resolvedAssetIconUrl,
  iconName,
  iconSizeClassName,
  iconImageSizeClassName,
  namedIconSizeClassName,
  iconBackgroundColor,
  iconColor,
  textAlignStyle,
  textClassName,
  textStyle,
  subTextClassName,
  subTextStyle,
  displayLabel,
  labelEdit,
  subLabelEdit,
  hasLabelSelection,
  hasSubLabelSelection,
  lodPreserveClassName,
  isCompactNode,
  isComplexShape,
  complexShapePaddingClassName,
  contentPadding,
}: CustomNodeContentProps): React.ReactElement {
  return (
    <div
      className={`relative z-10 h-full w-full min-h-0 p-4 flex flex-col items-center justify-center ${isCompactNode ? 'gap-1.5' : 'gap-2'} ${isComplexShape ? complexShapePaddingClassName : ''}`}
      style={!isComplexShape ? { padding: contentPadding } : undefined}
    >
      {hasIcon ? (
        <div
          className={`flex items-center gap-1.5 shrink-0 flow-lod-far-target flow-lod-far-flex-target ${lodPreserveClassName}`}
        >
          {resolvedAssetIconUrl ? (
            <div
              className={`shrink-0 ${iconSizeClassName} rounded-lg flex items-center justify-center border border-black/5 shadow-sm overflow-hidden flow-lod-shadow`}
              style={{ backgroundColor: iconBackgroundColor }}
            >
              <img
                src={resolvedAssetIconUrl}
                alt="icon"
                className={`${iconImageSizeClassName} object-contain`}
              />
            </div>
          ) : null}
          {iconName ? (
            <div
              className={`shrink-0 ${iconSizeClassName} rounded-lg flex items-center justify-center border border-black/5 shadow-sm flow-lod-shadow`}
              style={{ backgroundColor: iconBackgroundColor }}
            >
              <NamedIcon
                name={iconName}
                fallbackName="Settings"
                className={namedIconSizeClassName}
                style={{ color: iconColor }}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        className="flex flex-col min-w-0 max-w-full w-full overflow-hidden"
        style={textAlignStyle}
      >
        <InlineTextEditSurface
          isEditing={labelEdit.isEditing}
          draft={labelEdit.draft}
          displayValue={displayLabel}
          onBeginEdit={labelEdit.beginEdit}
          onDraftChange={labelEdit.setDraft}
          onCommit={labelEdit.commit}
          onKeyDown={labelEdit.handleKeyDown}
          className={textClassName}
          style={textStyle}
          inputMode="multiline"
          inputClassName="text-center"
          isSelected={hasLabelSelection}
        />
        {hasSubLabel ? (
          <InlineTextEditSurface
            isEditing={subLabelEdit.isEditing}
            draft={subLabelEdit.draft}
            displayValue={<MemoizedMarkdown content={data.subLabel} />}
            onBeginEdit={subLabelEdit.beginEdit}
            onDraftChange={subLabelEdit.setDraft}
            onCommit={subLabelEdit.commit}
            onKeyDown={subLabelEdit.handleKeyDown}
            className={subTextClassName}
            style={subTextStyle}
            inputClassName="text-center"
            isSelected={hasSubLabelSelection}
          />
        ) : null}
      </div>

      {data.imageUrl ? (
        <div className="w-full mt-3 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flow-lod-far-target">
          <img
            src={data.imageUrl}
            alt="attachment"
            className="w-full h-auto max-h-[200px] object-cover"
          />
        </div>
      ) : null}
    </div>
  );
}
