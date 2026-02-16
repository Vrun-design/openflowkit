import React, { memo } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { NodeData } from '@/lib/types';
import { NODE_COLOR_PALETTE } from '../theme';

const ImageNode = ({ data, selected }: NodeProps<NodeData>) => {
    // Default styles
    const style = NODE_COLOR_PALETTE.slate;

    return (
        <>
            <NodeResizer
                color="#94a3b8"
                isVisible={selected}
                minWidth={50}
                minHeight={50}
                keepAspectRatio={true}
                lineStyle={{ borderStyle: 'solid', borderWidth: 1 }}
                handleStyle={{ width: 8, height: 8, borderRadius: 4 }}
            />

            <div
                className={`relative group flex flex-col justify-center h-full transition-all duration-200
                    ${selected ? 'ring-2 ring-indigo-500 ring-offset-4' : ''}
                `}
                style={{
                    width: '100%',
                    height: '100%',
                    opacity: data.transparency ?? 1,
                    transform: data.rotation ? `rotate(${data.rotation}deg)` : 'none',
                }}
            >
                {data.imageUrl ? (
                    <img
                        src={data.imageUrl}
                        alt={data.label || 'Image Node'}
                        className="w-full h-full object-contain pointer-events-none select-none"
                    />
                ) : (
                    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 rounded-lg">
                        <span className="text-xs">No Image</span>
                    </div>
                )}
            </div>

            {/* Universal Handles - Allow connections */}
            {/* Hidden by default, visible on hover/connect */}
            <Handle
                type="source"
                position={Position.Top}
                id="top"
                isConnectableStart={true}
                isConnectableEnd={true}
                className={`!w-3 !h-3 !border-2 !border-white ${style.handle} transition-all duration-150 hover:scale-125 ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 [.is-connecting_&]:opacity-100'}`}
                style={{ left: '50%', top: 0, transform: 'translate(-50%, -50%)' }}
            />
            <Handle
                type="source"
                position={Position.Bottom}
                id="bottom"
                isConnectableStart={true}
                isConnectableEnd={true}
                className={`!w-3 !h-3 !border-2 !border-white ${style.handle} transition-all duration-150 hover:scale-125 ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 [.is-connecting_&]:opacity-100'}`}
                style={{ left: '50%', top: '100%', transform: 'translate(-50%, -50%)' }}
            />
            <Handle
                type="source"
                position={Position.Left}
                id="left"
                isConnectableStart={true}
                isConnectableEnd={true}
                className={`!w-3 !h-3 !border-2 !border-white ${style.handle} transition-all duration-150 hover:scale-125 ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 [.is-connecting_&]:opacity-100'}`}
                style={{ top: '50%', left: 0, transform: 'translate(-50%, -50%)' }}
            />
            <Handle
                type="source"
                position={Position.Right}
                id="right"
                isConnectableStart={true}
                isConnectableEnd={true}
                className={`!w-3 !h-3 !border-2 !border-white ${style.handle} transition-all duration-150 hover:scale-125 ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 [.is-connecting_&]:opacity-100'}`}
                style={{ top: '50%', left: '100%', transform: 'translate(-50%, -50%)' }}
            />
        </>
    );
};

export default memo(ImageNode);
