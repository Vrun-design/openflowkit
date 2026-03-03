import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CommandBarProps, CommandView } from './command-bar/types';

// Import newly refactored views
import { RootView } from './command-bar/RootView';
import { AIView } from './command-bar/AIView';
import { CodeView } from './command-bar/CodeView';
import { TemplatesView } from './command-bar/TemplatesView';
import { SearchView } from './command-bar/SearchView';
import { LayoutView } from './command-bar/LayoutView';
import { VisualsView } from './command-bar/VisualsView';

import { DesignSystemView } from './command-bar/DesignSystemView';
import { WireframesView } from './command-bar/WireframesView';
import { useCommandBarCommands } from './command-bar/useCommandBarCommands';

type OpenCommandBarContentProps = Omit<CommandBarProps, 'isOpen'>;

function OpenCommandBarContent({
    onClose,
    nodes,
    edges,
    onApply,
    onAIGenerate,
    isGenerating,
    onUndo,
    onRedo,
    onLayout,
    onSelectTemplate,
    initialView = 'root',
    settings,
    chatMessages,
    onClearChat
}: OpenCommandBarContentProps): React.ReactElement {
    const [view, setView] = useState<CommandView>(initialView);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 50);
    }, []);

    const handleBack = useCallback(() => {
        if (view === 'root') {
            onClose();
        } else {
            setView('root');
            setSearchQuery('');
        }
    }, [view, onClose]);

    const commands = useCommandBarCommands({
        settings,
        onUndo,
        onRedo,
    });

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center pb-24 pointer-events-none">
            <div className="absolute inset-0 bg-black/5 pointer-events-auto transition-opacity" onClick={onClose} />

            <div
                ref={containerRef}
                className="pointer-events-auto w-[600px] h-[480px] bg-white/95 backdrop-blur-xl rounded-[var(--radius-lg)] shadow-2xl border border-white/40 ring-1 ring-black/5 overflow-hidden animate-in slide-in-from-bottom-4 duration-200 flex flex-col"
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
                {view === 'visuals' && (
                    <VisualsView onBack={handleBack} />
                )}
                {view === 'design-system' && (
                    <DesignSystemView
                        onClose={onClose}
                        handleBack={handleBack}
                    />
                )}
                {view === 'ai' && (
                    <AIView
                        searchQuery={searchQuery}
                        onAIGenerate={onAIGenerate}
                        onClose={onClose}
                        handleBack={handleBack}
                        isGenerating={isGenerating}
                        chatMessages={chatMessages}
                        onClearChat={onClearChat}
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
                {view === 'layout' && (
                    <LayoutView
                        onLayout={onLayout}
                        onClose={onClose}
                        handleBack={handleBack}
                    />
                )}
                {view === 'search' && (
                    <SearchView
                        nodes={nodes}
                        onClose={onClose}
                        handleBack={handleBack}
                    />
                )}
                {view === 'wireframes' && (
                    <WireframesView
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
}

export const CommandBar: React.FC<CommandBarProps> = ({ isOpen, ...props }) => {
    if (!isOpen) return null;
    return <OpenCommandBarContent {...props} />;
};
