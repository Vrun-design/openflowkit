import React, { memo } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { NodeData } from '../types';

const TEXT_COLORS: Record<string, { text: string, border: string }> = {
    slate: { text: 'text-slate-700', border: 'border-slate-300' },
    blue: { text: 'text-blue-700', border: 'border-blue-300' },
    emerald: { text: 'text-emerald-700', border: 'border-emerald-300' },
    amber: { text: 'text-amber-700', border: 'border-amber-300' },
    violet: { text: 'text-violet-700', border: 'border-violet-300' },
    red: { text: 'text-red-700', border: 'border-red-300' },
    pink: { text: 'text-pink-700', border: 'border-pink-300' },
    yellow: { text: 'text-yellow-800', border: 'border-yellow-400' },
};

const TextNode = ({ data, selected }: NodeProps<NodeData>) => {
    const color = data.color || 'slate';
    const colorSet = TEXT_COLORS[color] || TEXT_COLORS.slate;
    const textColor = colorSet.text;
    const borderColor = colorSet.border;

    // Font Size Logic
    const fontSize = data.fontSize || '16';
    const isNumericSize = !isNaN(Number(fontSize));
    const fontSizeClass = isNumericSize ? '' : (fontSize === 'small' ? 'text-sm' : fontSize === 'medium' ? 'text-base' : fontSize === 'large' ? 'text-lg' : 'text-xl');
    const fontSizeStyle = isNumericSize ? { fontSize: `${fontSize}px` } : {};

    // Font Family Map
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

    return (
        <>
            <NodeResizer
                color="#94a3b8"
                isVisible={selected}
                minWidth={50}
                minHeight={30}
                lineStyle={{ borderStyle: 'solid', borderWidth: 1 }}
                handleStyle={{ width: 6, height: 6, borderRadius: 3 }}
            />

            {/* Invisible Handles for connections */}
            <Handle type="target" position={Position.Top} className="opacity-0 hover:opacity-100 w-3 h-3 bg-slate-400" />
            <Handle type="target" position={Position.Left} className="opacity-0 hover:opacity-100 w-3 h-3 bg-slate-400" />

            <div
                className={`
          flex items-center justify-center p-2 rounded-lg transition-all duration-200 border-2
          ${selected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}
          ${!data.backgroundColor ? 'hover:bg-slate-100/50 border-transparent' : borderColor}
        `}
                style={{
                    minWidth: 50,
                    minHeight: 30,
                    backgroundColor: data.backgroundColor || 'transparent',
                    ...fontSizeStyle
                }}
            >
                <div className={`prose prose-sm max-w-none text-center leading-snug font-medium select-none pointer-events-none ${textColor} ${fontSizeClass} ${fontFamilyClass}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                        {data.label || 'Text'}
                    </ReactMarkdown>
                </div>
            </div>

            <Handle type="source" position={Position.Right} className="opacity-0 hover:opacity-100 w-3 h-3 bg-slate-400" />
            <Handle type="source" position={Position.Bottom} className="opacity-0 hover:opacity-100 w-3 h-3 bg-slate-400" />
        </>
    );
};

export default memo(TextNode);
