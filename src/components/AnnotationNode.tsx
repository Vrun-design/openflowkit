import React, { memo } from 'react';
import { NodeProps, NodeResizer } from 'reactflow';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { NodeData } from '@/lib/types';

const AnnotationNode = ({ data, selected }: NodeProps<NodeData>) => {
  return (
    <>
      <NodeResizer 
        color="#ca8a04" 
        isVisible={selected} 
        minWidth={150} 
        minHeight={100} 
      />
      <div
        className={`
          relative flex flex-col h-full shadow-md rounded-br-3xl rounded-tl-sm rounded-tr-sm rounded-bl-sm border border-yellow-300 transition-all duration-200
          bg-yellow-100/90
          ${selected ? `ring-2 ring-yellow-400 ring-offset-2 z-10` : 'hover:shadow-lg'}
        `}
        style={{ minWidth: 200, width: '100%', height: '100%' }}
      >
        <div className="p-4 flex flex-col h-full">
            {data.label && (
                <div className="text-sm font-bold text-yellow-900 border-b border-yellow-200 pb-2 mb-2">
                    {data.label}
                </div>
            )}
            <div className="text-xs text-yellow-800 font-medium leading-relaxed markdown-content flex-1 overflow-hidden">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {data.subLabel || '*Double click to edit note*'}
                </ReactMarkdown>
            </div>
        </div>
        
        {/* Decorative corner fold */}
        <div className="absolute bottom-0 right-0 w-8 h-8 bg-yellow-200/50 rounded-tl-xl border-t border-l border-yellow-300/30"></div>
      </div>
    </>
  );
};

export default memo(AnnotationNode);