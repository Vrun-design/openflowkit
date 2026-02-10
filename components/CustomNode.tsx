import React, { memo, useMemo } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { NodeData } from '../types';
import { ICON_MAP } from './IconMap';
import { NODE_WIDTH, NODE_HEIGHT } from '../constants';

const getThemeStyles = (color: string = 'slate') => {
  const themes: Record<string, { bg: string, border: string, iconBg: string, iconColor: string, handle: string, ring: string }> = {
    slate: { bg: 'bg-white', border: 'border-slate-300', iconBg: 'bg-slate-100', iconColor: 'text-slate-600', handle: 'bg-slate-400', ring: 'ring-slate-400' },
    blue: { bg: 'bg-blue-50/50', border: 'border-blue-300', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', handle: 'bg-blue-500', ring: 'ring-blue-400' },
    emerald: { bg: 'bg-emerald-50/50', border: 'border-emerald-300', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', handle: 'bg-emerald-500', ring: 'ring-emerald-400' },
    red: { bg: 'bg-red-50/50', border: 'border-red-300', iconBg: 'bg-red-100', iconColor: 'text-red-600', handle: 'bg-red-500', ring: 'ring-red-400' },
    amber: { bg: 'bg-amber-50/50', border: 'border-amber-300', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', handle: 'bg-amber-500', ring: 'ring-amber-400' },
    violet: { bg: 'bg-violet-50/50', border: 'border-violet-300', iconBg: 'bg-violet-100', iconColor: 'text-violet-600', handle: 'bg-violet-500', ring: 'ring-violet-400' },
    pink: { bg: 'bg-pink-50/50', border: 'border-pink-300', iconBg: 'bg-pink-100', iconColor: 'text-pink-600', handle: 'bg-pink-500', ring: 'ring-pink-400' },
    yellow: { bg: 'bg-yellow-100', border: 'border-yellow-300', iconBg: 'bg-yellow-200', iconColor: 'text-yellow-700', handle: 'bg-yellow-500', ring: 'ring-yellow-400' },
  };
  return themes[color] || themes.slate;
};

const getDefaults = (type: string) => {
  switch (type) {
    case 'start': return { color: 'emerald', icon: 'Play', shape: 'rounded' };
    case 'end': return { color: 'red', icon: 'Square', shape: 'rounded' };
    case 'decision': return { color: 'amber', icon: 'Diamond', shape: 'rounded' };
    case 'annotation': return { color: 'yellow', icon: 'StickyNote', shape: 'rounded' };
    case 'custom': return { color: 'violet', icon: 'Cpu', shape: 'rounded' };
    default: return { color: 'slate', icon: 'Settings', shape: 'rounded' };
  }
}

const CustomNode = ({ data, type, selected }: NodeProps<NodeData>) => {
  const defaults = getDefaults(type || 'process');
  const activeColor = data.color || defaults.color;
  const activeIconKey = data.icon === 'none' ? null : (data.icon || defaults.icon);
  const activeShape = data.shape || defaults.shape || 'rounded';
  const rotation = data.rotation || 0;

  const style = getThemeStyles(activeColor);

  // Dynamic Icon Retrieval
  const IconComponent = useMemo(() => {
    if (!activeIconKey) return null;
    // Handle case-sensitivity fallback (Lucide icons are PascalCase)
    const exactMatch = ICON_MAP[activeIconKey];
    if (exactMatch) return exactMatch;

    // Fallback search
    const keyLower = activeIconKey.toLowerCase();
    const foundKey = Object.keys(ICON_MAP).find(k => k.toLowerCase() === keyLower);
    return foundKey ? ICON_MAP[foundKey] : ICON_MAP.Settings;
  }, [activeIconKey]);

  // Font Styling
  const fontFamilyMap: Record<string, string> = {
    inter: 'font-inter',
    roboto: 'font-roboto',
    outfit: 'font-outfit',
    playfair: 'font-playfair',
    fira: 'font-fira',
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono',
  };
  const fontFamilyClass = fontFamilyMap[data.fontFamily || 'inter'];
  const fontSize = data.fontSize || '14';
  const isNumericSize = !isNaN(Number(fontSize));
  const fontSizeClass = isNumericSize ? '' : (fontSize === 'small' ? 'text-xs' : fontSize === 'medium' ? 'text-sm' : fontSize === 'large' ? 'text-base' : 'text-lg');
  const fontSizeStyle = isNumericSize ? { fontSize: `${fontSize}px` } : {};

  // Alignment Logic
  const align = data.align || 'left';
  const layoutClass = align === 'left' ? 'flex-row text-left' : 'flex-col text-center';
  const itemsClass = align === 'left' ? 'items-start' : (align === 'right' ? 'items-end text-right' : 'items-center');

  // Shape Styles
  let borderRadiusClass = 'rounded-xl';
  if (activeShape === 'rectangle') borderRadiusClass = 'rounded-sm';
  if (activeShape === 'capsule') borderRadiusClass = 'rounded-[2rem]';

  return (
    <>
      <NodeResizer
        color="#94a3b8"
        isVisible={selected}
        minWidth={150}
        minHeight={80}
        lineStyle={{ borderStyle: 'solid', borderWidth: 1 }}
        handleStyle={{ width: 8, height: 8, borderRadius: 4 }}
      />

      {/* Rotation Wrapper */}
      <div style={{ transform: `rotate(${rotation}deg)`, transformOrigin: 'center center', width: '100%', height: '100%' }}>
        <div
          className={`
              relative flex flex-col justify-center shadow-lg border-2 transition-all duration-200 h-full overflow-hidden
              ${borderRadiusClass}
              ${!data.backgroundColor ? style.bg : ''} 
              ${!data.backgroundColor ? style.border : 'border-slate-300 shadow-sm'}
              ${selected ? 'ring-2 ring-indigo-500 ring-offset-4' : ''}
              text-${activeColor}-900
          `}
          style={{
            backgroundColor: data.backgroundColor,
            minWidth: 200,
            width: '100%',
            height: '100%',
          }}
        >
          {/* 1. Header Section */}
          <div className={`flex ${layoutClass} items-center gap-3 p-4`}>
            {IconComponent && (
              <div className={`
                      shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border border-black/5 shadow-sm
                      ${style.iconBg}
                  `}>
                <IconComponent className={`w-5 h-5 ${style.iconColor}`} />
              </div>
            )}

            <div className={`flex flex-col min-w-0 ${!IconComponent ? 'w-full' : ''}`}>
              {/* Rich Text Label */}
              <div className={`font-bold text-slate-800 leading-tight block break-words markdown-content [&>p]:m-0 ${fontFamilyClass} ${fontSizeClass}`} style={fontSizeStyle}>
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{data.label || 'Node'}</ReactMarkdown>
              </div>

              {data.subLabel && (
                <div className="text-xs text-slate-600 mt-1 font-medium leading-normal markdown-content break-words">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                    {data.subLabel}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>

          {/* 2. Body Section: Image */}
          {data.imageUrl && (
            <div className="px-4 pb-4">
              <div className="relative w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                <img
                  src={data.imageUrl}
                  alt="Node attachment"
                  className="w-full h-auto max-h-[200px] object-cover"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- Connection Handles --- */}
      {/* We rotate handles inversely or position them absolutely, but simply letting them rotate with the node is usually expected behavior in flowcharts */}
      <Handle type="target" position={Position.Top} id="top" className={`w-3 h-3 border-2 border-white ${style.handle} transition-transform hover:scale-125`} />
      <Handle type="source" position={Position.Right} id="right" className={`w-3 h-3 border-2 border-white ${style.handle} transition-transform hover:scale-125`} />
      <Handle type="source" position={Position.Bottom} id="bottom" className={`w-3 h-3 border-2 border-white ${style.handle} transition-transform hover:scale-125`} />
      <Handle type="target" position={Position.Left} id="left" className={`w-3 h-3 border-2 border-white ${style.handle} transition-transform hover:scale-125`} />
    </>
  );
};

export default memo(CustomNode);