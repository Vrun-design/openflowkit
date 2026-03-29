import React from 'react';
import { Node } from '@/lib/reactflowCompat';
import { NodeData } from '@/lib/types';
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, FileText } from 'lucide-react';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { Select, type SelectOption } from '../ui/Select';
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

const FONT_FAMILY_OPTIONS: SelectOption[] = [
    { value: 'inter', label: 'Inter' },
    { value: 'roboto', label: 'Roboto' },
    { value: 'outfit', label: 'Outfit' },
    { value: 'playfair', label: 'Playfair' },
    { value: 'fira', label: 'Mono' },
];

const LABEL_SIZE_OPTIONS: SelectOption[] = ['12', '14', '16', '18', '20', '24', '32', '48', '64'].map((size) => ({
    value: size,
    label: `${size}px`,
}));

const DESCRIPTION_SIZE_OPTIONS: SelectOption[] = ['10', '12', '14', '16', '18', '20', '24'].map((size) => ({
    value: size,
    label: `${size}px`,
}));

const SEGMENT_BUTTON_BASE_CLASS =
    'flex items-center justify-center h-7 w-8 rounded-[4px] transition-all duration-150';
const SEGMENT_BUTTON_ACTIVE_CLASS =
    'bg-[var(--brand-background)] text-[var(--brand-text)] shadow-sm ring-1 ring-black/5 dark:ring-white/10';
const SEGMENT_BUTTON_INACTIVE_CLASS =
    'text-[var(--brand-secondary)] hover:bg-[var(--brand-background)]/50 hover:text-[var(--brand-text)]';
const SEGMENT_GROUP_CLASS =
    'flex items-center rounded-[var(--radius-sm)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] p-[3px] shadow-[0_1px_2px_rgba(0,0,0,0.02)]';

function autoResizeTextarea(target: HTMLTextAreaElement): void {
    target.style.height = 'auto';
    target.style.height = `${target.scrollHeight}px`;
}

function getSegmentButtonClassName(active: boolean): string {
    return `${SEGMENT_BUTTON_BASE_CLASS} ${active ? SEGMENT_BUTTON_ACTIVE_CLASS : SEGMENT_BUTTON_INACTIVE_CLASS}`;
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

    const showDescriptionInput = !isText && !isImage && !isWireframeApp && !isWireframeMisc;
    const hasSubLabel = Boolean(selectedNode.data?.subLabel && selectedNode.data.subLabel.trim().length > 0);

    return (
        <CollapsibleSection
            title="Content"
            icon={<FileText className="h-4 w-4" />}
            isOpen={isOpen}
            onToggle={onToggle}
        >
            <div className="px-1 pb-4 pt-2">
                <div className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] shadow-sm transition-all focus-within:border-[var(--brand-primary)]/40 focus-within:ring-4 focus-within:ring-[var(--brand-primary)]/10 text-[var(--brand-text)]">
                    <textarea
                        ref={labelInputRef}
                        value={selectedNode.data?.label || ''}
                        onFocus={onLabelFocus}
                        onBlur={onLabelBlur}
                        onChange={(e) => {
                            onChange(selectedNode.id, { label: e.target.value });
                            autoResizeTextarea(e.target);
                        }}
                        onKeyDown={(event) => handleContentKeyDown(event, onLabelKeyDown)}
                        placeholder="Enter primary text..."
                        rows={1}
                        style={{ minHeight: '56px' }}
                        className="w-full resize-none border-0 bg-transparent px-3.5 py-3.5 text-[14px] font-semibold leading-relaxed outline-none placeholder:text-[var(--brand-secondary)]/50 focus:ring-0"
                    />

                    {showDescriptionInput && (
                        <div className="relative border-t border-[var(--color-brand-border)]/60 bg-[var(--brand-background)]/30 transition-colors focus-within:bg-[var(--brand-surface)]">
                            <textarea
                                ref={descInputRef}
                                value={selectedNode.data?.subLabel || ''}
                                onFocus={onDescFocus}
                                onBlur={onDescBlur}
                                onChange={(e) => {
                                    onChange(selectedNode.id, { subLabel: e.target.value });
                                    autoResizeTextarea(e.target);
                                }}
                                onKeyDown={(event) => handleContentKeyDown(event, onDescKeyDown)}
                                placeholder="Add descriptive text (Markdown supported)..."
                                rows={1}
                                style={{ minHeight: '48px' }}
                                className="w-full resize-none border-0 bg-transparent px-3.5 py-3 text-[12px] font-medium leading-relaxed text-[var(--brand-secondary)] outline-none placeholder:text-[var(--brand-secondary)]/50 focus:text-[var(--brand-text)] focus:ring-0"
                            />
                        </div>
                    )}

                    <div className="flex flex-col gap-2.5 border-t border-[var(--color-brand-border)] bg-[var(--brand-background)]/40 p-2.5">
                        <div className="w-full">
                            <Select
                                value={selectedNode.data?.fontFamily || 'inter'}
                                onChange={(val) => onChange(selectedNode.id, { fontFamily: val })}
                                options={FONT_FAMILY_OPTIONS}
                                placeholder="Font family"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="w-[85px] shrink-0">
                                <Select
                                    value={selectedNode.data?.fontSize || (isText ? '16' : '14')}
                                    onChange={(val) => onChange(selectedNode.id, { fontSize: val })}
                                    options={LABEL_SIZE_OPTIONS}
                                    placeholder="Size"
                                />
                            </div>

                            <div className="flex flex-1 items-center justify-end gap-1.5">
                                <div className={SEGMENT_GROUP_CLASS}>
                                    <button
                                        onMouseDown={(e) => { e.preventDefault(); onBold(); }}
                                        className={getSegmentButtonClassName(selectedNode.data?.fontWeight === 'bold')}
                                        title="Bold (Cmd+B)"
                                    >
                                        <Bold className="h-3.5 w-3.5" strokeWidth={selectedNode.data?.fontWeight === 'bold' ? 2.5 : 2} />
                                    </button>
                                    <button
                                        onMouseDown={(e) => { e.preventDefault(); onItalic(); }}
                                        className={getSegmentButtonClassName(selectedNode.data?.fontStyle === 'italic')}
                                        title="Italic (Cmd+I)"
                                    >
                                        <Italic className="h-3.5 w-3.5" />
                                    </button>
                                </div>

                                <div className={SEGMENT_GROUP_CLASS}>
                                    <button
                                        onClick={() => onChange(selectedNode.id, { align: 'left' })}
                                        className={getSegmentButtonClassName(selectedNode.data?.align === 'left')}
                                        title="Align Left"
                                    >
                                        <AlignLeft className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={() => onChange(selectedNode.id, { align: 'center' })}
                                        className={getSegmentButtonClassName(!selectedNode.data?.align || selectedNode.data?.align === 'center')}
                                        title="Align Center"
                                    >
                                        <AlignCenter className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={() => onChange(selectedNode.id, { align: 'right' })}
                                        className={getSegmentButtonClassName(selectedNode.data?.align === 'right')}
                                        title="Align Right"
                                    >
                                        <AlignRight className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {showDescriptionInput && hasSubLabel && (
                        <div className="flex flex-col gap-2.5 border-t border-dashed border-[var(--color-brand-border)] bg-[var(--brand-background)]/20 p-2.5">
                            <div className="flex items-center justify-between px-0.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-secondary)]">
                                    Secondary Style
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex-1">
                                    <Select
                                        value={selectedNode.data?.subLabelFontFamily || selectedNode.data?.fontFamily || 'inter'}
                                        onChange={(val) => onChange(selectedNode.id, { subLabelFontFamily: val })}
                                        options={FONT_FAMILY_OPTIONS}
                                        placeholder="Secondary Font"
                                    />
                                </div>
                                <div className="w-[85px] shrink-0">
                                    <Select
                                        value={selectedNode.data?.subLabelFontSize || '12'}
                                        onChange={(val) => onChange(selectedNode.id, { subLabelFontSize: val })}
                                        options={DESCRIPTION_SIZE_OPTIONS}
                                        placeholder="Size"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </CollapsibleSection>
    );
}
