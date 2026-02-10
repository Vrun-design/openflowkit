import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    Search,
    Clock,
    Sparkles,
    X,
    Command,
    Settings,
    Zap,
    ChevronRight,
    ArrowRight,
    ArrowLeft,
    Code2,
    FileCode,
    Layout,
    Play,
    Loader2,
    Check,
    Copy,
    AlertCircle,
    Plus,
    BookOpen
} from 'lucide-react';
import { Node, Edge } from 'reactflow';
import { FLOW_TEMPLATES, FlowTemplate } from '../services/templates';
import { parseMermaid } from '../services/mermaidParser';
import { parseFlowMindDSL } from '../services/flowmindDSLParser';
import { toMermaid } from '../services/exportService';
import { toFlowMindDSL } from '../services/flowmindDSLExporter';

type CommandView = 'root' | 'ai' | 'mermaid' | 'flowmind' | 'templates';

interface CommandBarProps {
    isOpen: boolean;
    onClose: () => void;
    nodes: Node[];
    edges: Edge[];
    onApply: (nodes: Node[], edges: Edge[]) => void;
    onAIGenerate: (prompt: string) => Promise<void>;
    isGenerating: boolean;
    onUndo?: () => void;
    onRedo?: () => void;
    onFitView?: () => void;
    onLayout?: () => void;
    onSelectTemplate?: (template: FlowTemplate) => void;
    initialView?: CommandView;
    settings?: {
        showGrid: boolean;
        onToggleGrid: () => void;
        snapToGrid: boolean;
        onToggleSnap: () => void;
        showMiniMap: boolean;
        onToggleMiniMap: () => void;
    };
}

interface CommandItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    shortcut?: string;
    action?: () => void;
    type: 'action' | 'navigation' | 'ai' | 'toggle';
    description?: string;
    value?: boolean;
    view?: CommandView;
}

// --- SUB COMPONENTS (Defined outside to prevent re-mounting) ---

const ViewHeader = ({ title, icon, onBack }: { title: string, icon: React.ReactNode, onBack: () => void }) => (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200/50 bg-slate-50/50">
        <button
            onClick={onBack}
            className="p-1 rounded-md hover:bg-slate-200 text-slate-500 transition-colors"
        >
            <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 font-medium text-slate-700">
            {icon}
            <span>{title}</span>
        </div>
        <div className="ml-auto">
            <button onClick={onBack} className="p-1 hover:bg-slate-200 rounded-full text-slate-400">
                <X className="w-4 h-4" />
            </button>
        </div>
    </div>
);

const CommandItemRow = ({ item, isSelected, onClick }: { item: CommandItem, isSelected: boolean, onClick: () => void }) => (
    <div
        onClick={onClick}
        className={`
            group flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl cursor-pointer transition-all duration-200
            ${isSelected ? 'bg-indigo-50/80 text-indigo-700 shadow-sm ring-1 ring-indigo-100' : 'text-slate-600 hover:bg-slate-50'}
        `}
    >
        <div className={`
            p-1.5 rounded-lg transition-colors
            ${isSelected ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:shadow-sm'}
        `}>
            {item.icon}
        </div>

        <div className="flex-1 flex flex-col justify-center">
            <span className="text-sm font-medium leading-none mb-0.5">{item.label}</span>
            {item.description && (
                <span className={`text-[11px] ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`}>
                    {item.description}
                </span>
            )}
        </div>

        {item.type === 'toggle' && (
            <div className={`
                w-8 h-4 rounded-full relative transition-colors
                ${item.value ? 'bg-indigo-500' : 'bg-slate-200'}
             `}>
                <div className={`
                    absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm
                    ${item.value ? 'left-4.5' : 'left-0.5'}
                `} style={{ left: item.value ? '18px' : '2px' }} />
            </div>
        )}

        {item.type === 'navigation' && (
            <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-400' : 'text-slate-300 opacity-0 group-hover:opacity-100'}`} />
        )}

        {item.shortcut && (
            <div className={`
                text-[10px] font-medium px-1.5 py-0.5 rounded border
                ${isSelected
                    ? 'bg-white border-indigo-200 text-indigo-400'
                    : 'bg-slate-50 border-slate-200 text-slate-400'}
            `}>
                {item.shortcut}
            </div>
        )}
    </div>
);

// 1. Root View
const RootView = ({
    commands,
    searchQuery,
    setSearchQuery,
    selectedIndex,
    setSelectedIndex,
    onClose,
    setView,
    inputRef
}: {
    commands: CommandItem[],
    searchQuery: string,
    setSearchQuery: (q: string) => void,
    selectedIndex: number,
    setSelectedIndex: (i: number | ((prev: number) => number)) => void,
    onClose: () => void,
    setView: (v: CommandView) => void,
    inputRef: React.RefObject<HTMLInputElement>
}) => {
    const filteredCommands = useMemo(() => {
        if (!searchQuery) return commands;
        return commands.filter(c =>
            c.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [commands, searchQuery]);

    // Keyboard Nav for Root
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const len = filteredCommands.length;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % len);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + len) % len);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const item = filteredCommands[selectedIndex];
                if (item) {
                    if (item.view) setView(item.view);
                    else if (item.action) {
                        item.action();
                        if (item.type === 'action') onClose();
                    }
                } else if (searchQuery) {
                    setView('ai');
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [filteredCommands, selectedIndex, onClose, setView, searchQuery, setSelectedIndex]);

    return (
        <>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200/50">
                <Search className="w-5 h-5 text-slate-400" />
                <input
                    ref={inputRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                        // Prevent global shortcuts interfering with typing
                        e.stopPropagation();
                    }}
                    placeholder="Type a command or ask AI..."
                    className="flex-1 bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400 text-base"
                    autoFocus
                />
                <div className="flex items-center gap-2">
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent py-2">
                <div className="px-4 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {searchQuery ? 'Results' : 'Suggestions'}
                </div>
                {filteredCommands.map((item, idx) => (
                    <CommandItemRow
                        key={item.id}
                        item={item}
                        isSelected={selectedIndex === idx}
                        onClick={() => {
                            if (item.view) setView(item.view);
                            else if (item.action) {
                                item.action();
                                if (item.type === 'action') onClose();
                            }
                        }}
                    />
                ))}
                {filteredCommands.length === 0 && searchQuery && (
                    <div
                        className="px-4 py-3 text-sm text-slate-500 text-center cursor-pointer hover:bg-slate-50"
                        onClick={() => setView('ai')}
                    >
                        Press <kbd className="font-sans px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-xs">Enter</kbd> to ask AI about "{searchQuery}"
                    </div>
                )}
            </div>
        </>
    );
};

// 2. AI View
const AIView = ({
    searchQuery,
    onAIGenerate,
    onClose,
    handleBack,
    isGenerating
}: {
    searchQuery: string,
    onAIGenerate: (prompt: string) => Promise<void>,
    onClose: () => void,
    handleBack: () => void,
    isGenerating: boolean
}) => {
    const [prompt, setPrompt] = useState(searchQuery || '');

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        await onAIGenerate(prompt);
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Essential: Stop propagation to allow typing without firing global hotkeys
        e.stopPropagation();

        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleGenerate();
        }
    };

    return (
        <div className="flex flex-col h-full">
            <ViewHeader title="Ask AI" icon={<Sparkles className="w-4 h-4 text-indigo-500" />} onBack={handleBack} />
            <div className="p-4 flex-1">
                <textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Describe the flow you want to build..."
                    className="w-full flex-1 p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none"
                    autoFocus
                />
                <div className="flex justify-end mt-4">
                    <button
                        onClick={handleGenerate}
                        disabled={!prompt.trim() || isGenerating}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm text-white transition-all
                            ${!prompt.trim() || isGenerating ? 'bg-indigo-300' : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20'}
                        `}
                    >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        Generate Flow
                    </button>
                </div>
            </div>
        </div>
    );
};

// 3. Code View (Mermaid / DSL)
const CodeView = ({
    mode,
    nodes,
    edges,
    onApply,
    onClose,
    handleBack
}: {
    mode: 'mermaid' | 'flowmind',
    nodes: Node[],
    edges: Edge[],
    onApply: (nodes: Node[], edges: Edge[]) => void,
    onClose: () => void,
    handleBack: () => void
}) => {
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Sync from canvas on mount ONLY.
    // We intentionally have an empty dependency array for 'nodes' and 'edges'
    // so that background updates do not overwrite the user's unfinished text.
    useEffect(() => {
        if (mode === 'mermaid') setCode(toMermaid(nodes, edges));
        else setCode(toFlowMindDSL(nodes, edges));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    const validate = useCallback((val: string) => {
        const res = mode === 'mermaid' ? parseMermaid(val) : parseFlowMindDSL(val);
        return res.error;
    }, [mode]);

    const handleChange = (val: string) => {
        setCode(val);
        if (error) setError(null);
    };

    const handleApply = () => {
        const res = mode === 'mermaid' ? parseMermaid(code) : parseFlowMindDSL(code);
        if (res.error) {
            setError(res.error);
            return;
        }
        onApply(res.nodes, res.edges);
        onClose();
    };

    // prevent propagation for critical keys
    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Allow navigation and deletion within the textarea without bubbling
        if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            e.stopPropagation();
        }
        // Allow copy/paste/select-all
        if ((e.metaKey || e.ctrlKey) && ['a', 'c', 'v', 'x', 'z', 'y'].includes(e.key.toLowerCase())) {
            e.stopPropagation();
        }

        // Apply
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            handleApply();
        }
    };

    return (
        <div className="flex flex-col h-full">
            <ViewHeader
                title={mode === 'mermaid' ? 'Mermaid Editor' : 'FlowMind DSL'}
                icon={mode === 'mermaid' ? <Code2 className="w-4 h-4 text-pink-500" /> : <FileCode className="w-4 h-4 text-emerald-500" />}
                onBack={handleBack}
            />
            <div className="p-4 flex-1 relative flex flex-col">
                <textarea
                    value={code}
                    onChange={e => handleChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className={`w-full flex-1 p-3 rounded-xl border text-sm font-mono leading-relaxed outline-none resize-none transition-all mb-4
                             ${error ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200 bg-slate-50/50 focus:border-indigo-500'}
                        `}
                    spellCheck={false}
                    autoFocus
                />
                {error && (
                    <div className="absolute bottom-20 left-4 right-4 flex items-center gap-2 px-3 py-2 bg-white/95 border border-amber-200 rounded-lg text-amber-700 text-xs shadow-sm">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-medium truncate">{error}</span>
                    </div>
                )}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-slate-400">⌘+Enter to apply</span>
                        {mode === 'flowmind' && (
                            <a
                                href="https://varun-shield.notion.site/FlowMind-DSL-Syntax-Guide-303ce7f68c06800f94f4d2cd21082236?source=copy_link"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                            >
                                <BookOpen className="w-3.5 h-3.5" />
                                Syntax Guide
                            </a>
                        )}
                    </div>
                    <button
                        onClick={handleApply}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm shadow-sm transition-all"
                    >
                        <Play className="w-4 h-4" /> Apply Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

// 4. Templates View
const TemplatesView = ({
    onSelectTemplate,
    onClose,
    handleBack
}: {
    onSelectTemplate?: (t: FlowTemplate) => void,
    onClose: () => void,
    handleBack: () => void
}) => {
    const [tSearch, setTSearch] = useState('');

    const filteredTemplates = useMemo(() => {
        return FLOW_TEMPLATES.filter(t =>
            t.name.toLowerCase().includes(tSearch.toLowerCase()) ||
            t.description.toLowerCase().includes(tSearch.toLowerCase())
        );
    }, [tSearch]);

    return (
        <div className="flex flex-col h-full">
            <ViewHeader title="Templates" icon={<Layout className="w-4 h-4 text-blue-500" />} onBack={handleBack} />

            <div className="px-4 py-2 border-b border-slate-100">
                <input
                    value={tSearch}
                    onChange={e => setTSearch(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder="Search templates..."
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400 transition-colors"
                    autoFocus
                />
            </div>

            <div className="overflow-y-auto p-2 grid grid-cols-1 gap-1 max-h-[350px]">
                {filteredTemplates.map(t => {
                    const Icon = t.icon;
                    return (
                        <div
                            key={t.id}
                            onClick={() => { onSelectTemplate?.(t); onClose(); }}
                            className="group flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer transition-all"
                        >
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-100 group-hover:scale-105 transition-all">
                                <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-slate-700 group-hover:text-blue-700 truncate">{t.name}</h4>
                                <p className="text-xs text-slate-400 line-clamp-1">{t.description}</p>
                            </div>
                            <Plus className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    );
                })}
                {filteredTemplates.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-sm">No templates found</div>
                )}
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

export const CommandBar: React.FC<CommandBarProps> = ({
    isOpen,
    onClose,
    nodes,
    edges,
    onApply,
    onAIGenerate,
    isGenerating,
    onUndo,
    onRedo,
    onFitView,
    onLayout,
    onSelectTemplate,
    initialView = 'root',
    settings,
}) => {
    const [view, setView] = useState<CommandView>(initialView);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setView(initialView);
            setSearchQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen, initialView]);

    const handleBack = useCallback(() => {
        if (view === 'root') {
            onClose();
        } else {
            setView('root');
            setSearchQuery('');
        }
    }, [view, onClose]);

    // Commands definition inside RootView would be tedious to pass down,
    // so we define them here and pass to RootView maybe?
    // Actually, constructing them here allows us to use props.
    // We already moved RootView out, so we need to construct commands here and pass them.

    const commands: CommandItem[] = useMemo(() => [
        {
            id: 'ai-generate',
            label: 'Ask AI to build flow...',
            icon: <Sparkles className="w-4 h-4 text-indigo-500" />,
            type: 'navigation',
            description: 'Generate flow from text',
            view: 'ai'
        },
        {
            id: 'templates',
            label: 'Templates',
            icon: <Layout className="w-4 h-4 text-blue-500" />,
            type: 'navigation',
            description: 'Browse pre-built flows',
            view: 'templates'
        },
        {
            id: 'mermaid',
            label: 'Paste Mermaid Code',
            icon: <Code2 className="w-4 h-4 text-pink-500" />,
            type: 'navigation',
            view: 'mermaid'
        },
        {
            id: 'flowmind',
            label: 'Paste FlowMind DSL',
            icon: <FileCode className="w-4 h-4 text-emerald-500" />,
            type: 'navigation',
            view: 'flowmind'
        },
        {
            id: 'fit-view',
            label: 'Fit View',
            icon: <Command className="w-4 h-4 text-slate-500" />,
            shortcut: '⇧1',
            type: 'action',
            action: onFitView
        },
        ...(settings ? [
            {
                id: 'toggle-grid',
                label: 'Show Grid',
                icon: <Settings className="w-4 h-4 text-slate-500" />,
                type: 'toggle' as const,
                value: settings.showGrid,
                action: settings.onToggleGrid,
                description: settings.showGrid ? 'On' : 'Off'
            },
            {
                id: 'toggle-snap',
                label: 'Snap to Grid',
                icon: <Settings className="w-4 h-4 text-slate-500" />,
                type: 'toggle' as const,
                value: settings.snapToGrid,
                action: settings.onToggleSnap,
                description: settings.snapToGrid ? 'On' : 'Off'
            },
            {
                id: 'toggle-minimap',
                label: 'Show MiniMap',
                icon: <Settings className="w-4 h-4 text-slate-500" />,
                type: 'toggle' as const,
                value: settings.showMiniMap,
                action: settings.onToggleMiniMap,
                description: settings.showMiniMap ? 'On' : 'Off'
            }
        ] : []),
        {
            id: 'undo',
            label: 'Undo',
            icon: <ArrowRight className="w-4 h-4 rotate-180 text-slate-500" />,
            shortcut: '⌘Z',
            type: 'action',
            action: onUndo
        },
        {
            id: 'redo',
            label: 'Redo',
            icon: <ArrowRight className="w-4 h-4 text-slate-500" />,
            shortcut: '⌘Y',
            type: 'action',
            action: onRedo
        },
        {
            id: 'auto-layout',
            label: 'Auto Layout',
            icon: <Zap className="w-4 h-4 text-amber-500" />,
            type: 'action',
            action: onLayout
        }
    ], [settings, onFitView, onUndo, onRedo, onLayout]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center pb-24 pointer-events-none">
            <div className="absolute inset-0 bg-black/5 pointer-events-auto transition-opacity" onClick={onClose} />

            <div
                ref={containerRef}
                className="pointer-events-auto w-[600px] h-[480px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/40 ring-1 ring-black/5 overflow-hidden animate-in slide-in-from-bottom-4 duration-200 flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {view === 'root' && (
                    <RootView
                        commands={commands}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        selectedIndex={selectedIndex}
                        setSelectedIndex={setSelectedIndex}
                        onClose={onClose}
                        setView={setView}
                        inputRef={inputRef}
                    />
                )}
                {view === 'ai' && (
                    <AIView
                        searchQuery={searchQuery}
                        onAIGenerate={onAIGenerate}
                        onClose={onClose}
                        handleBack={handleBack}
                        isGenerating={isGenerating}
                    />
                )}
                {view === 'mermaid' && (
                    <CodeView
                        mode="mermaid"
                        nodes={nodes}
                        edges={edges}
                        onApply={onApply}
                        onClose={onClose}
                        handleBack={handleBack}
                    />
                )}
                {view === 'flowmind' && (
                    <CodeView
                        mode="flowmind"
                        nodes={nodes}
                        edges={edges}
                        onApply={onApply}
                        onClose={onClose}
                        handleBack={handleBack}
                    />
                )}
                {view === 'templates' && (
                    <TemplatesView
                        onSelectTemplate={onSelectTemplate}
                        onClose={onClose}
                        handleBack={handleBack}
                    />
                )}

                {/* Footer (only show on root?) */}
                {view === 'root' && (
                    <div className="bg-slate-50/50 border-t border-slate-200/50 px-4 py-2 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                                <span className="w-4 h-4 flex items-center justify-center bg-white border border-slate-200 rounded shadow-sm text-[9px]">↵</span>
                                <span>to select</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-4 h-4 flex items-center justify-center bg-white border border-slate-200 rounded shadow-sm text-[9px]">↑↓</span>
                                <span>to navigate</span>
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 bg-slate-200 rounded text-slate-500">Esc</span>
                            <span>to close</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
