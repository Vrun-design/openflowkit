import React, { memo } from 'react';
import { NodeProps, NodeResizer, Handle, Position } from 'reactflow';
import { NodeData } from '../../types';
import { Layout, Cookie, Lock, X, Menu, Search } from 'lucide-react';

import { NODE_COLOR_PALETTE } from '../../theme';

const BrowserNode = ({ data, selected }: NodeProps<NodeData>): React.ReactElement => {
    const style = NODE_COLOR_PALETTE[data.color || 'slate'];

    // Render content based on variant
    const renderContent = () => {
        if (data.imageUrl) {
            return (
                <img
                    src={data.imageUrl}
                    alt="Browser Content"
                    className="w-full h-full object-cover object-top"
                />
            );
        }

        switch (data.variant) {
            case 'landing': // SaaS Landing
                return (
                    <div className="flex flex-col h-full bg-white">
                        {/* Hero */}
                        <div className={`flex-1 ${style.iconBg} bg-opacity-10 flex flex-col items-center justify-center p-6 space-y-3`}>
                            <div className="text-center space-y-2">
                                <div className="h-4 w-32 bg-slate-800 rounded-lg mx-auto opacity-80" />
                                <div className="h-2 w-48 bg-slate-400 rounded-md mx-auto opacity-60" />
                            </div>
                            <div className="flex gap-2 mt-4">
                                <div className={`h-6 w-16 ${style.bg} rounded-md shadow-sm`} />
                                <div className="h-6 w-16 bg-white border border-slate-200 rounded-md" />
                            </div>
                        </div>
                        {/* Features Grid */}
                        <div className="h-1/3 border-t border-slate-100 grid grid-cols-3 divide-x divide-slate-100">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="p-3 space-y-2 flex flex-col items-center justify-center">
                                    <div className={`w-8 h-8 rounded-full ${style.iconBg} mb-1`} />
                                    <div className="h-1.5 w-12 bg-slate-200 rounded-sm" />
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'dashboard': // Admin Dashboard
                return (
                    <div className="flex h-full bg-slate-50">
                        {/* Sidebar */}
                        <div className="w-12 border-r border-slate-200 bg-white flex flex-col items-center py-3 space-y-3">
                            <div className={`w-6 h-6 rounded-md ${style.bg}`} />
                            <div className="w-4 h-0.5 bg-slate-200" />
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="w-6 h-6 rounded-md bg-slate-100" />
                            ))}
                        </div>
                        {/* Main Content */}
                        <div className="flex-1 flex flex-col">
                            {/* Top Bar */}
                            <div className="h-10 border-b border-slate-200 bg-white flex items-center justify-between px-4">
                                <div className="w-24 h-2 bg-slate-200 rounded-sm" />
                                <div className="w-6 h-6 rounded-full bg-slate-200" />
                            </div>
                            {/* Dashboard Grid */}
                            <div className="p-3 grid grid-cols-2 gap-3 flex-1 overflow-hidden">
                                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-2 space-y-2">
                                    <div className="w-8 h-2 bg-slate-200 rounded-sm" />
                                    <div className={`w-full h-16 ${style.iconBg} bg-opacity-20 rounded-md flex items-end justify-center gap-1 pb-1 px-2`}>
                                        <div className={`w-2 h-6 ${style.bg} opacity-40`} />
                                        <div className={`w-2 h-10 ${style.bg} opacity-60`} />
                                        <div className={`w-2 h-8 ${style.bg} opacity-50`} />
                                        <div className={`w-2 h-12 ${style.bg}`} />
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-2 space-y-2">
                                    <div className="w-12 h-2 bg-slate-200 rounded-sm" />
                                    <div className="space-y-1.5">
                                        <div className="w-full h-1.5 bg-slate-100 rounded-sm" />
                                        <div className="w-3/4 h-1.5 bg-slate-100 rounded-sm" />
                                        <div className="w-full h-1.5 bg-slate-100 rounded-sm" />
                                    </div>
                                </div>
                                <div className="col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm p-2 flex items-center gap-3">
                                    <div className="flex-1 h-2 bg-slate-100 rounded-sm" />
                                    <div className="flex-1 h-2 bg-slate-100 rounded-sm" />
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'form': // Signup / Contact Form
                return (
                    <div className={`flex items-center justify-center h-full ${style.iconBg} bg-opacity-5`}>
                        <div className="bg-white rounded-lg shadow-sm border border-slate-200 w-3/5 p-4 space-y-3">
                            <div className="space-y-1 text-center mb-2">
                                <div className="w-1/2 h-2.5 bg-slate-800 rounded-sm mx-auto" />
                                <div className="w-3/4 h-1.5 bg-slate-300 rounded-sm mx-auto" />
                            </div>
                            <div className="space-y-2">
                                <div className="h-6 w-full border border-slate-200 rounded bg-slate-50" />
                                <div className="h-6 w-full border border-slate-200 rounded bg-slate-50" />
                            </div>
                            <div className={`h-6 w-full ${style.bg} rounded shadow-sm mt-1`} />
                        </div>
                    </div>
                );

            case 'cookie': // Cookie Consent / GDPR Banner
                return (
                    <div className="flex flex-col h-full bg-slate-50 relative">
                        {/* Background Content (blurred/dimmed) */}
                        <div className="flex-1 p-4 opacity-50 flex flex-col items-center space-y-4">
                            <div className="w-3/4 h-32 bg-white border border-slate-200 rounded-lg shadow-sm" />
                            <div className="w-full h-4 bg-slate-200 rounded-sm" />
                            <div className="w-2/3 h-4 bg-slate-200 rounded-sm" />
                        </div>

                        {/* Overlay for depth */}
                        <div className="absolute inset-0 bg-slate-900/10 z-10" />

                        {/* Cookie Banner */}
                        <div className={`absolute bottom-0 left-0 right-0 bg-white border-t ${style.border} p-4 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]`}>
                            <div className="flex gap-3 items-start">
                                <Cookie className={`w-6 h-6 ${style.text} shrink-0 mt-1`} />
                                <div className="flex-1 space-y-2">
                                    <div className="w-32 h-2.5 bg-slate-800 rounded-sm" />
                                    <div className="space-y-1.5">
                                        <div className="w-full h-1.5 bg-slate-300 rounded-sm" />
                                        <div className="w-4/5 h-1.5 bg-slate-300 rounded-sm" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-3 pl-9">
                                <div className="h-7 w-20 bg-slate-800 rounded-md shadow-sm" />
                                <div className={`h-7 w-20 bg-white border ${style.border} rounded-md`} />
                            </div>
                        </div>
                    </div>
                );

            case 'pricing': // Pricing Tables
                return (
                    <div className="flex flex-col h-full bg-slate-50">
                        {/* Header */}
                        <div className="h-16 flex flex-col items-center justify-center space-y-1.5 border-b border-slate-100 bg-white">
                            <div className="w-32 h-2.5 bg-slate-800 rounded-sm" />
                            <div className="w-48 h-1.5 bg-slate-300 rounded-sm" />
                        </div>
                        {/* Pricing Grid */}
                        <div className="flex-1 p-4 grid grid-cols-3 gap-3 items-center">
                            {[1, 2, 3].map(i => (
                                <div key={i} className={`bg-white rounded-lg shadow-sm border ${i === 2 ? style.border : 'border-slate-200'} p-2 flex flex-col h-full relative overflow-hidden`}>
                                    {i === 2 && <div className={`absolute top-0 inset-x-0 h-1 ${style.bg}`} />}
                                    <div className="space-y-1.5 mb-3 text-center flex flex-col items-center pt-2">
                                        <div className="w-8 h-2 bg-slate-400 rounded-sm" />
                                        <div className="w-12 h-4 bg-slate-800 rounded-sm" />
                                    </div>
                                    <div className="space-y-1.5 flex-1">
                                        <div className="w-full h-1 bg-slate-100 rounded-sm" />
                                        <div className="w-full h-1 bg-slate-100 rounded-sm" />
                                        <div className="w-2/3 h-1 bg-slate-100 rounded-sm" />
                                    </div>
                                    <div className={`mt-3 w-full h-5 ${i === 2 ? style.bg : 'bg-slate-100'} rounded-sm`} />
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'modal':
                return (
                    <div className="relative w-full h-full bg-slate-900/10 flex items-center justify-center p-4">
                        <div className="relative bg-white w-4/5 rounded-lg shadow-lg border border-slate-200 p-4 flex flex-col gap-3">
                            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                <div className="w-24 h-2.5 bg-slate-800 rounded-sm" />
                                <div className="w-3 h-3 rounded-full bg-slate-200" />
                            </div>
                            <div className="space-y-2">
                                <div className="w-full h-2 bg-slate-100 rounded-sm" />
                                <div className="w-full h-2 bg-slate-100 rounded-sm" />
                                <div className="w-2/3 h-2 bg-slate-100 rounded-sm" />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <div className="w-16 h-6 bg-slate-100 rounded-md" />
                                <div className={`w-16 h-6 ${style.bg} rounded-md`} />
                            </div>
                        </div>
                    </div>
                );

            default:
                return (
                    <div className={`flex-1 ${style.iconBg} bg-opacity-30 relative p-4 flex flex-col items-center justify-center border-t ${style.border}`}>
                        <div className={style.iconColor}>
                            <Layout className="w-8 h-8 opacity-50" />
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
                minWidth={200}
                minHeight={150}
                lineStyle={{ borderStyle: 'solid', borderWidth: 1 }}
                handleStyle={{ width: 8, height: 8, borderRadius: 4 }}
            />

            <div
                className={`
                    relative flex flex-col w-full h-full 
                    bg-white rounded-xl shadow-sm border ${style.border}
                    overflow-hidden transition-all duration-200
                    ${selected ? `ring-2 ${style.ring} ring-offset-2` : ''}
                `}
                style={{ minWidth: 200, minHeight: 150 }}
            >
                {/* Browser Header - Cleaner, Monochrome */}
                <div className={`h-9 bg-white border-b ${style.border} flex items-center px-3 gap-3 shrink-0`}>
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                    </div>
                    {/* URL Bar */}
                    <div className={`flex-1 h-6 ${style.iconBg} rounded-md border ${style.border} border-opacity-50 flex items-center px-2 text-slate-300 text-[10px]`}>
                        {data.icon === 'lock' && <Lock className="w-2.5 h-2.5 mr-1.5 opacity-50" />}
                        <span className="truncate">{data.label || 'example.com'}</span>
                    </div>
                </div>

                {/* Content Area */}
                {renderContent()}
            </div>

            {/* Connection Handles - Mirrored from CustomNode for consistency */}
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

export default memo(BrowserNode);
