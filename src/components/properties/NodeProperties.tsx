import React, { useRef, useState, useEffect } from 'react';
import { Node } from 'reactflow';
import { NodeData } from '@/lib/types';
import { Bold, Italic, List, ListOrdered, Code, Quote, Heading1, CheckSquare, Copy, Trash2, Box, AlignLeft, AlignCenter, AlignRight, Image as ImageIcon, Type, Layout, Palette, Star, Image as ImageStart } from 'lucide-react';
import { useFlowStore } from '@/store';
import { Button } from '../ui/Button';
import { ShapeSelector } from './ShapeSelector';
import { ColorPicker } from './ColorPicker';
import { IconPicker } from './IconPicker';
import { ImageUpload } from './ImageUpload';
import { CollapsibleSection } from '../ui/CollapsibleSection';

interface NodePropertiesProps {
    selectedNode: Node<NodeData>;
    onChange: (id: string, data: Partial<NodeData>) => void;
    onDuplicate: (id: string) => void;
    onDelete: (id: string) => void;
}

// Helper: Markdown Insertion Logic & Shortcuts
const useMarkdownEditor = (
    ref: React.RefObject<HTMLTextAreaElement | HTMLInputElement>,
    onChange: (val: string) => void,
    value: string
) => {
    // Smart Insert / Toggle
    const insert = (prefix: string, suffix: string = '') => {
        if (!ref.current) return;
        const el = ref.current;
        const start = el.selectionStart || 0;
        const end = el.selectionEnd || 0;

        const selection = value.substring(start, end);
        const before = value.substring(0, start);
        const after = value.substring(end);

        // Check if wrapped (Toggle Logic)
        const isWrapped = before.endsWith(prefix) && after.startsWith(suffix);
        const isSelectedWrapped = selection.startsWith(prefix) && selection.endsWith(suffix);

        let newValue;
        let newStart, newEnd;

        if (isWrapped) {
            // Remove simple wrap (cursor between tags)
            newValue = before.slice(0, -prefix.length) + selection + after.slice(suffix.length);
            newStart = start - prefix.length;
            newEnd = end - prefix.length;
        } else if (isSelectedWrapped && selection.length > prefix.length + suffix.length) {
            // Remove internal wrap (selection contains tags)
            newValue = before + selection.slice(prefix.length, -suffix.length) + after;
            newStart = start;
            newEnd = end - (prefix.length + suffix.length);
        } else {
            // Add Wrap
            newValue = before + prefix + selection + suffix + after;
            newStart = start + prefix.length;
            newEnd = end + prefix.length;
        }

        const syntheticE = { target: { value: newValue } } as any;
        onChange(newValue);
        // We rely on React to re-render, then we restore cursor

        requestAnimationFrame(() => {
            if (ref.current) {
                ref.current.focus();
                ref.current.setSelectionRange(newStart, newEnd);
            }
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.metaKey || e.ctrlKey) {
            switch (e.key.toLowerCase()) {
                case 'b': e.preventDefault(); insert('**', '**'); break;
                case 'i': e.preventDefault(); insert('_', '_'); break;
                case 'e': e.preventDefault(); insert('`', '`'); break;
            }
        }
    };

    return { insert, handleKeyDown };
};

const MarkdownToolbar = ({ onInsert, simple = false }: { onInsert: (p: string, s?: string) => void, simple?: boolean }) => {
    const buttonStyle = useFlowStore(state => state.brandConfig.ui.buttonStyle);
    const isBeveled = buttonStyle === 'beveled';

    return (
        <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
            <button onClick={() => onInsert('**', '**')} className={`p-1.5 text-[var(--brand-secondary)] hover:bg-[var(--brand-background)] rounded ${isBeveled ? 'btn-beveled' : ''}`} title="Bold"><Bold className="w-3.5 h-3.5" /></button>
            <button onClick={() => onInsert('_', '_')} className={`p-1.5 text-[var(--brand-secondary)] hover:bg-[var(--brand-background)] rounded ${isBeveled ? 'btn-beveled' : ''}`} title="Italic"><Italic className="w-3.5 h-3.5" /></button>
            <button onClick={() => onInsert('`', '`')} className={`p-1.5 text-[var(--brand-secondary)] hover:bg-[var(--brand-background)] rounded ${isBeveled ? 'btn-beveled' : ''}`} title="Code"><Code className="w-3.5 h-3.5" /></button>
            {!simple && (
                <>
                    <div className="w-px h-4 bg-slate-200 mx-0.5"></div>
                    <button onClick={() => onInsert('### ')} className={`p-1.5 text-[var(--brand-secondary)] hover:bg-[var(--brand-background)] rounded ${isBeveled ? 'btn-beveled' : ''}`}><Heading1 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => onInsert('> ')} className={`p-1.5 text-[var(--brand-secondary)] hover:bg-[var(--brand-background)] rounded ${isBeveled ? 'btn-beveled' : ''}`}><Quote className="w-3.5 h-3.5" /></button>
                    <div className="w-px h-4 bg-slate-200 mx-0.5"></div>
                    <button onClick={() => onInsert('- ')} className={`p-1.5 text-[var(--brand-secondary)] hover:bg-[var(--brand-background)] rounded ${isBeveled ? 'btn-beveled' : ''}`}><List className="w-3.5 h-3.5" /></button>
                    <button onClick={() => onInsert('1. ')} className={`p-1.5 text-[var(--brand-secondary)] hover:bg-[var(--brand-background)] rounded ${isBeveled ? 'btn-beveled' : ''}`}><ListOrdered className="w-3.5 h-3.5" /></button>
                    <button onClick={() => onInsert('- [ ] ')} className={`p-1.5 text-[var(--brand-secondary)] hover:bg-[var(--brand-background)] rounded ${isBeveled ? 'btn-beveled' : ''}`}><CheckSquare className="w-3.5 h-3.5" /></button>
                </>
            )}
        </div>
    );
};

export const NodeProperties: React.FC<NodePropertiesProps> = ({
    selectedNode,
    onChange,
    onDuplicate,
    onDelete
}) => {
    const isAnnotation = selectedNode.type === 'annotation';
    const isText = selectedNode.type === 'text';
    const isImage = selectedNode.type === 'image';
    const isWireframe = selectedNode.type === 'browser' || selectedNode.type === 'mobile';

    // State for progressive disclosure (accordion)
    // Initialize open section based on node type
    const [activeSection, setActiveSection] = useState<string>('content');

    // Reset/Set default active section when selected node type changes
    useEffect(() => {
        if (isWireframe) setActiveSection('variant');
        else if (isText) setActiveSection('content'); // Text nodes prioritize content
        else if (isAnnotation) setActiveSection('content');
        else setActiveSection('appearance'); // Standard nodes prioritize shape/appearance
    }, [selectedNode.id, selectedNode.type]); // Re-run when selection changes

    const toggleSection = (section: string) => {
        if (section === 'typography') {
            setActiveSection(current => current === 'content-typography' ? 'content' : 'content-typography');
        } else {
            setActiveSection(current => current === section ? '' : section);
        }
    };

    const labelInputRef = useRef<HTMLTextAreaElement>(null);
    const descInputRef = useRef<HTMLTextAreaElement>(null);
    const [activeField, setActiveField] = useState<'label' | 'subLabel' | null>(null);

    const labelEditor = useMarkdownEditor(labelInputRef, (val) => onChange(selectedNode.id, { label: val }), selectedNode.data?.label || '');
    const descEditor = useMarkdownEditor(descInputRef, (val) => onChange(selectedNode.id, { subLabel: val }), selectedNode.data?.subLabel || '');

    const handleStyleAction = (action: 'bold' | 'italic') => {
        if (activeField === 'label') {
            if (action === 'bold') labelEditor.insert('**', '**');
            else labelEditor.insert('_', '_');
        } else if (activeField === 'subLabel') {
            if (action === 'bold') descEditor.insert('**', '**');
            else descEditor.insert('_', '_');
        } else {
            // Fallback: Toggle Global Style if no text field is active (or maybe just default to label?)
            if (action === 'bold') {
                onChange(selectedNode.id, { fontWeight: (selectedNode.data?.fontWeight === 'bold' ? 'normal' : 'bold') });
            } else {
                onChange(selectedNode.id, { fontStyle: (selectedNode.data?.fontStyle === 'italic' ? 'normal' : 'italic') });
            }
        }
    };

    return (
        <>
            <hr className="border-slate-100 mb-2" />

            {/* Wireframe Variant Section */}
            {isWireframe && (
                <CollapsibleSection
                    title="Wireframe Variant"
                    icon={<Layout className="w-3.5 h-3.5" />}
                    isOpen={activeSection === 'variant'}
                    onToggle={() => toggleSection('variant')}
                >
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        {selectedNode.type === 'browser' ? (
                            <>
                                {['landing', 'dashboard', 'form', 'modal', 'cookie', 'pricing'].map((variant) => (
                                    <button
                                        key={variant}
                                        onClick={() => onChange(selectedNode.id, { variant })}
                                        className={`px-2 py-2 rounded text-xs font-medium border transition-all
                                            ${(selectedNode.data?.variant || 'default') === variant
                                                ? 'bg-[var(--brand-primary-50)] border-[var(--brand-primary-200)] text-[var(--brand-primary)]'
                                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                                    >
                                        {variant.charAt(0).toUpperCase() + variant.slice(1)}
                                    </button>
                                ))}
                            </>
                        ) : (
                            <>
                                {['login', 'social', 'chat', 'product', 'list'].map((variant) => (
                                    <button
                                        key={variant}
                                        onClick={() => onChange(selectedNode.id, { variant })}
                                        className={`px-2 py-2 rounded text-xs font-medium border transition-all
                                            ${(selectedNode.data?.variant || 'default') === variant
                                                ? 'bg-[var(--brand-primary-50)] border-[var(--brand-primary-200)] text-[var(--brand-primary)]'
                                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                                    >
                                        {variant.charAt(0).toUpperCase() + variant.slice(1)}
                                    </button>
                                ))}
                            </>
                        )}
                    </div>
                </CollapsibleSection>
            )}

            {/* Appearance Section */}
            {!isWireframe && !isAnnotation && !isText && !isImage && (
                <CollapsibleSection
                    title="Appearance"
                    icon={<Box className="w-3.5 h-3.5" />}
                    isOpen={activeSection === 'appearance'}
                    onToggle={() => toggleSection('appearance')}
                >
                    <ShapeSelector
                        selectedShape={selectedNode.data?.shape}
                        onChange={(shape) => onChange(selectedNode.id, { shape })}
                    />
                </CollapsibleSection>
            )}

            {/* Image Settings Section */}
            {isImage && (
                <CollapsibleSection
                    title="Image Settings"
                    icon={<ImageIcon className="w-3.5 h-3.5" />}
                    isOpen={activeSection === 'image'}
                    onToggle={() => toggleSection('image')}
                >
                    {/* Transparency */}
                    <div className="space-y-1 mb-3">
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>Transparency</span>
                            <span>{Math.round((1 - (selectedNode.data?.transparency ?? 1)) * 100)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0.1"
                            max="1"
                            step="0.05"
                            value={selectedNode.data?.transparency ?? 1}
                            onChange={(e) => onChange(selectedNode.id, { transparency: parseFloat(e.target.value) })}
                            className="w-full accent-[var(--brand-primary)] h-2 bg-slate-200 rounded-[var(--brand-radius)] appearance-none cursor-pointer"
                        />
                    </div>

                    {/* Rotation */}
                    <div className="space-y-1 mb-2">
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>Rotation</span>
                            <span>{selectedNode.data?.rotation ?? 0}°</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="360"
                            step="15"
                            value={selectedNode.data?.rotation ?? 0}
                            onChange={(e) => onChange(selectedNode.id, { rotation: parseInt(e.target.value) })}
                            className="w-full accent-[var(--brand-primary)] h-2 bg-slate-200 rounded-[var(--brand-radius)] appearance-none cursor-pointer"
                        />
                    </div>
                </CollapsibleSection>
            )}

            {/* Content Section: Refined Design */}
            <CollapsibleSection
                title="Content"
                icon={<AlignLeft className="w-3.5 h-3.5" />}
                isOpen={activeSection === 'content'}
                onToggle={() => toggleSection('content')}
            >
                <div className="bg-[var(--brand-background)] rounded-[var(--brand-radius)] border border-slate-200 overflow-hidden shadow-sm transition-all">

                    {/* 1. PRIMARY STYLE BAR (Top) - Compact & Functional */}
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 bg-slate-50/80 gap-1.5">
                        {/* Font Family Selector */}
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

                        {/* Font Size Selector */}
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

                        {/* Style Toggles (Weight / Style) */}
                        <div className="flex items-center gap-0.5 shrink-0">
                            <button
                                onMouseDown={(e) => { e.preventDefault(); handleStyleAction('bold'); }}
                                className={`p-1 rounded transition-all duration-200 ${selectedNode.data?.fontWeight === 'bold' ? 'bg-white shadow text-slate-900 ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}
                                title="Bold (Cmd+B)"
                            >
                                <Bold className="w-3.5 h-3.5" strokeWidth={selectedNode.data?.fontWeight === 'bold' ? 3 : 2.5} />
                            </button>
                            <button
                                onMouseDown={(e) => { e.preventDefault(); handleStyleAction('italic'); }}
                                className={`p-1 rounded transition-all duration-200 ${selectedNode.data?.fontStyle === 'italic' ? 'bg-white shadow text-slate-900 ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}
                                title="Italic (Cmd+I)"
                            >
                                <Italic className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div className="w-px h-3 bg-slate-200 shrink-0"></div>

                        {/* Alignment Controls */}
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

                    {/* 2. LABEL INPUT (Middle) - Prominent, clean */}
                    <div className="px-3 py-3 border-b border-dashed border-slate-100 bg-white group/label hover:bg-slate-50/20 focus-within:bg-slate-50/30 transition-colors">
                        <textarea
                            ref={labelInputRef}
                            value={selectedNode.data?.label || ''}
                            onFocus={() => setActiveField('label')}
                            onBlur={() => setTimeout(() => setActiveField(null), 200)} // Delay to allow button click
                            onChange={(e) => {
                                onChange(selectedNode.id, { label: e.target.value });
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            onKeyDown={labelEditor.handleKeyDown}
                            placeholder="Type label here..."
                            rows={1}
                            style={{ minHeight: '32px' }}
                            className="w-full bg-transparent text-[15px] font-semibold text-[var(--brand-text)] outline-none resize-none placeholder:text-slate-300 leading-normal overflow-hidden"
                        />
                    </div>

                    {/* 3. DESCRIPTION INPUT (Bottom) - Subtle, secondary */}
                    {!isText && !isImage && !isWireframe && (
                        <div className="relative group/desc bg-slate-50/20 hover:bg-slate-50/40 transition-colors">
                            <textarea
                                ref={descInputRef}
                                value={selectedNode.data?.subLabel || ''} // Fallback to 'description' if needed, but using subLabel
                                onFocus={() => setActiveField('subLabel')}
                                onBlur={() => setTimeout(() => setActiveField(null), 200)}
                                onChange={(e) => {
                                    onChange(selectedNode.id, { subLabel: e.target.value });
                                    e.target.style.height = 'auto';
                                    e.target.style.height = e.target.scrollHeight + 'px';
                                }}
                                onKeyDown={descEditor.handleKeyDown}
                                placeholder="Add description..."
                                rows={1} // Start small
                                style={{ minHeight: '40px' }}
                                className="w-full px-3 py-2.5 text-xs font-medium text-slate-600 outline-none resize-none leading-relaxed placeholder:text-slate-300 bg-transparent focus:bg-white focus:text-slate-800 transition-colors overflow-hidden"
                            />
                            {/* Format Hint - Visible only on focus/hover */}
                            <div className="absolute bottom-1 right-2 pointer-events-none opacity-0 group-focus-within/desc:opacity-100 transition-opacity">
                                <span className="text-[9px] font-mono text-slate-300 tracking-tight">Markdown supported</span>
                            </div>
                        </div>
                    )}
                </div>
            </CollapsibleSection>

            {/* Text Styling for Text Node */}
            {isText && (
                <CollapsibleSection
                    title="Text Style"
                    icon={<Type className="w-3.5 h-3.5" />}
                    isOpen={activeSection === 'textStyle'}
                    onToggle={() => toggleSection('textStyle')}
                >
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto no-scrollbar">
                            {['inter', 'roboto', 'outfit', 'playfair', 'fira'].map((font) => (
                                <button
                                    key={font}
                                    onClick={() => onChange(selectedNode.id, { fontFamily: font })}
                                    className={`flex-1 px-2 py-1.5 rounded-[calc(var(--brand-radius)-4px)] text-[10px] font-bold uppercase whitespace-nowrap
                                        ${(selectedNode.data?.fontFamily || 'inter') === font ? 'bg-[var(--brand-surface)] shadow-sm text-[var(--brand-primary)]' : 'text-[var(--brand-secondary)] hover:text-[var(--brand-text)]'}`}
                                >
                                    {font}
                                </button>
                            ))}
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto no-scrollbar">
                            {[12, 14, 16, 20, 24, 32, 48, 64].map((size) => (
                                <button
                                    key={size}
                                    onClick={() => onChange(selectedNode.id, { fontSize: size.toString() })}
                                    className={`flex-1 px-2 py-1.5 rounded-[calc(var(--brand-radius)-4px)] text-[10px] font-bold
                                        ${(selectedNode.data?.fontSize || '16') === size.toString() ? 'bg-[var(--brand-surface)] shadow-sm text-[var(--brand-primary)]' : 'text-[var(--brand-secondary)] hover:text-[var(--brand-text)]'}`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>
                </CollapsibleSection>
            )}

            {!isImage && (
                <CollapsibleSection
                    title="Color Theme"
                    icon={<Palette className="w-3.5 h-3.5" />}
                    isOpen={activeSection === 'color'}
                    onToggle={() => toggleSection('color')}
                >
                    <ColorPicker
                        selectedColor={selectedNode.data?.color}
                        onChange={(color) => onChange(selectedNode.id, { color })}
                    />
                </CollapsibleSection>
            )}

            {!isAnnotation && !isText && !isImage && !isWireframe && (
                <CollapsibleSection
                    title="Icon Theme"
                    icon={<Star className="w-3.5 h-3.5" />}
                    isOpen={activeSection === 'icon'}
                    onToggle={() => toggleSection('icon')}
                >
                    <IconPicker
                        selectedIcon={selectedNode.data?.icon}
                        customIconUrl={selectedNode.data?.customIconUrl}
                        onChange={(icon) => onChange(selectedNode.id, { icon })}
                        onCustomIconChange={(url) => onChange(selectedNode.id, { customIconUrl: url })}
                    />
                </CollapsibleSection>
            )}

            {!isText && (
                <CollapsibleSection
                    title="Custom Image"
                    icon={<ImageStart className="w-3.5 h-3.5" />}
                    isOpen={activeSection === 'upload'}
                    onToggle={() => toggleSection('upload')}
                >
                    <ImageUpload
                        imageUrl={selectedNode.data?.imageUrl}
                        onChange={(url) => onChange(selectedNode.id, { imageUrl: url })}
                    />
                </CollapsibleSection>
            )}

            <div className="pt-4 mt-4 border-t border-slate-100 flex gap-2">
                <Button
                    onClick={() => onDuplicate(selectedNode.id)}
                    variant="secondary"
                    className="flex-1"
                    icon={<Copy className="w-4 h-4" />}
                >
                    Duplicate
                </Button>
                <Button
                    onClick={() => onDelete(selectedNode.id)}
                    variant="danger"
                    className="flex-1"
                    icon={<Trash2 className="w-4 h-4" />}
                >
                    Delete
                </Button>
            </div>
        </>
    );
};
