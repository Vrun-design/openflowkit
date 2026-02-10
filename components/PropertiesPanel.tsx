import React, { useRef, useState, useMemo } from 'react';
import {
    X, Upload, Type, Image as ImageIcon, Palette, Layout, Trash2, ArrowRight, Ban,
    AlignLeft, AlignCenter, AlignRight, Copy,
    Bold, Italic, List, ListOrdered, Code, Quote, Heading1, CheckSquare,
    Square, Circle, Search, GitBranch
} from 'lucide-react';
import { Node, Edge } from 'reactflow';
import { NodeData, EdgeCondition } from '../types';
import { ICON_MAP } from './CustomNode';
import { EDGE_CONDITION_STYLES, EDGE_CONDITION_LABELS } from '../constants';

interface PropertiesPanelProps {
    selectedNode: Node<NodeData> | null;
    selectedEdge: Edge | null;
    onChangeNode: (id: string, data: Partial<NodeData>) => void;
    onChangeNodeType: (id: string, type: string) => void;
    onChangeEdge: (id: string, updates: Partial<Edge>) => void;
    onDeleteNode: (id: string) => void;
    onDuplicateNode: (id: string) => void;
    onDeleteEdge: (id: string) => void;
    onUpdateZIndex: (id: string, action: 'front' | 'back') => void;
    onClose: () => void;
}

const COLORS = ['slate', 'blue', 'emerald', 'amber', 'red', 'violet', 'pink', 'yellow'];
const EDGE_COLORS = ['#94a3b8', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];



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
                case 'b':
                    e.preventDefault();
                    insert('**', '**');
                    break;
                case 'i':
                    e.preventDefault();
                    insert('_', '_');
                    break;
                case 'e':
                    e.preventDefault();
                    insert('`', '`');
                    break;
            }
        }
    };

    return { insert, handleKeyDown };
};

const MarkdownToolbar = ({ onInsert, simple = false }: { onInsert: (p: string, s?: string) => void, simple?: boolean }) => (
    <div className="flex items-center gap-1 p-1 bg-white border-b border-slate-200 overflow-x-auto no-scrollbar">
        <button onClick={() => onInsert('**', '**')} className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 rounded transition-colors" title="Bold (Cmd+B)">
            <Bold className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onInsert('_', '_')} className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 rounded transition-colors" title="Italic (Cmd+I)">
            <Italic className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onInsert('`', '`')} className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 rounded transition-colors" title="Inline Code (Cmd+E)">
            <Code className="w-3.5 h-3.5" />
        </button>
        {!simple && (
            <>
                <div className="w-px h-4 bg-slate-200 mx-0.5"></div>
                <button onClick={() => onInsert('### ')} className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 rounded transition-colors" title="Heading">
                    <Heading1 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onInsert('> ')} className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 rounded transition-colors" title="Blockquote">
                    <Quote className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-4 bg-slate-200 mx-0.5"></div>
                <button onClick={() => onInsert('- ')} className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 rounded transition-colors" title="Bullet List">
                    <List className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onInsert('1. ')} className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 rounded transition-colors" title="Ordered List">
                    <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onInsert('- [ ] ')} className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 rounded transition-colors" title="Checklist">
                    <CheckSquare className="w-3.5 h-3.5" />
                </button>
            </>
        )}
    </div>
);

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
    selectedNode,
    selectedEdge,
    onChangeNode,
    onChangeNodeType,
    onChangeEdge,
    onDeleteNode,
    onDuplicateNode,
    onDeleteEdge,
    onUpdateZIndex,
    onClose
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [iconSearch, setIconSearch] = useState('');

    // Refs & Hooks for insertion
    const labelInputRef = useRef<HTMLInputElement>(null);
    const descInputRef = useRef<HTMLTextAreaElement>(null);

    const labelEditor = useMarkdownEditor(labelInputRef, (val) => selectedNode && onChangeNode(selectedNode.id, { label: val }), selectedNode?.data.label || '');
    const descEditor = useMarkdownEditor(descInputRef, (val) => selectedNode && onChangeNode(selectedNode.id, { subLabel: val }), selectedNode?.data.subLabel || '');

    // Optimized Icon List
    const filteredIcons = useMemo(() => {
        const term = iconSearch.toLowerCase();
        const allKeys = Object.keys(ICON_MAP);

        // Priority icons for flowcharts
        const priorityIcons = [
            'Database', 'Server', 'User', 'Users', 'Globe', 'Cloud', 'Lock', 'Unlock',
            'Shield', 'Key', 'Mail', 'MessageSquare', 'File', 'FileText', 'Folder',
            'Code', 'Terminal', 'Settings', 'Cpu', 'Smartphone', 'Tablet', 'Monitor',
            'CreditCard', 'DollarSign', 'ShoppingCart', 'Box', 'Truck', 'MapPin',
            'Search', 'Bell', 'Calendar', 'Clock', 'Check', 'X', 'AlertTriangle',
            'Info', 'HelpCircle', 'Home', 'Link', 'Share', 'Trash', 'Save', 'Edit'
        ];

        if (!term) {
            // Show priority icons first, then others
            const others = allKeys.filter(k => !priorityIcons.includes(k)).slice(0, 100);
            return [...priorityIcons.filter(k => allKeys.includes(k)), ...others];
        }

        return allKeys.filter(k => k.toLowerCase().includes(term)).slice(0, 50);

    }, [iconSearch]);

    if (!selectedNode && !selectedEdge) return null;

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && selectedNode) {
            const reader = new FileReader();
            reader.onloadend = () => {
                onChangeNode(selectedNode.id, { imageUrl: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const isAnnotation = selectedNode?.type === 'annotation';

    return (
        <div className="absolute top-20 right-6 w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 ring-1 ring-black/5 flex flex-col overflow-hidden max-h-[calc(100vh-140px)] z-50 animate-in slide-in-from-right-10 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/80">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    {selectedNode ? (
                        <>
                            <Layout className="w-4 h-4 text-indigo-600" />
                            <span>{isAnnotation ? 'Sticky Note' : 'Node Settings'}</span>
                        </>
                    ) : (
                        <>
                            <ArrowRight className="w-4 h-4 text-indigo-600" />
                            <span>Connection</span>
                        </>
                    )}
                </h3>
                <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="p-4 overflow-y-auto custom-scrollbar space-y-6 flex-1">
                {selectedNode && (
                    <>

                        <hr className="border-slate-100" />
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Appearance</label>

                            {/* Shapes */}
                            {!isAnnotation && (
                                <div className="flex bg-slate-100 p-1 rounded-lg mb-3">
                                    <button
                                        onClick={() => onChangeNode(selectedNode.id, { shape: 'rectangle' })}
                                        className={`flex-1 flex items-center justify-center py-1.5 rounded-md text-xs font-medium transition-all gap-2
                                ${selectedNode.data.shape === 'rectangle' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}
                            `}
                                    >
                                        <Square className="w-3.5 h-3.5" /> Rect
                                    </button>
                                    <button
                                        onClick={() => onChangeNode(selectedNode.id, { shape: 'rounded' })}
                                        className={`flex-1 flex items-center justify-center py-1.5 rounded-md text-xs font-medium transition-all gap-2
                                ${(selectedNode.data.shape === 'rounded' || !selectedNode.data.shape) ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}
                            `}
                                    >
                                        <Square className="w-3.5 h-3.5 rounded-sm" /> Round
                                    </button>
                                    <button
                                        onClick={() => onChangeNode(selectedNode.id, { shape: 'capsule' })}
                                        className={`flex-1 flex items-center justify-center py-1.5 rounded-md text-xs font-medium transition-all gap-2
                                ${selectedNode.data.shape === 'capsule' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}
                            `}
                                    >
                                        <Circle className="w-3.5 h-3.5" /> Capsule
                                    </button>
                                </div>
                            )}

                        </div>

                        {/* Content & Alignment */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Content</label>

                                {!isAnnotation && (
                                    <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
                                        {[
                                            { val: 'left', Icon: AlignLeft },
                                            { val: 'center', Icon: AlignCenter },
                                            { val: 'right', Icon: AlignRight }
                                        ].map(({ val, Icon }) => (
                                            <button
                                                key={val}
                                                onClick={() => onChangeNode(selectedNode.id, { align: val as any })}
                                                className={`p-1 rounded-md transition-all ${(selectedNode.data.align || 'left') === val
                                                    ? 'bg-white text-indigo-600 shadow-sm'
                                                    : 'text-slate-400 hover:text-slate-600'
                                                    }`}
                                            >
                                                <Icon className="w-3 h-3" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Rich Text Label */}
                            <div className="relative border border-slate-200 rounded-lg bg-slate-50 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
                                <MarkdownToolbar onInsert={labelEditor.insert} simple />
                                <input
                                    ref={labelInputRef}
                                    type="text"
                                    value={selectedNode.data.label}
                                    onChange={(e) => onChangeNode(selectedNode.id, { label: e.target.value })}
                                    onKeyDown={labelEditor.handleKeyDown}
                                    placeholder={isAnnotation ? "Title (Optional)" : "Node Label"}
                                    className="w-full px-3 py-2 bg-slate-50 text-sm font-medium text-slate-900 outline-none font-mono"
                                />
                            </div>

                            {/* Rich Text / Markdown Editor */}
                            <div className="relative border border-slate-200 rounded-lg bg-slate-50 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
                                <MarkdownToolbar onInsert={descEditor.insert} />
                                <textarea
                                    ref={descInputRef}
                                    value={selectedNode.data.subLabel || ''}
                                    onChange={(e) => onChangeNode(selectedNode.id, { subLabel: e.target.value })}
                                    onKeyDown={descEditor.handleKeyDown}
                                    placeholder={isAnnotation ? "Write your note here..." : "Description / Sublabel"}
                                    rows={8}
                                    className="w-full px-3 py-2 bg-slate-50 text-sm font-medium text-slate-900 outline-none resize-none font-mono"
                                />
                            </div>
                        </div>

                        {/* Color Picker */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <Palette className="w-3 h-3" /> Color Theme
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {COLORS.map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => onChangeNode(selectedNode.id, { color })}
                                        className={`
                      w-8 h-8 rounded-full border-2 transition-transform hover:scale-110
                      ${selectedNode.data.color === color ? 'border-slate-600 scale-110' : 'border-transparent'}
                    `}
                                        style={{ backgroundColor: `var(--color-${color}-100)` }}
                                    >
                                        <div className={`w-full h-full rounded-full bg-${color}-500 opacity-20 hover:opacity-100 transition-opacity`} />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Icon Picker - Hide for annotation */}
                        {!isAnnotation && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Icon Symbol</label>
                                    <div className="relative w-32">
                                        <Search className="w-3 h-3 absolute left-2 top-1.5 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search..."
                                            value={iconSearch}
                                            onChange={(e) => setIconSearch(e.target.value)}
                                            className="w-full pl-6 pr-2 py-1 bg-slate-100 rounded-md text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-6 gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100 max-h-40 overflow-y-auto custom-scrollbar">
                                    {/* No Icon Option */}
                                    <button
                                        onClick={() => onChangeNode(selectedNode.id, { icon: 'none' })}
                                        className={`
                            p-2 rounded-lg flex items-center justify-center transition-all
                            ${selectedNode.data.icon === 'none'
                                                ? 'bg-red-100 text-red-600 ring-1 ring-red-400'
                                                : 'hover:bg-white hover:shadow-sm text-slate-400'
                                            }
                            `}
                                        title="No Icon"
                                    >
                                        <Ban className="w-5 h-5" />
                                    </button>

                                    {filteredIcons.map((key) => {
                                        const Icon = ICON_MAP[key];
                                        return (
                                            <button
                                                key={key}
                                                onClick={() => onChangeNode(selectedNode.id, { icon: key })}
                                                className={`
                                    p-2 rounded-lg flex items-center justify-center transition-all
                                    ${selectedNode.data.icon === key
                                                        ? 'bg-indigo-100 text-indigo-600 ring-1 ring-indigo-400'
                                                        : 'hover:bg-white hover:shadow-sm text-slate-500'
                                                    }
                                    `}
                                                title={key}
                                            >
                                                <Icon className="w-5 h-5" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <hr className="border-slate-100" />

                        {/* Image Upload */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <ImageIcon className="w-3 h-3" /> Attached Image
                            </label>
                            <div className="flex flex-col gap-3">

                                {selectedNode.data.imageUrl ? (
                                    <div className="relative group rounded-lg overflow-hidden border border-slate-200">
                                        <img src={selectedNode.data.imageUrl} className="w-full h-32 object-cover opacity-90" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => onChangeNode(selectedNode.id, { imageUrl: undefined })}
                                                className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full py-6 border-2 border-dashed border-slate-300 rounded-xl hover:bg-slate-50 hover:border-indigo-400 hover:text-indigo-600 transition-all text-sm text-slate-500 flex flex-col items-center gap-2"
                                    >
                                        <Upload className="w-5 h-5" />
                                        <span>Click to Upload Image</span>
                                    </button>
                                )}

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                />
                            </div>
                        </div>

                        <div className="pt-4 mt-4 border-t border-slate-100 flex gap-2">
                            <button
                                onClick={() => onDuplicateNode(selectedNode.id)}
                                className="flex-1 py-2 flex items-center justify-center gap-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors text-sm font-medium"
                            >
                                <Copy className="w-4 h-4" />
                                Duplicate
                            </button>
                            <button
                                onClick={() => onDeleteNode(selectedNode.id)}
                                className="flex-1 py-2 flex items-center justify-center gap-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors text-sm font-medium"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete
                            </button>
                        </div>
                    </>
                )}

                {selectedEdge && (
                    <div className="space-y-6">
                        {/* Condition Selector */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <GitBranch className="w-3 h-3" /> Condition
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {(Object.keys(EDGE_CONDITION_STYLES) as EdgeCondition[]).map((cond) => {
                                    const style = EDGE_CONDITION_STYLES[cond];
                                    const label = (EDGE_CONDITION_LABELS as Record<string, string>)[cond] || 'Default';
                                    const currentCond = (selectedEdge.data?.condition as EdgeCondition) || 'default';
                                    const isSelected = currentCond === cond;

                                    return (
                                        <button
                                            key={cond}
                                            onClick={() => {
                                                onChangeEdge(selectedEdge.id, {
                                                    data: { ...selectedEdge.data, condition: cond },
                                                    style: { ...selectedEdge.style, ...style },
                                                    label: cond === 'default' ? '' : label
                                                });
                                            }}
                                            className={`
                                px-2 py-1.5 rounded-lg text-xs font-medium border transition-all text-left flex items-center gap-2
                                ${isSelected
                                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-1 ring-indigo-200'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                                }
                            `}
                                        >
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: style.stroke }} />
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <Type className="w-3 h-3" /> Label
                            </label>
                            <input
                                type="text"
                                value={(selectedEdge.label as string) || ''}
                                onChange={(e) => onChangeEdge(selectedEdge.id, { label: e.target.value })}
                                placeholder="e.g., 'If yes', 'On success'"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Line Style</label>

                            <div className="flex flex-wrap gap-2">
                                {/* Edge Color Picker */}
                                {EDGE_COLORS.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => onChangeEdge(selectedEdge.id, { style: { ...selectedEdge.style, stroke: color } })}
                                        className={`w-6 h-6 rounded-full border border-white shadow-sm hover:scale-110 transition-transform ${selectedEdge.style?.stroke === color ? 'ring-2 ring-slate-400 ring-offset-2' : ''
                                            }`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                                <button
                                    onClick={() => onChangeEdge(selectedEdge.id, { style: { ...selectedEdge.style, stroke: '#94a3b8' } })}
                                    title="Reset Color"
                                    className="w-6 h-6 rounded-full border border-slate-200 bg-slate-100 text-slate-400 flex items-center justify-center text-xs hover:bg-slate-200"
                                >
                                    <Ban className="w-3 h-3" />
                                </button>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => onChangeEdge(selectedEdge.id, { animated: !selectedEdge.animated })}
                                    className={`
                        flex-1 py-2 text-xs font-medium rounded-lg border transition-all
                        ${selectedEdge.animated
                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                            : 'bg-white border-slate-200 text-slate-600'
                                        }
                    `}
                                >
                                    Animated
                                </button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {['default', 'smoothstep', 'step'].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => onChangeEdge(selectedEdge.id, { type: t })}
                                        className={`
                                py-2 text-xs font-medium rounded-lg border capitalize transition-all
                                ${selectedEdge.type === t
                                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                                : 'bg-white border-slate-200 text-slate-600'
                                            }
                            `}
                                    >
                                        {t === 'default' ? 'Bezier' : t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                            <button
                                onClick={() => onDeleteEdge(selectedEdge.id)}
                                className="w-full py-2 flex items-center justify-center gap-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors text-sm font-medium"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete Connection
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};