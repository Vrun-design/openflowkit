import React, { memo } from 'react';
import type { LegacyNodeProps } from '@/lib/reactflowCompat';
import type { NodeData } from '@/lib/types';
import { NodeChrome } from './NodeChrome';

function ImageNode({ data, selected }: LegacyNodeProps<NodeData>): React.ReactElement {
    return (
        <NodeChrome
            selected={Boolean(selected)}
            minWidth={50}
            minHeight={50}
            keepAspectRatio
            handleClassName="!w-3 !h-3 !border-2 !border-white transition-all duration-150 hover:scale-125"
        >
            <div
                className="relative group flex flex-col justify-center h-full transition-all duration-200"
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
        </NodeChrome>
    );
}

export default memo(ImageNode);
