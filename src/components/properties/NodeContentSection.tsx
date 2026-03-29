import React from 'react';
import { Node } from '@/lib/reactflowCompat';
import { NodeData } from '@/lib/types';
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { handlePropertyInputKeyDown } from './propertyInputBehavior';

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
    function handleContentKeyDown(
        event: React.KeyboardEvent<HTMLTextAreaElement>,
        delegate: (nextEvent: React.KeyboardEvent) => void
    ): void {
        handlePropertyInputKeyDown(event, { blurOnModifiedEnter: true });
        delegate(event);
    }

    return (
        <CollapsibleSection
            title="Content"
            icon={<AlignLeft className="w-3.5 h-3.5" />}
            isOpen={isOpen}
            onToggle={onToggle}
        >
            <div className="overflow-hidden rounded-[var(--brand-radius)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] shadow-sm transition-all">
                <div className="flex items-center justify-between gap-1.5 border-b border-[var(--color-brand-border)] bg-[var(--brand-surface)]/70 px-3 py-1.5">
                    <div className="relative group flex-shrink min-w-[60px]">
                        <select
                            value={selectedNode.data?.fontFamily || 'inter'}
                            onChange={(e) => onChange(selectedNode.id, { fontFamily: e.target.value })}
                            className="w-full cursor-pointer appearance-none truncate bg-transparent py-0.5 pr-2 text-[10px] font-semibold text-[var(--brand-text)] outline-none transition-colors hover:text-[var(--brand-primary)]"
                        >
                            <option value="inter">Inter</option>
                            <option value="roboto">Roboto</option>
                            <option value="outfit">Outfit</option>
                            <option value="playfair">Playfair</option>
                            <option value="fira">Mono</option>
                        </select>
                    </div>

                    <div className="h-3 w-px shrink-0 bg-[var(--color-brand-border)]"></div>

                    <div className="relative group shrink-0">
                        <select
                            value={selectedNode.data?.fontSize || '14'}
                            onChange={(e) => onChange(selectedNode.id, { fontSize: e.target.value })}
                            className="w-[36px] cursor-pointer appearance-none bg-transparent py-0.5 pl-1 text-right text-[10px] font-semibold text-[var(--brand-text)] outline-none transition-colors hover:text-[var(--brand-primary)]"
                        >
                            <option value="12">12</option>
                            <option value="14">14</option>
                            <option value="16">16</option>
                            <option value="20">20</option>
                            <option value="24">24</option>
                            <option value="32">32</option>
                        </select>
                    </div>

                    <div className="h-3 w-px shrink-0 bg-[var(--color-brand-border)]"></div>

                    <div className="flex items-center gap-0.5 shrink-0">
                        <button
                            onMouseDown={(e) => {
                                e.preventDefault();
                                onBold();
                            }}
                            className={`rounded p-1 transition-all duration-200 ${selectedNode.data?.fontWeight === 'bold' ? 'bg-[var(--brand-surface)] text-[var(--brand-text)] shadow ring-1 ring-black/5' : 'text-[var(--brand-secondary)] hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]'}`}
                            title="Bold (Cmd+B)"
                        >
                            <Bold className="w-3.5 h-3.5" strokeWidth={selectedNode.data?.fontWeight === 'bold' ? 3 : 2.5} />
                        </button>
                        <button
                            onMouseDown={(e) => {
                                e.preventDefault();
                                onItalic();
                            }}
                            className={`rounded p-1 transition-all duration-200 ${selectedNode.data?.fontStyle === 'italic' ? 'bg-[var(--brand-surface)] text-[var(--brand-text)] shadow ring-1 ring-black/5' : 'text-[var(--brand-secondary)] hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]'}`}
                            title="Italic (Cmd+I)"
                        >
                            <Italic className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="h-3 w-px shrink-0 bg-[var(--color-brand-border)]"></div>

                    <div className="flex items-center gap-0.5 shrink-0">
                        <button
                            onClick={() => onChange(selectedNode.id, { align: 'left' })}
                            className={`rounded p-1 transition-all duration-200 ${(selectedNode.data?.align === 'left') ? 'bg-[var(--brand-surface)] text-[var(--brand-text)] shadow ring-1 ring-black/5' : 'text-[var(--brand-secondary)] hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]'}`}
                            title="Align Left"
                        >
                            <AlignLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => onChange(selectedNode.id, { align: 'center' })}
                            className={`rounded p-1 transition-all duration-200 ${(!selectedNode.data?.align || selectedNode.data?.align === 'center') ? 'bg-[var(--brand-surface)] text-[var(--brand-text)] shadow ring-1 ring-black/5' : 'text-[var(--brand-secondary)] hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]'}`}
                            title="Align Center"
                        >
                            <AlignCenter className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => onChange(selectedNode.id, { align: 'right' })}
                            className={`rounded p-1 transition-all duration-200 ${(selectedNode.data?.align === 'right') ? 'bg-[var(--brand-surface)] text-[var(--brand-text)] shadow ring-1 ring-black/5' : 'text-[var(--brand-secondary)] hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]'}`}
                            title="Align Right"
                        >
                            <AlignRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                <div className="group/label border-b border-dashed border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-3 py-3 transition-colors hover:bg-[var(--brand-surface)]/90 focus-within:bg-[var(--brand-surface)]">
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
                        onKeyDown={(event) => handleContentKeyDown(event, onLabelKeyDown)}
                        placeholder="Type label here..."
                        rows={1}
                        style={{ minHeight: '32px' }}
                        className="w-full resize-none overflow-hidden bg-transparent text-[15px] leading-normal font-semibold text-[var(--brand-text)] outline-none placeholder:text-[var(--brand-secondary)]"
                    />
                </div>

                {!isText && !isImage && !isWireframeApp && !isWireframeMisc && (
                    <div className="group/desc relative bg-[var(--brand-background)]/35 transition-colors hover:bg-[var(--brand-background)]/55">
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
                            onKeyDown={(event) => handleContentKeyDown(event, onDescKeyDown)}
                            placeholder="Add description..."
                            rows={1}
                            style={{ minHeight: '40px' }}
                            className="w-full resize-none overflow-hidden bg-transparent px-3 py-2.5 text-xs leading-relaxed font-medium text-[var(--brand-secondary)] outline-none transition-colors placeholder:text-[var(--brand-secondary)] focus:bg-[var(--brand-surface)] focus:text-[var(--brand-text)]"
                        />
                        <div className="absolute bottom-1 right-2 pointer-events-none opacity-0 group-focus-within/desc:opacity-100 transition-opacity">
                            <span className="text-[9px] font-mono tracking-tight text-[var(--brand-secondary)]">Markdown supported</span>
                        </div>
                    </div>
                )}
            </div>
        </CollapsibleSection>
    );
}
