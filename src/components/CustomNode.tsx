import React, { memo, useEffect, useState } from 'react';
import { Handle, Position } from '@/lib/reactflowCompat';
import type { LegacyNodeProps } from '@/lib/reactflowCompat';
import type { NodeData } from '@/lib/types';

import { NamedIcon } from './IconMap';
import MemoizedMarkdown from './MemoizedMarkdown';
import { resolveNodeVisualStyle } from '../theme';
import { useDesignSystem } from '../hooks/useDesignSystem';
import { useInlineNodeTextEdit } from '@/hooks/useInlineNodeTextEdit';
import { ROLLOUT_FLAGS } from '@/config/rolloutFlags';
import { getTransformDiagnosticsAttrs } from './transformDiagnostics';
import { InlineTextEditSurface } from './InlineTextEditSurface';
import { NodeChrome } from './NodeChrome';
import { NodeTransformControls } from './NodeTransformControls';
import { useActiveNodeSelection } from './useActiveNodeSelection';
import { useTranslation } from 'react-i18next';

type NodeShape = NonNullable<NodeData['shape']>;

const COMPLEX_SHAPES: NodeShape[] = ['diamond', 'hexagon', 'parallelogram', 'cylinder', 'circle', 'ellipse'];

function getDefaults(type: string): { color: string; icon: string | null; shape: NodeShape } {
  switch (type) {
    case 'start': return { color: 'emerald', icon: null, shape: 'rounded' };
    case 'end': return { color: 'red', icon: null, shape: 'rounded' };
    case 'decision': return { color: 'amber', icon: null, shape: 'diamond' };
    case 'annotation': return { color: 'yellow', icon: null, shape: 'rounded' };
    case 'custom': return { color: 'white', icon: null, shape: 'rounded' };
    default: return { color: 'white', icon: null, shape: 'rounded' };
  }
}

function getMinNodeSize(shape: NodeData['shape'] | undefined): { minWidth: number; minHeight: number } {
  // Square-aspect shapes: start at a square so they look geometrically correct.
  if (shape === 'circle' || shape === 'ellipse') {
    return { minWidth: 120, minHeight: 120 };
  }
  if (shape === 'diamond' || shape === 'hexagon') {
    return { minWidth: 140, minHeight: 140 };
  }
  if (shape === 'parallelogram' || shape === 'cylinder') {
    return { minWidth: 140, minHeight: 80 };
  }
  return { minWidth: 120, minHeight: 60 };
}

function toCssSize(value: number | string | undefined): string | undefined {
  if (value === undefined || value === null) return undefined;
  return typeof value === 'number' ? `${value}px` : value;
}

/** Lightweight Shift-key watcher — mounts only while a node is selected. */
function ShiftKeyResizeWatcher({ onShiftChange }: { onShiftChange: (held: boolean) => void }): null {
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Shift') onShiftChange(true); };
    const up = (e: KeyboardEvent) => { if (e.key === 'Shift') onShiftChange(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [onShiftChange]);
  return null;
}

function CustomNode(props: LegacyNodeProps<NodeData>): React.ReactElement {
  const { id, data, type, selected } = props;
  const explicitNodeStyle = (props as { style?: React.CSSProperties }).style;
  const explicitWidth = data.width ?? explicitNodeStyle?.width;
  const explicitHeight = data.height ?? explicitNodeStyle?.height;
  const measuredHeight = (props as { height?: number }).height;
  const [shiftHeld, setShiftHeld] = useState(false);
  const designSystem = useDesignSystem();
  const isActiveSelected = useActiveNodeSelection(Boolean(selected));
  const { t } = useTranslation();

  const defaults = getDefaults(type || 'process');
  const activeColor = data.color || defaults.color;
  const activeColorMode = data.colorMode || 'subtle';
  const activeIconKey = data.icon === 'none' ? null : (data.icon || defaults.icon);
  const activeShape = data.shape || defaults.shape || 'rounded';
  const visualQualityV2Enabled = ROLLOUT_FLAGS.visualQualityV2;
  const visualStyle = resolveNodeVisualStyle(activeColor, activeColorMode, data.customColor);

  // Resolve icons
  const iconName = data.customIconUrl || !activeIconKey ? null : activeIconKey;

  // Typography
  const fontFamilyMap: Record<string, string> = {
    inter: 'font-inter', roboto: 'font-roboto', outfit: 'font-outfit',
    playfair: 'font-playfair', fira: 'font-fira', sans: 'font-sans',
    serif: 'font-serif', mono: 'font-mono',
  };

  const fontFamilyClass = data.fontFamily ? fontFamilyMap[data.fontFamily] : '';
  const fontFamilyStyle = !data.fontFamily ? { fontFamily: designSystem.typography.fontFamily } : {};

  const fontSize = data.fontSize || (visualQualityV2Enabled ? '13' : '14');
  const isNumericSize = !isNaN(Number(fontSize));

  let fontSizeClass = '';
  if (!isNumericSize) {
    switch (fontSize) {
      case 'small':
        fontSizeClass = 'text-xs';
        break;
      case 'medium':
        fontSizeClass = 'text-sm';
        break;
      case 'large':
        fontSizeClass = 'text-base';
        break;
      default:
        fontSizeClass = 'text-lg';
        break;
    }
  }
  const fontSizeStyle = isNumericSize ? { fontSize: fontSize + 'px' } : {};

  const hasIcon = Boolean(iconName) || Boolean(data.customIconUrl);
  const hasLabel = Boolean(data.label?.trim());
  const hasSubLabel = Boolean(data.subLabel);

  // -- Shape Rendering Logic -- //
  function getShapeSVG(): React.ReactElement | null {
    const strokeColor = visualStyle.border;
    const fillColor = visualStyle.bg;

    const commonProps = {
      stroke: strokeColor,
      strokeWidth: designSystem.components.edge.strokeWidth || "2", // Use DS edge width or default
      vectorEffect: "non-scaling-stroke",
      fill: fillColor
    };

    switch (activeShape) {
      case 'diamond':
        return <polygon points="50,0 100,50 50,100 0,50" {...commonProps} />;
      case 'hexagon':
        return <polygon points="15,0 85,0 100,50 85,100 15,100 0,50" {...commonProps} />;
      case 'parallelogram':
        return <polygon points="15,0 100,0 85,100 0,100" {...commonProps} />;
      case 'cylinder':
        return (
          <>
            <path d="M0,15 L0,85 Q0,100 50,100 Q100,100 100,85 L100,15 Q100,0 50,0 Q0,0 0,15 Z" {...commonProps} />
            <ellipse cx="50" cy="15" rx="50" ry="15" stroke={strokeColor} strokeWidth="2" vectorEffect="non-scaling-stroke" fill={fillColor} fillOpacity={0.5} />
          </>
        );
      case 'circle':
        return <circle cx="50" cy="50" r="48" {...commonProps} />;
      case 'ellipse':
        return <ellipse cx="50" cy="50" rx="48" ry="48" {...commonProps} />;
      default: return null;
    }
  }

  const isComplexShape = COMPLEX_SHAPES.includes(activeShape);
  const { minWidth, minHeight } = getMinNodeSize(activeShape);
  const contentMinHeight = !isComplexShape
    ? (hasIcon && hasSubLabel ? 128 : hasIcon ? 108 : hasSubLabel ? 96 : 84)
    : minHeight;
  const effectiveMinHeight = Math.max(minHeight, contentMinHeight);
  const nodeHeightPx = typeof measuredHeight === 'number' ? measuredHeight : undefined;
  const isCompactNode = typeof nodeHeightPx === 'number' && nodeHeightPx < effectiveMinHeight + 8;
  const contentPadding = isCompactNode ? '0.5rem' : designSystem.components.node.padding;
  const labelEdit = useInlineNodeTextEdit(id, 'label', data.label || '', { multiline: true });
  const subLabelEdit = useInlineNodeTextEdit(id, 'subLabel', data.subLabel || '');
  const connectionHandleClass = '!w-2.5 !h-2.5 !border-2 !border-white transition-all duration-150 hover:scale-110';
  const emptyLabelPrompt = t('nodes.addText', 'Add text');
  const showEmptyLabelPrompt = !hasLabel && isActiveSelected;
  const lodPreserveClass = isActiveSelected ? 'flow-lod-preserve' : '';
  const labelDisplayValue = hasLabel
    ? <MemoizedMarkdown content={data.label} />
    : showEmptyLabelPrompt
      ? <span className="text-slate-400/80">{emptyLabelPrompt}</span>
      : null;
  const labelTitle = hasLabel ? data.label : showEmptyLabelPrompt ? emptyLabelPrompt : undefined;

  // Calculate Border Radius from Design System if shape is 'rounded' (default)
  function getBorderRadius(): string | number {
    if (isComplexShape) return '0';
    if (activeShape === 'capsule') return '9999px';
    if (activeShape === 'rectangle') return '4px'; // Or 0
    // For 'rounded' or others
    return designSystem.components.node.borderRadius;
  }

  // Square-aspect shapes enforce aspect-ratio so the geometry stays correct on resize.
  const needsSquareAspect = activeShape === 'circle' || activeShape === 'ellipse' || activeShape === 'diamond' || activeShape === 'hexagon';

  // Container style
  const containerStyle: React.CSSProperties = {
    minWidth,
    minHeight: effectiveMinHeight,
    width: toCssSize(explicitWidth) ?? '100%',
    height: toCssSize(explicitHeight),
    ...(needsSquareAspect ? { aspectRatio: '1/1' } : {}),
    ...fontFamilyStyle,

    // Apply Design System Styles for Box Shadow and Border
    boxShadow: !isComplexShape ? designSystem.components.node.boxShadow : 'none',
    borderWidth: !isComplexShape ? designSystem.components.node.borderWidth : 0,
    padding: 0, // Padding handled by inner content wrapper.
    borderRadius: getBorderRadius(),
    backgroundColor: !isComplexShape ? visualStyle.bg : undefined,
    borderColor: !isComplexShape ? visualStyle.border : undefined,
  };

  return (
    <>
      {/* Shift key state for proportional resize */}
      {selected && <ShiftKeyResizeWatcher onShiftChange={setShiftHeld} />}
      <NodeTransformControls
        isVisible={Boolean(selected)}
        minWidth={minWidth}
        minHeight={effectiveMinHeight}
        keepAspectRatio={shiftHeld || needsSquareAspect}
      />

      <NodeChrome
        selected={Boolean(selected)}
        minWidth={minWidth}
        minHeight={effectiveMinHeight}
        keepAspectRatio={shiftHeld || needsSquareAspect}
        handleClassName={connectionHandleClass}
      >
        {/* Main Node Container */}
        <div
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
        {/* SVG Background Layer for Complex Shapes */}
        {isComplexShape && (
          <div className="absolute inset-0 w-full h-full z-0 flex items-center justify-center">
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid meet"
              className="w-full h-full overflow-visible drop-shadow-sm"
            >
              {getShapeSVG()}
            </svg>
          </div>
        )}

        {/* Content Layer */}
        <div className={`relative z-10 h-full w-full min-h-0 p-4 flex flex-col items-center justify-center ${isCompactNode ? 'gap-1.5' : 'gap-2'} 
          ${isComplexShape && activeShape === 'diamond' ? 'px-8 py-6' : ''} 
          ${isComplexShape && activeShape === 'hexagon' ? 'px-8' : ''}
          ${isComplexShape && activeShape === 'parallelogram' ? 'px-8' : ''}
          ${isComplexShape && activeShape === 'cylinder' ? 'pt-8 pb-4' : ''}
        `}
          style={!isComplexShape ? { padding: contentPadding } : undefined}
        >

          {/* Icon Area */}
          <div className={`flex items-center gap-1.5 shrink-0 flow-lod-far-target flow-lod-far-flex-target ${lodPreserveClass} ${hasIcon ? 'mb-0' : 'mb-2'}`}>
            {data.customIconUrl && (
              <div
                className={`shrink-0 ${isCompactNode ? 'w-7 h-7' : 'w-8 h-8'} rounded-lg flex items-center justify-center border border-black/5 shadow-sm overflow-hidden flow-lod-shadow`}
                style={{ backgroundColor: visualStyle.iconBg }}
              >
                <img src={data.customIconUrl} alt="icon" className={`${isCompactNode ? 'w-4 h-4' : 'w-5 h-5'} object-contain`} />
              </div>
            )}

            {iconName && (
              <div
                className={`shrink-0 ${isCompactNode ? 'w-7 h-7' : 'w-8 h-8'} rounded-lg flex items-center justify-center border border-black/5 shadow-sm flow-lod-shadow`}
                style={{ backgroundColor: visualStyle.iconBg }}
              >
                <NamedIcon
                  name={iconName}
                  fallbackName="Settings"
                  className={`${isCompactNode ? 'w-3.5 h-3.5' : 'w-4 h-4'}`}
                  style={{ color: visualStyle.iconColor }}
                />
              </div>
            )}
          </div>

          {/* Text Content */}
          <div className={`flex flex-col min-w-0 max-w-full w-full overflow-hidden ${fontFamilyClass}`} style={{ textAlign: data.align || 'center', ...fontFamilyStyle }}>
            <InlineTextEditSurface
              isEditing={labelEdit.isEditing}
              draft={labelEdit.draft}
              displayValue={labelDisplayValue}
              onBeginEdit={labelEdit.beginEdit}
              onDraftChange={labelEdit.setDraft}
              onCommit={labelEdit.commit}
              onKeyDown={labelEdit.handleKeyDown}
              className={`leading-tight block break-words markdown-content [&_p]:m-0 [&_p]:leading-tight ${fontSizeClass}`}
              style={{
                ...fontSizeStyle,
                color: visualStyle.text,
                // fontFamily: 'inherit', // Redundant if parent has class
                fontWeight: data.fontWeight || (visualQualityV2Enabled ? '600' : 'bold'),
                fontStyle: data.fontStyle || 'normal',
                ...(visualQualityV2Enabled
                  ? {
                    lineHeight: 1.2,
                  }
                  : {}),
              }}
              title={labelTitle}
              inputMode="multiline"
              inputClassName="text-center"
              isSelected={isActiveSelected}
            />
            {hasSubLabel && (
              <InlineTextEditSurface
                isEditing={subLabelEdit.isEditing}
                draft={subLabelEdit.draft}
                displayValue={<MemoizedMarkdown content={data.subLabel} />}
                onBeginEdit={subLabelEdit.beginEdit}
                onDraftChange={subLabelEdit.setDraft}
                onCommit={subLabelEdit.commit}
                onKeyDown={subLabelEdit.handleKeyDown}
                className={`text-[10px] text-slate-500 mt-1 leading-snug markdown-content [&_p]:m-0 [&_p]:leading-snug break-words flow-lod-secondary ${lodPreserveClass}`}
                style={{
                  color: visualStyle.subText,
                  fontWeight: 'normal',
                  fontStyle: 'normal',
                  textAlign: data.align || 'center',
                  opacity: 0.85,
                  ...(visualQualityV2Enabled
                    ? {
                      lineHeight: 1.25,
                    }
                    : {}),
                }}
                inputClassName="text-center"
                isSelected={Boolean(selected)}
              />
            )}
          </div>

          {/* Image */}
          {data.imageUrl && (
            <div className="w-full mt-3 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flow-lod-far-target">
              <img src={data.imageUrl} alt="attachment" className="w-full h-auto max-h-[200px] object-cover" />
            </div>
          )}
        </div>
        </div>
      </NodeChrome>
    </>
  );
};

export default memo(CustomNode);
