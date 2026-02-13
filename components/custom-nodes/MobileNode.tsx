import React, { memo } from 'react';
import { NodeProps, NodeResizer, Handle, Position } from 'reactflow';
import { NodeData } from '../../types';
import { User, Lock, Mail, ChevronLeft, Menu, Bell, Search } from 'lucide-react';
import { NODE_COLOR_PALETTE } from '../../theme';

function MobileNode({ data, selected }: NodeProps<NodeData>): React.ReactElement {
    const style = NODE_COLOR_PALETTE[data.color || 'slate'];

    // Render content based on variant
    const renderContent = () => {
        if (data.imageUrl) {
            return (
                <img
                    src={data.imageUrl}
                    alt="Mobile Content"
                    className="w-full h-full object-cover"
                />
            );
        }

        switch (data.variant) {
            case 'login': // Clean Mobile Login
                return (
                    <div className="flex flex-col items-center justify-center h-full p-6 space-y-5 bg-white">
                        <div className={`w-14 h-14 ${style.iconBg} rounded-2xl flex items-center justify-center mb-1`}>
                            <div className={`w-8 h-8 rounded-full bg-white opacity-50`} />
                        </div>
                        <div className="w-full space-y-3">
                            <div className="h-10 bg-slate-50 rounded-xl border border-slate-100 flex items-center px-4">
                                <div className="w-16 h-2 bg-slate-200 rounded-sm" />
                            </div>
                            <div className="h-10 bg-slate-50 rounded-xl border border-slate-100 flex items-center px-4">
                                <div className="w-12 h-2 bg-slate-200 rounded-sm" />
                            </div>
                        </div>
                        <div className={`w-full h-10 ${style.bg} rounded-xl shadow-sm flex items-center justify-center`}>
                            <div className="w-12 h-2 bg-white opacity-90 rounded-sm" />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <div className="w-10 h-10 rounded-full bg-slate-100" />
                            <div className="w-10 h-10 rounded-full bg-slate-100" />
                            <div className="w-10 h-10 rounded-full bg-slate-100" />
                        </div>
                    </div>
                );

            case 'social': // Social Feed Post
                return (
                    <div className="flex flex-col h-full bg-slate-50">
                        {/* Header */}
                        <div className="h-12 bg-white flex items-center px-4 border-b border-slate-100">
                            <div className="w-24 h-4 bg-slate-800 rounded-sm" />
                        </div>
                        {/* Feed Item */}
                        <div className="bg-white mt-2 pb-4">
                            <div className="flex items-center gap-2 p-3">
                                <div className="w-8 h-8 rounded-full bg-slate-200" />
                                <div className="w-16 h-2.5 bg-slate-700 rounded-sm" />
                            </div>
                            <div className="aspect-square bg-slate-100 w-full flex items-center justify-center text-slate-300">
                                <div className="w-12 h-12 rounded-lg border-2 border-slate-300 border-dashed" />
                            </div>
                            <div className="p-3 space-y-2">
                                <div className="flex gap-3">
                                    <div className="w-5 h-5 rounded-full bg-slate-200" />
                                    <div className="w-5 h-5 rounded-full bg-slate-200" />
                                    <div className="w-5 h-5 rounded-full bg-slate-200" />
                                </div>
                                <div className="w-2/3 h-2 bg-slate-200 rounded-sm mt-2" />
                                <div className="w-1/3 h-2 bg-slate-100 rounded-sm" />
                            </div>
                        </div>
                    </div>
                );

            case 'chat': // Messaging App
                return (
                    <div className="flex flex-col h-full bg-white">
                        {/* Header */}
                        <div className="h-12 border-b border-slate-100 flex items-center px-4 gap-3 bg-white z-10">
                            <ChevronLeft className="w-5 h-5 text-slate-400" />
                            <div className="w-8 h-8 rounded-full bg-slate-200" />
                            <div className="w-20 h-2.5 bg-slate-800 rounded-sm" />
                        </div>
                        {/* Messages */}
                        <div className="flex-1 p-4 space-y-4 bg-slate-50">
                            <div className="flex gap-2">
                                <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
                                <div className="bg-white p-2.5 rounded-2xl rounded-tl-sm shadow-sm max-w-[70%] space-y-1.5">
                                    <div className="w-32 h-2 bg-slate-200 rounded-sm" />
                                    <div className="w-20 h-2 bg-slate-200 rounded-sm" />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <div className={`${style.bg} p-2.5 rounded-2xl rounded-tr-sm shadow-sm max-w-[70%]`}>
                                    <div className="w-24 h-2 bg-white opacity-90 rounded-sm" />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
                                <div className="bg-white p-2 rounded-2xl rounded-tl-sm shadow-sm max-w-[70%] flex items-center justify-center h-24 w-40">
                                    <div className="w-8 h-8 rounded border-2 border-slate-100 border-dashed" />
                                </div>
                            </div>
                        </div>
                        {/* Input */}
                        <div className="h-14 border-t border-slate-100 p-3 bg-white">
                            <div className="h-full bg-slate-100 rounded-full px-4 flex items-center">
                                <div className="w-32 h-2 bg-slate-300 rounded-sm" />
                            </div>
                        </div>
                    </div>
                );

            case 'product': // Ecommerce Product
                return (
                    <div className="flex flex-col h-full bg-white">
                        <div className="h-[45%] bg-slate-100 flex items-center justify-center relative">
                            <div className="w-24 h-24 rounded-lg bg-white shadow-sm flex items-center justify-center">
                                <div className="w-12 h-12 rounded border-2 border-slate-100 border-dashed" />
                            </div>
                            <div className="absolute top-4 right-4 w-8 h-8 bg-white rounded-full shadow-sm flex items-center justify-center">
                                <div className="w-4 h-4 bg-slate-200 rounded-full" />
                            </div>
                        </div>
                        <div className="flex-1 p-5 flex flex-col">
                            <div className="space-y-2 mb-4">
                                <div className="w-full h-4 bg-slate-800 rounded-sm" />
                                <div className="w-2/3 h-4 bg-slate-800 rounded-sm" />
                            </div>
                            <div className="w-16 h-4 bg-slate-200 rounded-sm mb-6" />
                            <div className="space-y-3 mt-auto">
                                <div className="w-full h-2 bg-slate-100 rounded-sm" />
                                <div className="w-full h-2 bg-slate-100 rounded-sm" />
                                <div className="w-2/3 h-2 bg-slate-100 rounded-sm" />
                            </div>
                        </div>
                        {/* Bottom Bar */}
                        <div className="h-20 border-t border-slate-100 p-4 flex items-center gap-4 bg-white">
                            <div className="flex-1 space-y-1">
                                <div className="w-10 h-2 bg-slate-400 rounded-sm" />
                                <div className="w-16 h-3 bg-slate-800 rounded-sm" />
                            </div>
                            <div className={`w-32 h-12 ${style.bg} rounded-xl shadow-sm flex items-center justify-center`}>
                                <div className="w-12 h-2 bg-white rounded-sm" />
                            </div>
                        </div>
                    </div>
                );

            case 'list':
            case 'profile':
                // Keep minimal list view
                return (
                    <div className="flex flex-col h-full bg-white">
                        <div className={`h-12 border-b border-slate-100 flex items-center px-4 justify-between`}>
                            <div className="w-24 h-3 bg-slate-800 rounded-sm" />
                            <div className={`w-6 h-6 rounded-full bg-slate-100`} />
                        </div>
                        <div className="flex-1 p-3 space-y-2">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className={`flex items-center gap-3 p-2 border border-slate-50 rounded-lg`}>
                                    <div className="w-10 h-10 rounded-lg bg-slate-100 shrink-0" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="h-2.5 w-32 bg-slate-800 rounded-sm opacity-80" />
                                        <div className="h-2 w-20 bg-slate-300 rounded-sm" />
                                    </div>
                                    <div className="w-4 h-4 rounded-full bg-slate-100" />
                                </div>
                            ))}
                        </div>
                    </div>
                );

            default:
                return (
                    <div className={`flex-1 ${style.iconBg} bg-opacity-30 relative p-4 flex flex-col items-center justify-center`}>
                        <div className="text-slate-200">
                            <div className={`w-12 h-20 rounded border-2 ${style.border} border-dashed`} />
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="group relative w-full h-full">
            <NodeResizer
                color="#94a3b8"
                isVisible={selected}
                minWidth={300}
                minHeight={600}
                lineStyle={{ borderStyle: 'solid', borderWidth: 1 }}
                handleStyle={{ width: 8, height: 8, borderRadius: 4 }}
            />

            <div
                className={`
                    relative flex flex-col w-full h-full 
                    bg-white rounded-[2.5rem] shadow-sm border ${style.border}
                    overflow-hidden transition-all duration-200
                    ${selected ? `ring-2 ${style.ring} ring-offset-4` : ''}
                `}
                style={{ minWidth: 300, minHeight: 600 }}
            >
                {/* Notch / Status Bar Area */}
                <div className={`h-10 bg-white flex items-center justify-center px-6 relative shrink-0 border-b ${style.border} border-opacity-30`}>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-32 bg-slate-100 rounded-b-2xl border-b border-l border-r border-slate-200" />
                    <div className="w-full flex justify-between items-center text-[10px] text-slate-400 pt-2 px-2">
                        <span>9:41</span>
                        <div className="flex gap-1">
                            <div className="w-3 h-2 bg-slate-200 rounded-[1px]" />
                            <div className="w-3 h-2 bg-slate-200 rounded-[1px]" />
                            <div className="w-4 h-2 bg-slate-300 rounded-[1px]" />
                        </div>
                    </div>
                </div>

                {/* Screen Content */}
                <div className="flex-1 bg-white relative overflow-hidden flex flex-col">
                    {renderContent()}

                    {/* Dynamic Label Overlay - Subtler */}
                    {data.label && !['list', 'profile'].includes(data.variant || '') && (
                        <div className="absolute top-2 left-0 right-0 text-center font-medium text-slate-300 pointer-events-none text-[10px] uppercase tracking-wider">
                            {data.label}
                        </div>
                    )}
                </div>

                {/* Home Indicator */}
                <div className="h-6 bg-white shrink-0 flex items-center justify-center pt-2 pb-2">
                    <div className="w-28 h-1 bg-slate-200 rounded-full" />
                </div>
            </div>

            {/* Connection Handles - Mirrored from CustomNode */}
            <Handle
                type="source"
                position={Position.Top}
                id="top"
                isConnectableStart={true}
                isConnectableEnd={true}
                className={`!w-3 !h-3 !border-2 !border-white ${style.handle} transition-all duration-150 hover:scale-125 ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                style={{ left: '50%', top: 0, transform: 'translate(-50%, -50%)', pointerEvents: 'all', zIndex: 100 }}
            />
            <Handle
                type="source"
                position={Position.Bottom}
                id="bottom"
                isConnectableStart={true}
                isConnectableEnd={true}
                className={`!w-3 !h-3 !border-2 !border-white ${style.handle} transition-all duration-150 hover:scale-125 ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                style={{ left: '50%', top: '100%', transform: 'translate(-50%, -50%)', pointerEvents: 'all', zIndex: 100 }}
            />
            <Handle
                type="source"
                position={Position.Left}
                id="left"
                isConnectableStart={true}
                isConnectableEnd={true}
                className={`!w-3 !h-3 !border-2 !border-white ${style.handle} transition-all duration-150 hover:scale-125 ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                style={{ top: '50%', left: 0, transform: 'translate(-50%, -50%)', pointerEvents: 'all', zIndex: 100 }}
            />
            <Handle
                type="source"
                position={Position.Right}
                id="right"
                isConnectableStart={true}
                isConnectableEnd={true}
                className={`!w-3 !h-3 !border-2 !border-white ${style.handle} transition-all duration-150 hover:scale-125 ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                style={{ top: '50%', left: '100%', transform: 'translate(-50%, -50%)', pointerEvents: 'all', zIndex: 100 }}
            />
        </div>
    );
}

export default memo(MobileNode);
