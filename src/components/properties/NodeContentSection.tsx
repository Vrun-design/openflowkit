import React from 'react';
import { Node } from 'reactflow';
import { NodeData } from '@/lib/types';
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { CollapsibleSection } from '../ui/CollapsibleSection';

interface NodeContentSectionProps {
    selectedNode: Node<NodeData>;
    onChange: (id: string, data: Partial<NodeData>) => void;
    isOpen: boolean;
    onToggle: () => void;
    isText: boolean;
    isImage: boolean;
    isWireframeApp: boolean;
    isWireframeMisc: boolean;
    onBold: () => void;
    onItalic: () => void;
    labelInputRef: React.RefObject<HTMLTextAreaElement>;
    descInputRef: React.RefObject<HTMLTextAreaElement>;
    onLabelFocus: () => void;
    onLabelBlur: () => void;
    onDescFocus: () => void;
    onDescBlur: () => void;
    onLabelKeyDown: (e: React.KeyboardEvent) => void;
    onDescKeyDown: (e: React.KeyboardEvent) => void;
}

export function NodeContentSection({
    selectedNode,
    onChange,
    isOpen,
    onToggle,
    isText,
    isImage,
    isWireframeApp,
    isWireframeMisc,
    onBold,
    onItalic,
    labelInputRef,
    descInputRef,
    onLabelFocus,
    onLabelBlur,
    onDescFocus,
    onDescBlur,
    onLabelKeyDown,
    onDescKeyDown,
}: NodeContentSectionProps): React.ReactElement {
    return (
        <CollapsibleSection
            title="Content"
            icon={<AlignLeft className="w-3.5 h-3.5" />}
            isOpen={isOpen}
            onToggle={onToggle}
        >
            <div className="bg-[var(--brand-background)] rounded-[var(--brand-radius)] border border-slate-200 overflow-hidden shadow-sm transition-all">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 bg-slate-50/80 gap-1.5">
                    <div className="relative group flex-shrink min-w-[60px]">
                        <select
                            value={selectedNode.data?.fontFamily || 'inter'}
                            onChange={(e) => onChange(selectedNode.id, { fontFamily: e.target.value })}
                            className="w-full appearance-none bg-transparent text-[10px] font-semibold text-slate-700 hover:text-slate-900 cursor-pointer outline-none transition-colors py-0.5 truncate pr-2"
                        >
                            <option value="inter">Inter</option>
                            <option value="roboto">Roboto</option>
                            <option value="outfit">Outfit</option>
                            <option value="playfair">Playfair</option>
                            <option value="fira">Mono</option>
                        </select>
                    </div>

                    <div className="w-px h-3 bg-slate-200 shrink-0"></div>

                    <div className="relative group shrink-0">
                        <select
                            value={selectedNode.data?.fontSize || '14'}
                            onChange={(e) => onChange(selectedNode.id, { fontSize: e.target.value })}
                            className="appearance-none bg-transparent text-[10px] font-semibold text-slate-700 hover:text-slate-900 cursor-pointer outline-none transition-colors text-right pl-1 py-0.5 w-[36px]"
                        >
                            <option value="12">12</option>
                            <option value="14">14</option>
                            <option value="16">16</option>
                            <option value="20">20</option>
                            <option value="24">24</option>
                            <option value="32">32</option>
                        </select>
                    </div>

                    <div className="w-px h-3 bg-slate-200 shrink-0"></div>

                    <div className="flex items-center gap-0.5 shrink-0">
                        <button
                            onMouseDown={(e) => {
                                e.preventDefault();
                                onBold();
                            }}
                            className={`p-1 rounded transition-all duration-200 ${selectedNode.data?.fontWeight === 'bold' ? 'bg-white shadow text-slate-900 ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}
                            title="Bold (Cmd+B)"
                        >
                            <Bold className="w-3.5 h-3.5" strokeWidth={selectedNode.data?.fontWeight === 'bold' ? 3 : 2.5} />
                        </button>
                        <button
                            onMouseDown={(e) => {
                                e.preventDefault();
                                onItalic();
                            }}
                            className={`p-1 rounded transition-all duration-200 ${selectedNode.data?.fontStyle === 'italic' ? 'bg-white shadow text-slate-900 ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}
                            title="Italic (Cmd+I)"
                        >
                            <Italic className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="w-px h-3 bg-slate-200 shrink-0"></div>

                    <div className="flex items-center gap-0.5 shrink-0">
                        <button
                            onClick={() => onChange(selectedNode.id, { align: 'left' })}
                            className={`p-1 rounded transition-all duration-200 ${(selectedNode.data?.align === 'left') ? 'bg-white shadow text-slate-900 ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}
                            title="Align Left"
                        >
                            <AlignLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => onChange(selectedNode.id, { align: 'center' })}
                            className={`p-1 rounded transition-all duration-200 ${(!selectedNode.data?.align || selectedNode.data?.align === 'center') ? 'bg-white shadow text-slate-900 ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}
                            title="Align Center"
                        >
                            <AlignCenter className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => onChange(selectedNode.id, { align: 'right' })}
                            className={`p-1 rounded transition-all duration-200 ${(selectedNode.data?.align === 'right') ? 'bg-white shadow text-slate-900 ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}
                            title="Align Right"
                        >
                            <AlignRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                <div className="px-3 py-3 border-b border-dashed border-slate-100 bg-white group/label hover:bg-slate-50/20 focus-within:bg-slate-50/30 transition-colors">
                    <textarea
                        ref={labelInputRef}
                        value={selectedNode.data?.label || ''}
                        onFocus={onLabelFocus}
                        onBlur={onLabelBlur}
                        onChange={(e) => {
                            onChange(selectedNode.id, { label: e.target.value });
                            e.target.style.height = 'auto';
                            e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        onKeyDown={onLabelKeyDown}
                        placeholder="Type label here..."
                        rows={1}
                        style={{ minHeight: '32px' }}
                        className="w-full bg-transparent text-[15px] font-semibold text-[var(--brand-text)] outline-none resize-none placeholder:text-slate-300 leading-normal overflow-hidden"
                    />
                </div>

                {!isText && !isImage && !isWireframeApp && !isWireframeMisc && (
                    <div className="relative group/desc bg-slate-50/20 hover:bg-slate-50/40 transition-colors">
                        <textarea
                            ref={descInputRef}
                            value={selectedNode.data?.subLabel || ''}
                            onFocus={onDescFocus}
                            onBlur={onDescBlur}
                            onChange={(e) => {
                                onChange(selectedNode.id, { subLabel: e.target.value });
                                e.target.style.height = 'auto';
                                e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                            onKeyDown={onDescKeyDown}
                            placeholder="Add description..."
                            rows={1}
                            style={{ minHeight: '40px' }}
                            className="w-full px-3 py-2.5 text-xs font-medium text-slate-600 outline-none resize-none leading-relaxed placeholder:text-slate-300 bg-transparent focus:bg-white focus:text-slate-800 transition-colors overflow-hidden"
                        />
                        <div className="absolute bottom-1 right-2 pointer-events-none opacity-0 group-focus-within/desc:opacity-100 transition-opacity">
                            <span className="text-[9px] font-mono text-slate-300 tracking-tight">Markdown supported</span>
                        </div>
                    </div>
                )}
            </div>
        </CollapsibleSection>
    );
}
