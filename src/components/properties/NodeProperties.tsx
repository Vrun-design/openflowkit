import React, { useRef, useState, useEffect } from 'react';
import { Node } from 'reactflow';
import { NodeData } from '@/lib/types';
import { Bold, Italic, List, ListOrdered, Code, Quote, Heading1, CheckSquare, Copy, Trash2, Box, AlignLeft, Image as ImageIcon, Type, Layout, Palette, Star, Image as ImageStart } from 'lucide-react';
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
    const insert = (prefix: string, suffix: string = '') => {
        if (!ref.current) return;
        const el = ref.current;
        const start = el.selectionStart || 0;
        const end = el.selectionEnd || 0;

        const before = value.substring(0, start);
        const selection = value.substring(start, end);
        const after = value.substring(end);

        const newValue = before + prefix + selection + suffix + after;
        onChange(newValue);

        setTimeout(() => {
            el.focus();
            el.setSelectionRange(start + prefix.length, end + prefix.length);
        }, 0);
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
        <div className="flex items-center gap-1 p-1 bg-[var(--brand-surface)] border-b border-slate-100 overflow-x-auto no-scrollbar">
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
        setActiveSection(current => current === section ? '' : section);
    };

    const labelInputRef = useRef<HTMLTextAreaElement>(null);
    const descInputRef = useRef<HTMLTextAreaElement>(null);

    const labelEditor = useMarkdownEditor(labelInputRef, (val) => onChange(selectedNode.id, { label: val }), selectedNode.data?.label || '');
    const descEditor = useMarkdownEditor(descInputRef, (val) => onChange(selectedNode.id, { subLabel: val }), selectedNode.data?.subLabel || '');

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

            {/* Content Section */}
            <CollapsibleSection
                title="Content"
                icon={<AlignLeft className="w-3.5 h-3.5" />}
                isOpen={activeSection === 'content'}
                onToggle={() => toggleSection('content')}
            >
                <div className="space-y-3 mb-2">
                    {/* Rich Text Label */}
                    <div className="relative border border-slate-200 rounded-[var(--brand-radius)] bg-[var(--brand-background)] overflow-hidden focus-within:ring-2 focus-within:ring-[var(--brand-primary)] focus-within:border-transparent transition-all">
                        <MarkdownToolbar onInsert={labelEditor.insert} simple />
                        <textarea
                            ref={labelInputRef}
                            value={selectedNode.data?.label || ''}
                            onChange={(e) => onChange(selectedNode.id, { label: e.target.value })}
                            onKeyDown={labelEditor.handleKeyDown}
                            placeholder={isAnnotation ? "Title (Optional)" : "Node Label"}
                            rows={1}
                            style={{ minHeight: '38px' }}
                            className="w-full px-3 py-2 bg-[var(--brand-background)] text-sm font-medium text-[var(--brand-text)] outline-none font-mono resize-y"
                        />
                    </div>

                    {/* Description */}
                    {!isText && !isImage && !isWireframe && (
                        <div className="relative border border-slate-200 rounded-[var(--brand-radius)] bg-[var(--brand-background)] overflow-hidden focus-within:ring-2 focus-within:ring-[var(--brand-primary)] focus-within:border-transparent transition-all">
                            <MarkdownToolbar onInsert={descEditor.insert} />
                            <textarea
                                ref={descInputRef}
                                value={selectedNode.data?.subLabel || ''}
                                onChange={(e) => onChange(selectedNode.id, { subLabel: e.target.value })}
                                onKeyDown={descEditor.handleKeyDown}
                                placeholder={isAnnotation ? "Write your note here..." : "Description / Sublabel"}
                                rows={6}
                                className="w-full px-3 py-2 bg-[var(--brand-background)] text-sm font-medium text-[var(--brand-text)] outline-none resize-none font-mono"
                            />
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
