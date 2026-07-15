import React, { memo } from 'react';
import type { LegacyNodeProps } from '@/lib/reactflowCompat';
import type { NodeData } from '@/lib/types';

import MemoizedMarkdown from './MemoizedMarkdown';
import { resolveNodeVisualStyle } from '../theme';
import { useDesignSystem } from '../hooks/useDesignSystem';
import { useInlineNodeTextEdit } from '@/hooks/useInlineNodeTextEdit';
import { getTransformDiagnosticsAttrs } from './transformDiagnostics';
import { NodeChrome } from './NodeChrome';
import { NodeTransformControls } from './NodeTransformControls';
import { useActiveNodeSelection } from './useActiveNodeSelection';
import { useTranslation } from 'react-i18next';
import { useProviderShapePreview } from '@/hooks/useProviderShapePreview';
import { useResolvedMediaUrl } from '@/hooks/useResolvedMediaUrl';
import { useShiftHeld } from '@/hooks/useShiftHeld';
import { NodeShapeSVG } from './NodeShapeSVG';
import { DiffBadge, LintViolationBadge } from './NodeBadges';
import { IconAssetNodeBody } from './IconAssetNodeBody';
import { CustomNodeContent } from './CustomNodeContent';
import { readMermaidImportedNodeMetadataFromData } from '@/services/mermaid/importProvenance';
import {
  type NodeShape,
  COMPLEX_SHAPES,
  FONT_FAMILY_MAP,
  NEEDS_SQUARE_ASPECT,
  COMPLEX_SHAPE_PADDING,
  getNodeDefaults,
  getNumericNodeDimension,
  getMinNodeSize,
  toCssSize,
  getNodeBorderRadius,
  fontSizeClassFor,
} from './nodeHelpers';

function getMermaidImportedFontSize(nodeHeightPx: number | undefined): number {
  if (typeof nodeHeightPx !== 'number') {
    return 15;
  }

  if (nodeHeightPx <= 56) {
    return 14;
  }

  if (nodeHeightPx >= 96) {
    return 16;
  }

  return 15;
}

function getMermaidImportedContentPadding(nodeHeightPx: number | undefined): string {
  if (typeof nodeHeightPx !== 'number') {
    return '0.6rem 0.75rem';
  }

  if (nodeHeightPx <= 40) {
    return '0.4rem 0.6rem';
  }

  if (nodeHeightPx <= 60) {
    return '0.5rem 0.7rem';
  }

  return '0.65rem 0.9rem';
}

function CustomNode(props: LegacyNodeProps<NodeData>): React.ReactElement {
  const { id, data, type, selected } = props;
  const explicitNodeStyle = (props as { style?: React.CSSProperties }).style;
  const explicitWidth = data.width ?? explicitNodeStyle?.width;
  const explicitHeight = data.height ?? explicitNodeStyle?.height;
  const explicitWidthPx = getNumericNodeDimension(explicitWidth);
  const explicitHeightPx = getNumericNodeDimension(explicitHeight);
  const measuredHeight = (props as { height?: number }).height;
  const shiftHeld = useShiftHeld(Boolean(selected));
  const resolvedUploadedIconUrl = useResolvedMediaUrl(data, 'image');
  const resolvedCustomIconUrl = useResolvedMediaUrl(data, 'icon');
  const resolvedAssetIconUrl = useProviderShapePreview(
    typeof data.archIconPackId === 'string' ? data.archIconPackId : undefined,
    typeof data.archIconShapeId === 'string' ? data.archIconShapeId : undefined,
    resolvedCustomIconUrl
  );
  const designSystem = useDesignSystem();
  const isActiveSelected = useActiveNodeSelection(Boolean(selected));
  const { t } = useTranslation();

  const defaults = getNodeDefaults(type || 'process');
  const activeColor = data.color || defaults.color;
  const activeColorMode = data.colorMode || 'subtle';
  const activeIconKey = data.icon === 'none' ? null : data.icon || defaults.icon;
  const activeShape = (data.shape || defaults.shape || 'rounded') as NodeShape;
  const visualStyle = resolveNodeVisualStyle(activeColor, activeColorMode, data.customColor);
  const iconName = resolvedAssetIconUrl || !activeIconKey ? null : activeIconKey;
  const labelFontFamilyClass = data.fontFamily ? FONT_FAMILY_MAP[data.fontFamily] : '';
  const labelFontFamilyStyle = !data.fontFamily
    ? { fontFamily: designSystem.typography.fontFamily }
    : {};
  const subLabelFontFamily = data.subLabelFontFamily || data.fontFamily;
  const subLabelFontFamilyClass = subLabelFontFamily ? FONT_FAMILY_MAP[subLabelFontFamily] : '';
  const subLabelFontFamilyStyle = !subLabelFontFamily
    ? { fontFamily: designSystem.typography.fontFamily }
    : {};
  const fontSize = data.fontSize || '13';
  const isNumericSize = !isNaN(Number(fontSize));
  const fSizeClass = fontSizeClassFor(fontSize);
  const fontSizeStyle = isNumericSize ? { fontSize: fontSize + 'px' } : {};
  const subLabelFontSize = data.subLabelFontSize || '10';
  const subLabelIsNumericSize = !isNaN(Number(subLabelFontSize));
  const subLabelSizeClass = fontSizeClassFor(subLabelFontSize);
  const subLabelFontSizeStyle = subLabelIsNumericSize ? { fontSize: subLabelFontSize + 'px' } : {};
  const hasProviderIcon = Boolean(resolvedAssetIconUrl) || Boolean(data.archIconPackId);
  const hasIcon =
    Boolean(iconName)
    || Boolean(data.customIconUrl)
    || Boolean(data.iconAssetId)
    || Boolean(resolvedCustomIconUrl)
    || hasProviderIcon;
  const hasLabel = Boolean(data.label?.trim());
  const hasSubLabel = Boolean(data.subLabel);
  const mermaidImportedNodeMetadata = readMermaidImportedNodeMetadataFromData(data);
  const isMermaidImportedLeaf = mermaidImportedNodeMetadata?.role === 'leaf';
  const isComplexShape = COMPLEX_SHAPES.includes(activeShape);
  const { minWidth: baseMinWidth, minHeight: baseMinHeight } = getMinNodeSize(activeShape);
  const contentMinHeight = !isComplexShape
    ? hasIcon && hasSubLabel
      ? 128
      : hasIcon
        ? 108
        : hasSubLabel
          ? 96
          : 84
    : baseMinHeight;
  const minWidth = isMermaidImportedLeaf ? explicitWidthPx ?? baseMinWidth : baseMinWidth;
  const effectiveMinHeight = isMermaidImportedLeaf
    ? explicitHeightPx ?? baseMinHeight
    : Math.max(baseMinHeight, contentMinHeight);
  const nodeHeightPx = typeof measuredHeight === 'number' ? measuredHeight : explicitHeightPx;
  const isCompactNode = typeof nodeHeightPx === 'number' && nodeHeightPx < effectiveMinHeight + 8;
  const contentPadding = isMermaidImportedLeaf
    ? getMermaidImportedContentPadding(nodeHeightPx)
    : isCompactNode
      ? '0.5rem'
      : designSystem.components.node.padding;
  const labelEdit = useInlineNodeTextEdit(id, 'label', data.label || '', { multiline: true });
  const subLabelEdit = useInlineNodeTextEdit(id, 'subLabel', data.subLabel || '');
  const connectionHandleClass =
    '!w-2.5 !h-2.5 !border-2 !border-white transition-all duration-150 hover:scale-110';
  const emptyLabelPrompt = t('nodes.addText', 'Add text');
  const showEmptyLabelPrompt = !hasLabel && isActiveSelected;
  const lodPreserveClass = isActiveSelected ? 'flow-lod-preserve' : '';
  const isIconAssetNode =
    data.assetPresentation === 'icon' &&
    (Boolean(resolvedAssetIconUrl) || Boolean(activeIconKey) || Boolean(data.archIconPackId));

  const labelDisplayValue = hasLabel
    ? isMermaidImportedLeaf
      ? <span className="block whitespace-pre-wrap break-words">{data.label}</span>
      : <MemoizedMarkdown content={data.label} />
    : showEmptyLabelPrompt
      ? <span className="text-slate-400/80">{emptyLabelPrompt}</span>
      : null;

  const needsSquareAspect = NEEDS_SQUARE_ASPECT.has(activeShape);
  const selectionRing =
    isActiveSelected && !isComplexShape ? `, 0 0 0 2px var(--brand-primary, #e95420)` : '';
  const animateIn = data.freshlyAdded === true;
  const containerStyle: React.CSSProperties = {
    minWidth,
    minHeight: effectiveMinHeight,
    width: toCssSize(explicitWidth) ?? '100%',
    height: toCssSize(explicitHeight),
    ...(needsSquareAspect ? { aspectRatio: '1/1' } : {}),
    ...labelFontFamilyStyle,
    boxShadow: !isComplexShape
      ? `${designSystem.components.node.boxShadow}${selectionRing}`
      : 'none',
    borderWidth: !isComplexShape ? designSystem.components.node.borderWidth : 0,
    padding: 0,
    borderRadius: getNodeBorderRadius(
      isComplexShape,
      activeShape,
      designSystem.components.node.borderRadius
    ),
    backgroundColor: !isComplexShape ? visualStyle.bg : undefined,
    borderColor: !isComplexShape ? visualStyle.border : undefined,
    ...(animateIn
      ? { animation: `nodeAnimateIn 180ms ease-out ${data.animateDelay ?? 0}ms both` }
      : {}),
  };

  if (isIconAssetNode) {
    return (
      <IconAssetNodeBody
        nodeId={id}
        selected={Boolean(selected)}
        connectionHandleClass={connectionHandleClass}
        explicitWidth={explicitWidth}
        nodeHeightPx={nodeHeightPx}
        hasLabel={hasLabel}
        resolvedAssetIconUrl={resolvedAssetIconUrl}
        activeIconKey={activeIconKey}
        label={data.label}
        isActiveSelected={isActiveSelected}
        labelEdit={labelEdit}
      />
    );
  }

  const importedFontFamilyStyle =
    isMermaidImportedLeaf && !data.fontFamily
      ? { fontFamily: designSystem.typography.fontFamily }
      : {};
  const importedFontSizeStyle =
    !data.fontSize && isMermaidImportedLeaf
      ? { fontSize: `${getMermaidImportedFontSize(nodeHeightPx)}px` }
      : {};
  const textProps = {
    ...fontSizeStyle,
    ...importedFontSizeStyle,
    ...labelFontFamilyStyle,
    ...importedFontFamilyStyle,
    color: visualStyle.text,
    fontWeight: data.fontWeight || (isMermaidImportedLeaf ? '500' : '600'),
    fontStyle: data.fontStyle || 'normal',
    lineHeight: isMermaidImportedLeaf ? 1.1 : 1.2,
  };
  const subTextProps = {
    ...subLabelFontSizeStyle,
    ...subLabelFontFamilyStyle,
    color: visualStyle.subText,
    fontWeight: data.subLabelFontWeight || 'normal',
    fontStyle: data.subLabelFontStyle || 'normal',
    textAlign: (data.align || 'center') as React.CSSProperties['textAlign'],
    opacity: 0.85,
    lineHeight: 1.25,
  };
  const textAlignStyle = {
    textAlign: (data.align || 'center') as React.CSSProperties['textAlign'],
  };
  const iconSize = isCompactNode ? 'w-7 h-7' : 'w-8 h-8';
  const iconImgSize = isCompactNode ? 'w-4 h-4' : 'w-5 h-5';
  const namedIconSize = isCompactNode ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const ariaLabelParts = [
    `${type || 'process'} node`,
    hasLabel ? String(data.label).trim() : emptyLabelPrompt,
    hasSubLabel ? String(data.subLabel).trim() : null,
    isActiveSelected ? 'selected' : null,
  ].filter(Boolean);
  const nodeAriaLabel = ariaLabelParts.join(', ');

  return (
    <>
      <NodeTransformControls
        isVisible={Boolean(selected)}
        minWidth={minWidth}
        minHeight={effectiveMinHeight}
        keepAspectRatio={shiftHeld || needsSquareAspect}
      />
      <NodeChrome
        nodeId={id}
        selected={Boolean(selected)}
        minWidth={minWidth}
        minHeight={effectiveMinHeight}
        keepAspectRatio={shiftHeld || needsSquareAspect}
        handleClassName={connectionHandleClass}
      >
        <div
          role="group"
          aria-roledescription="canvas node"
          aria-label={nodeAriaLabel}
          className={`relative group flex flex-col justify-center h-full border transition-all duration-200 flow-lod-shadow ${isComplexShape ? 'overflow-hidden' : 'overflow-visible'}`}
          style={containerStyle}
          {...getTransformDiagnosticsAttrs({
            nodeFamily: 'custom',
            selected: Boolean(selected),
            compact: isCompactNode,
            minHeight: effectiveMinHeight,
            actualHeight: nodeHeightPx,
            hasIcon,
            hasSubLabel,
          })}
        >
          <DiffBadge nodeId={id} />
          <LintViolationBadge nodeId={id} />

          {isComplexShape && (
            <div className="absolute inset-0 w-full h-full z-0 flex items-center justify-center">
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="xMidYMid meet"
                className="w-full h-full overflow-visible drop-shadow-sm"
              >
                <NodeShapeSVG
                  shape={activeShape}
                  fill={visualStyle.bg}
                  stroke={visualStyle.border}
                  strokeWidth={designSystem.components.edge.strokeWidth || '2'}
                />
              </svg>
            </div>
          )}

          <CustomNodeContent
            data={{
              ...data,
              imageUrl: resolvedUploadedIconUrl ?? data.imageUrl,
            }}
            hasIcon={hasIcon}
            hasSubLabel={hasSubLabel}
            resolvedAssetIconUrl={resolvedAssetIconUrl}
            iconName={iconName}
            iconSizeClassName={iconSize}
            iconImageSizeClassName={iconImgSize}
            namedIconSizeClassName={namedIconSize}
            iconBackgroundColor={visualStyle.iconBg}
            iconColor={visualStyle.iconColor}
            textAlignStyle={textAlignStyle}
            textClassName={`leading-tight block break-words markdown-content [&_p]:m-0 [&_p]:leading-tight ${fSizeClass} ${labelFontFamilyClass}`}
            textStyle={textProps}
            subTextClassName={`text-slate-500 mt-1 leading-snug markdown-content [&_p]:m-0 [&_p]:leading-snug break-words flow-lod-secondary ${lodPreserveClass} ${subLabelSizeClass} ${subLabelFontFamilyClass}`}
            subTextStyle={subTextProps}
            displayLabel={labelDisplayValue}
            labelEdit={labelEdit}
            subLabelEdit={subLabelEdit}
            hasLabelSelection={isActiveSelected}
            hasSubLabelSelection={Boolean(selected)}
            lodPreserveClassName={lodPreserveClass}
            isCompactNode={isCompactNode}
            isComplexShape={isComplexShape}
            complexShapePaddingClassName={COMPLEX_SHAPE_PADDING[activeShape] ?? ''}
            contentPadding={contentPadding}
          />
        </div>
      </NodeChrome>
    </>
  );
}

export default memo(CustomNode);
