import React, { memo, useMemo } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { NodeData } from '@/lib/types';

import { ICON_MAP } from './IconMap';
import MemoizedMarkdown from './MemoizedMarkdown';
import { NODE_COLOR_PALETTE, NODE_EXPORT_COLORS } from '../theme';
import { useDesignSystem } from '../hooks/useDesignSystem';

const getDefaults = (type: string) => {
  switch (type) {
    case 'start': return { color: 'emerald', icon: null, shape: 'rounded' };
    case 'end': return { color: 'red', icon: null, shape: 'rounded' };
    case 'decision': return { color: 'amber', icon: null, shape: 'diamond' };
    case 'annotation': return { color: 'yellow', icon: null, shape: 'rounded' };
    case 'custom': return { color: 'violet', icon: null, shape: 'rounded' };
    default: return { color: 'slate', icon: null, shape: 'rounded' };
  }
}

const CustomNode = ({ data, type, selected }: NodeProps<NodeData>) => {
  const designSystem = useDesignSystem();

  const defaults = getDefaults(type || 'process');
  const activeColor = data.color || defaults.color;
  const activeIconKey = data.icon === 'none' ? null : (data.icon || defaults.icon);
  const activeShape = data.shape || defaults.shape || 'rounded';

  // Theme colors
  const style = NODE_COLOR_PALETTE[activeColor] || NODE_COLOR_PALETTE.slate;
  const exportColors = NODE_EXPORT_COLORS[activeColor] || NODE_EXPORT_COLORS.slate;

  // Resolve icons
  const IconComponent = useMemo(() => {
    if (data.customIconUrl) return null;
    if (!activeIconKey) return null;
    const exactMatch = ICON_MAP[activeIconKey];
    if (exactMatch) return exactMatch;
    const keyLower = activeIconKey.toLowerCase();
    const foundKey = Object.keys(ICON_MAP).find(k => k.toLowerCase() === keyLower);
    return foundKey ? ICON_MAP[foundKey] : ICON_MAP.Settings;
  }, [activeIconKey, data.customIconUrl]);

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
  const fontSizeClass = isNumericSize ? '' : (fontSize === 'small' ? 'text-xs' : fontSize === 'medium' ? 'text-sm' : fontSize === 'large' ? 'text-base' : 'text-lg');
  const fontSizeStyle = isNumericSize ? { fontSize: fontSize + 'px' } : {};

  // Layout alignment: Dynamic
  const layoutClass = 'flex-col';
  const hasIcon = IconComponent || data.customIconUrl;

  // -- Shape Rendering Logic -- //
  const getShapeSVG = () => {
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
      case 'triangle':
        return <polygon points="50,0 100,100 0,100" {...commonProps} />;
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

  // CSS classes for standard shapes
  // If we are using Design System, we might want to override these defaults
  const borderRadiusClass = !isComplexShape ? (
    activeShape === 'rectangle' ? 'rounded-sm' :
      activeShape === 'capsule' ? 'rounded-[2rem]' : 'rounded-xl'
  ) : '';

  // Calculate Border Radius from Design System if shape is 'rounded' (default)
  const getBorderRadius = () => {
    if (isComplexShape) return '0';
    if (activeShape === 'capsule') return '9999px';
    if (activeShape === 'rectangle') return '4px'; // Or 0
    // For 'rounded' or others
    return designSystem.components.node.borderRadius;
  };

  // Container style
  const containerStyle: React.CSSProperties = {
    minWidth: isCircular ? 150 : 200,
    width: '100%',
    height: '100%',
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
        minWidth={100}
        minHeight={50}
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
              <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border border-black/5 shadow-sm overflow-hidden ${style.iconBg}`}>
                <img src={data.customIconUrl} alt="icon" className="w-6 h-6 object-contain" />
              </div>
            )}

            {IconComponent && (
              <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border border-black/5 shadow-sm ${style.iconBg}`}>
                <IconComponent className={`w-5 h-5 ${style.iconColor}`} />
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
                className="text-xs text-slate-600 mt-1 leading-normal markdown-content break-words"
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