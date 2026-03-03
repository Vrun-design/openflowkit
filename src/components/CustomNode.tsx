import React, { memo } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { NodeData } from '@/lib/types';

import { NamedIcon } from './IconMap';
import MemoizedMarkdown from './MemoizedMarkdown';
import { NODE_COLOR_PALETTE, NODE_EXPORT_COLORS } from '../theme';
import { useDesignSystem } from '../hooks/useDesignSystem';

function getDefaults(type: string): { color: string; icon: string | null; shape: 'rounded' | 'diamond' | 'rectangle' | 'capsule' | 'hexagon' | 'parallelogram' | 'cylinder' | 'circle' | 'ellipse' } {
  switch (type) {
    case 'start': return { color: 'emerald', icon: null, shape: 'rounded' };
    case 'end': return { color: 'red', icon: null, shape: 'rounded' };
    case 'decision': return { color: 'amber', icon: null, shape: 'diamond' };
    case 'annotation': return { color: 'yellow', icon: null, shape: 'rounded' };
    case 'custom': return { color: 'violet', icon: null, shape: 'rounded' };
    default: return { color: 'slate', icon: null, shape: 'rounded' };
  }
}

function getMinNodeSize(shape: NodeData['shape'] | undefined): { minWidth: number; minHeight: number } {
  if (shape === 'circle' || shape === 'ellipse') {
    return { minWidth: 120, minHeight: 120 };
  }
  if (shape === 'diamond' || shape === 'hexagon' || shape === 'parallelogram' || shape === 'cylinder') {
    return { minWidth: 140, minHeight: 90 };
  }
  return { minWidth: 120, minHeight: 70 };
}

function toCssSize(value: number | string | undefined): string | undefined {
  if (value === undefined || value === null) return undefined;
  return typeof value === 'number' ? `${value}px` : value;
}

function CustomNode(props: NodeProps<NodeData>): React.ReactElement {
  const { data, type, selected } = props;
  const width = (props as { width?: number }).width;
  const height = (props as { height?: number }).height;
  const designSystem = useDesignSystem();

  const defaults = getDefaults(type || 'process');
  const activeColor = data.color || defaults.color;
  const activeIconKey = data.icon === 'none' ? null : (data.icon || defaults.icon);
  const activeShape = data.shape || defaults.shape || 'rounded';

  // Theme colors
  const style = NODE_COLOR_PALETTE[activeColor] || NODE_COLOR_PALETTE.slate;
  const exportColors = NODE_EXPORT_COLORS[activeColor] || NODE_EXPORT_COLORS.slate;

  // Resolve icons
  const iconName = data.customIconUrl || !activeIconKey ? null : activeIconKey;

  // Typography
  const fontFamilyMap: Record<string, string> = {
    inter: 'font-inter', roboto: 'font-roboto', outfit: 'font-outfit',
    playfair: 'font-playfair', fira: 'font-fira', sans: 'font-sans',
    serif: 'font-serif', mono: 'font-mono',
  };

  // Use Design System font if no specific font is selected on the node
  const dsFontFamily = designSystem.typography.fontFamily.split(',')[0].trim().toLowerCase();
  // Map DS font to tailwind class if possible, or use inline style
  // For now, simpler to use inline style for font-family if it comes from DS

  const fontFamilyClass = data.fontFamily ? fontFamilyMap[data.fontFamily] : '';
  const fontFamilyStyle = !data.fontFamily ? { fontFamily: designSystem.typography.fontFamily } : {};

  const fontSize = data.fontSize || '14';
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

  // Layout alignment: Dynamic
  const layoutClass = 'flex-col';
  const hasIcon = Boolean(iconName) || Boolean(data.customIconUrl);

  // -- Shape Rendering Logic -- //
  function getShapeSVG(): React.ReactElement | null {
    const strokeColor = exportColors.border;
    const fillColor = exportColors.bg;

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
  };

  const isComplexShape = ['diamond', 'hexagon', 'parallelogram', 'cylinder', 'circle', 'ellipse'].includes(activeShape);
  const isCircular = activeShape === 'circle';
  const { minWidth, minHeight } = getMinNodeSize(activeShape);

  // Calculate Border Radius from Design System if shape is 'rounded' (default)
  function getBorderRadius(): string | number {
    if (isComplexShape) return '0';
    if (activeShape === 'capsule') return '9999px';
    if (activeShape === 'rectangle') return '4px'; // Or 0
    // For 'rounded' or others
    return designSystem.components.node.borderRadius;
  };

  // Container style
  const containerStyle: React.CSSProperties = {
    minWidth,
    minHeight,
    width: toCssSize(width) ?? '100%',
    height: toCssSize(height) ?? '100%',
    ...(isCircular ? { aspectRatio: '1/1' } : {}),
    ...fontFamilyStyle,

    // Apply Design System Styles for Box Shadow and Border
    boxShadow: !isComplexShape ? designSystem.components.node.boxShadow : 'none',
    borderWidth: !isComplexShape ? designSystem.components.node.borderWidth : 0,
    padding: !isComplexShape ? 0 : 0, // Padding handled by inner div usually, but border might affect sizing
    borderRadius: getBorderRadius(),
  };

  return (
    <>
      <NodeResizer
        color="#94a3b8"
        isVisible={selected}
        minWidth={minWidth}
        minHeight={minHeight}
        lineStyle={{ borderStyle: 'solid', borderWidth: 1 }}
        handleStyle={{ width: 8, height: 8, borderRadius: 4 }}
      />

      {/* Main Node Container */}
      <div
        className={`relative group flex flex-col justify-center h-full transition-all duration-200
          ${!isComplexShape ? style.bg : ''}
          ${!isComplexShape ? style.border : ''}
          ${selected ? 'ring-2 ring-indigo-500 ring-offset-4' : ''}
        `}
        style={containerStyle}
      >
        {/* SVG Background Layer for Complex Shapes */}
        {isComplexShape && (
          <div className="absolute inset-0 w-full h-full z-0">
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="w-full h-full overflow-visible drop-shadow-sm"
            >
              {getShapeSVG()}
            </svg>
          </div>
        )}

        {/* Content Layer */}
        <div className={`relative z-10 p-4 flex ${layoutClass} items-center 
          ${isComplexShape && activeShape === 'diamond' ? 'px-8 py-6' : ''} 
          ${isComplexShape && activeShape === 'hexagon' ? 'px-8' : ''}
          ${isComplexShape && activeShape === 'parallelogram' ? 'px-8' : ''}
          ${isComplexShape && activeShape === 'cylinder' ? 'pt-8 pb-4' : ''}
        `}
          style={{ padding: designSystem.components.node.padding }}
        >

          {/* Icon Area */}
          <div className="flex items-center gap-1.5 shrink-0 mb-2">
            {data.customIconUrl && (
              <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border border-black/5 shadow-sm overflow-hidden ${style.iconBg}`}>
                <img src={data.customIconUrl} alt="icon" className="w-5 h-5 object-contain" />
              </div>
            )}

            {iconName && (
              <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border border-black/5 shadow-sm ${style.iconBg}`}>
                <NamedIcon name={iconName} fallbackName="Settings" className={`w-4 h-4 ${style.iconColor}`} />
              </div>
            )}
          </div>

          {/* Text Content */}
          <div className={`flex flex-col min-w-0 ${!hasIcon ? 'w-full' : ''} ${fontFamilyClass}`} style={{ textAlign: data.align || 'center', ...fontFamilyStyle }}>
            <div
              className={`leading-tight block break-words markdown-content [&>p]:m-0 ${fontSizeClass}`}
              style={{
                ...fontSizeStyle,
                // fontFamily: 'inherit', // Redundant if parent has class
                fontWeight: data.fontWeight || 'bold',
                fontStyle: data.fontStyle || 'normal',
              }}
            >
              <MemoizedMarkdown content={data.label || 'Node'} />
            </div>
            {data.subLabel && (
              <div
                className="text-[10px] text-slate-500 mt-1 leading-snug markdown-content break-words line-clamp-2"
                style={{
                  fontWeight: 'normal',
                  fontStyle: 'normal',
                  textAlign: data.align || 'center',
                  opacity: 0.85
                }}
              >
                <MemoizedMarkdown content={data.subLabel} />
              </div>
            )}
          </div>

          {/* Image */}
          {data.imageUrl && (
            <div className="w-full mt-3 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
              <img src={data.imageUrl} alt="attachment" className="w-full h-auto max-h-[200px] object-cover" />
            </div>
          )}
        </div>
      </div>

      {/* Handles */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        isConnectableStart={true}
        isConnectableEnd={true}
        className={`!w-3 !h-3 !border-2 !border-white ${style.handle} transition-all duration-150 hover:scale-125 ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 [.is-connecting_&]:opacity-100'}`}
        style={{ left: '50%', top: 0, transform: 'translate(-50%, -50%)', pointerEvents: 'all' }}
      />

      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        isConnectableStart={true}
        isConnectableEnd={true}
        className={`!w-3 !h-3 !border-2 !border-white ${style.handle} transition-all duration-150 hover:scale-125 ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 [.is-connecting_&]:opacity-100'}`}
        style={{ left: '50%', top: '100%', transform: 'translate(-50%, -50%)', pointerEvents: 'all' }}
      />

      <Handle
        type="source"
        position={Position.Left}
        id="left"
        isConnectableStart={true}
        isConnectableEnd={true}
        className={`!w-3 !h-3 !border-2 !border-white ${style.handle} transition-all duration-150 hover:scale-125 ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 [.is-connecting_&]:opacity-100'}`}
        style={{ top: '50%', left: 0, transform: 'translate(-50%, -50%)', pointerEvents: 'all' }}
      />

      <Handle
        type="source"
        position={Position.Right}
        id="right"
        isConnectableStart={true}
        isConnectableEnd={true}
        className={`!w-3 !h-3 !border-2 !border-white ${style.handle} transition-all duration-150 hover:scale-125 ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 [.is-connecting_&]:opacity-100'}`}
        style={{ top: '50%', left: '100%', transform: 'translate(-50%, -50%)', pointerEvents: 'all' }}
      />
    </>
  );
};

export default memo(CustomNode);
