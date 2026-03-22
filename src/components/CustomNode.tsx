import React, { memo, useEffect, useState } from 'react';
import type { LegacyNodeProps } from '@/lib/reactflowCompat';
import type { NodeData } from '@/lib/types';
import { useArchitectureLint } from '@/context/ArchitectureLintContext';
import { useDiagramDiff } from '@/context/DiagramDiffContext';

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
import { loadProviderShapePreview } from '@/services/shapeLibrary/providerCatalog';

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
function useShiftHeld(selected: boolean): boolean {
  const [shiftHeld, setShiftHeld] = useState(false);

  useEffect(() => {
    if (!selected) return;

    const down = (e: KeyboardEvent) => { if (e.key === 'Shift') setShiftHeld(true); };
    const up = (e: KeyboardEvent) => { if (e.key === 'Shift') setShiftHeld(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [selected]);

  return selected ? shiftHeld : false;
}

interface NodeShapeSVGProps {
  shape: NodeShape;
  fill: string;
  stroke: string;
  strokeWidth: number | string;
}

/** Pure SVG geometry for complex node shapes. Rendered inside a 100×100 viewBox. */
function NodeShapeSVG({ shape, fill, stroke, strokeWidth }: NodeShapeSVGProps): React.ReactElement | null {
  const commonProps = { stroke, strokeWidth, vectorEffect: 'non-scaling-stroke' as const, fill };
  switch (shape) {
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
          <ellipse cx="50" cy="15" rx="50" ry="15" stroke={stroke} strokeWidth="2" vectorEffect="non-scaling-stroke" fill={fill} fillOpacity={0.5} />
        </>
      );
    case 'circle':
      return <circle cx="50" cy="50" r="48" {...commonProps} />;
    case 'ellipse':
      return <ellipse cx="50" cy="50" rx="48" ry="48" {...commonProps} />;
    default:
      return null;
  }
}

interface IconAssetNodeBodyProps {
  selected: boolean;
  connectionHandleClass: string;
  explicitWidth: number | string | undefined;
  nodeHeightPx: number | undefined;
  hasLabel: boolean;
  resolvedAssetIconUrl: string | null;
  activeIconKey: string | null;
  label: string | undefined;
  isActiveSelected: boolean;
  labelEdit: {
    isEditing: boolean;
    draft: string;
    beginEdit: () => void;
    setDraft: (v: string) => void;
    commit: () => void;
    handleKeyDown: (e: React.KeyboardEvent) => void;
  };
}

/** Renders the compact icon-first presentation used for architecture asset nodes. */
function IconAssetNodeBody({
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
  const iconScale = 1;
  const iconFrameSize = 72;
  const iconHandleStyleExtras = { left: { top: 42 }, right: { top: 42 } };

  return (
    <>
      <NodeTransformControls isVisible={selected} minWidth={96} minHeight={96} keepAspectRatio={false} />
      <NodeChrome
        selected={selected}
        minWidth={96}
        minHeight={hasLabel ? 108 : 88}
        keepAspectRatio={false}
        handleClassName={connectionHandleClass}
        handleStyleExtras={iconHandleStyleExtras}
      >
        <div
          className="inline-flex min-w-[88px] max-w-[96px] flex-col items-center justify-start gap-2 bg-transparent px-1 py-1"
          style={{ width: toCssSize(explicitWidth) ?? '96px' }}
          {...getTransformDiagnosticsAttrs({
            nodeFamily: 'custom',
            selected,
            compact: false,
            minHeight: 96,
            actualHeight: nodeHeightPx,
            hasIcon: true,
            hasSubLabel: false,
          })}
        >
          <div className="flex items-center justify-center overflow-visible" style={{ width: iconFrameSize, height: iconFrameSize }}>
            {resolvedAssetIconUrl ? (
              <img
                src={resolvedAssetIconUrl}
                alt={typeof label === 'string' ? label : 'icon'}
                className="h-full w-full object-contain"
                style={{ transform: `scale(${iconScale})` }}
              />
            ) : activeIconKey ? (
              <div className="flex h-full w-full items-center justify-center rounded-2xl bg-slate-50 text-slate-700">
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
              className="block max-w-full break-words text-center text-sm font-semibold leading-tight markdown-content [&_p]:m-0"
              style={{ color: '#334155' }}
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

function DiffBadge({ nodeId }: { nodeId: string }): React.ReactElement | null {
  const { isActive, addedNodeIds, changedNodeIds } = useDiagramDiff();
  if (!isActive) return null;
  const isAdded = addedNodeIds.has(nodeId);
  const isChanged = !isAdded && changedNodeIds.has(nodeId);
  if (!isAdded && !isChanged) return null;
  return (
    <div
      className="absolute -top-2 -left-2 z-20 h-4 w-4 rounded-full shadow-md pointer-events-none"
      style={{ backgroundColor: isAdded ? '#22c55e' : '#f59e0b' }}
      title={isAdded ? 'Added in current version' : 'Changed since snapshot'}
    />
  );
}

function LintViolationBadge({ nodeId }: { nodeId: string }): React.ReactElement | null {
  const { violations, violatingNodeIds } = useArchitectureLint();
  if (!violatingNodeIds.has(nodeId)) return null;

  const nodeViolations = violations.filter((v) => v.nodeIds.includes(nodeId));
  const hasError = nodeViolations.some((v) => v.severity === 'error');
  const title = nodeViolations.map((v) => v.message).join('\n');

  return (
    <div
      className="absolute -top-2 -right-2 z-20 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow-md pointer-events-auto select-none"
      style={{ backgroundColor: hasError ? '#ef4444' : '#f59e0b' }}
      title={title}
    >
      {nodeViolations.length > 1 ? nodeViolations.length : '!'}
    </div>
  );
}

function CustomNode(props: LegacyNodeProps<NodeData>): React.ReactElement {
  const { id, data, type, selected } = props;
  const explicitNodeStyle = (props as { style?: React.CSSProperties }).style;
  const explicitWidth = data.width ?? explicitNodeStyle?.width;
  const explicitHeight = data.height ?? explicitNodeStyle?.height;
  const measuredHeight = (props as { height?: number }).height;
  const shiftHeld = useShiftHeld(Boolean(selected));
  const providerAssetKey = data.archIconPackId && data.archIconShapeId
    ? `${data.archIconPackId}:${data.archIconShapeId}`
    : null;
  const [resolvedAssetIconState, setResolvedAssetIconState] = useState<{ key: string | null; url: string | null }>({ key: null, url: null });
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
  const resolvedAssetIconUrl = typeof data.customIconUrl === 'string' && data.customIconUrl.length > 0
    ? data.customIconUrl
    : (resolvedAssetIconState.key === providerAssetKey ? resolvedAssetIconState.url : null);
  const iconName = resolvedAssetIconUrl || !activeIconKey ? null : activeIconKey;

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
  const isIconAssetNode = data.assetPresentation === 'icon' && (Boolean(resolvedAssetIconUrl) || Boolean(activeIconKey) || Boolean(providerAssetKey));

  useEffect(() => {
    if (typeof data.customIconUrl === 'string' && data.customIconUrl.length > 0) {
      return;
    }
    if (!data.archIconPackId || !data.archIconShapeId || !providerAssetKey) {
      return;
    }

    let cancelled = false;
    loadProviderShapePreview(data.archIconPackId, data.archIconShapeId)
      .then((preview) => {
        if (!cancelled) {
          setResolvedAssetIconState({ key: providerAssetKey, url: preview?.previewUrl || null });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedAssetIconState({ key: providerAssetKey, url: null });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [data.archIconPackId, data.archIconShapeId, data.customIconUrl, providerAssetKey]);
  const labelDisplayValue = hasLabel
    ? <MemoizedMarkdown content={data.label} />
    : showEmptyLabelPrompt
      ? <span className="text-slate-400/80">{emptyLabelPrompt}</span>
      : null;

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

  const selectionRing = isActiveSelected && !isComplexShape
    ? `, 0 0 0 2px var(--brand-primary, #e95420)`
    : '';

  // Container style
  const animateIn = data.freshlyAdded === true;
  const containerStyle: React.CSSProperties = {
    minWidth,
    minHeight: effectiveMinHeight,
    width: toCssSize(explicitWidth) ?? '100%',
    height: toCssSize(explicitHeight),
    ...(needsSquareAspect ? { aspectRatio: '1/1' } : {}),
    ...fontFamilyStyle,

    // Apply Design System Styles for Box Shadow and Border
    boxShadow: !isComplexShape ? `${designSystem.components.node.boxShadow}${selectionRing}` : 'none',
    borderWidth: !isComplexShape ? designSystem.components.node.borderWidth : 0,
    padding: 0, // Padding handled by inner content wrapper.
    borderRadius: getBorderRadius(),
    backgroundColor: !isComplexShape ? visualStyle.bg : undefined,
    borderColor: !isComplexShape ? visualStyle.border : undefined,
    ...(animateIn ? {
      animation: `nodeAnimateIn 180ms ease-out ${data.animateDelay ?? 0}ms both`,
    } : {}),
  };

  if (isIconAssetNode) {
    return (
      <>
        <IconAssetNodeBody
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
      </>
    );
  }

  return (
    <>
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
        <DiffBadge nodeId={id} />
        <LintViolationBadge nodeId={id} />

        {/* SVG Background Layer for Complex Shapes */}
        {isComplexShape && (
          <div className="absolute inset-0 w-full h-full z-0 flex items-center justify-center">
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid meet"
              className="w-full h-full overflow-visible drop-shadow-sm"
            >
              <NodeShapeSVG shape={activeShape} fill={visualStyle.bg} stroke={visualStyle.border} strokeWidth={designSystem.components.edge.strokeWidth || "2"} />
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
            {resolvedAssetIconUrl && (
              <div
                className={`shrink-0 ${isCompactNode ? 'w-7 h-7' : 'w-8 h-8'} rounded-lg flex items-center justify-center border border-black/5 shadow-sm overflow-hidden flow-lod-shadow`}
                style={{ backgroundColor: visualStyle.iconBg }}
              >
                <img src={resolvedAssetIconUrl} alt="icon" className={`${isCompactNode ? 'w-4 h-4' : 'w-5 h-5'} object-contain`} />
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
