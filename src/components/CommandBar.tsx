import React, { Suspense, lazy, useState, useEffect, useRef, useCallback } from 'react';
import { CommandBarProps, CommandView } from './command-bar/types';

import { RootView } from './command-bar/RootView';
import { useCommandBarCommands } from './command-bar/useCommandBarCommands';

const LazyTemplatesView = lazy(async () => {
    const module = await import('./command-bar/TemplatesView');
    return { default: module.TemplatesView };
});

const LazySearchView = lazy(async () => {
    const module = await import('./command-bar/SearchView');
    return { default: module.SearchView };
});

const LazyLayoutView = lazy(async () => {
    const module = await import('./command-bar/LayoutView');
    return { default: module.LayoutView };
});

const LazyLayersView = lazy(async () => {
    const module = await import('./command-bar/LayersView');
    return { default: module.LayersView };
});

const LazyPagesView = lazy(async () => {
    const module = await import('./command-bar/PagesView');
    return { default: module.PagesView };
});

const LazyAssetsView = lazy(async () => {
    const module = await import('./command-bar/AssetsView');
    return { default: module.AssetsView };
});

const LazyDesignSystemView = lazy(async () => {
    const module = await import('./command-bar/DesignSystemView');
    return { default: module.DesignSystemView };
});

type OpenCommandBarContentProps = Omit<CommandBarProps, 'isOpen'>;

function OpenCommandBarContent({
    onClose,
    nodes,
    onUndo,
    onRedo,
    onLayout,
    onSelectTemplate,
    onOpenStudioAI,
    onOpenStudioFlowMind,
    onOpenStudioMermaid,
    initialView = 'root',
    onAddAnnotation,
    onAddSection,
    onAddText,
    onAddJourney,
    onAddMindmap,
    onAddArchitecture,
    onAddImage,
    onAddBrowserWireframe,
    onAddMobileWireframe,
    onAddDomainLibraryItem,
    settings,
}: OpenCommandBarContentProps): React.ReactElement {
    const [view, setView] = useState<CommandView>(initialView);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const previouslyFocusedElementRef = useRef<HTMLElement | null>(
        document.activeElement instanceof HTMLElement ? document.activeElement : null
    );

    useEffect(() => {
        const previousElement = previouslyFocusedElementRef.current;
        inputRef.current?.focus();

        return () => {
            if (!previousElement) {
                return;
            }

            window.setTimeout(() => previousElement.focus(), 0);
        };
    }, []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.key !== 'Escape') {
                return;
            }

            event.preventDefault();
            onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

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
        onOpenStudioAI,
        onOpenStudioFlowMind,
        onOpenStudioMermaid,
    });

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center pb-24 pointer-events-none">
            <button
                type="button"
                className="absolute inset-0 bg-black/5 pointer-events-auto transition-opacity"
                onClick={onClose}
                aria-label="Close command bar"
            />

            <div
                role="dialog"
                aria-modal="true"
                aria-label="Command bar"
                className="pointer-events-auto flex h-[500px] w-[640px] flex-col overflow-hidden rounded-[var(--radius-lg)] border border-white/50 bg-white/96 shadow-[0_28px_80px_rgba(15,23,42,0.16)] ring-1 ring-black/5 backdrop-blur-2xl animate-in slide-in-from-bottom-4 duration-200"
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
                {view === 'design-system' && (
                    <Suspense fallback={null}>
                        <LazyDesignSystemView
                            onClose={onClose}
                            handleBack={handleBack}
                        />
                    </Suspense>
                )}
                {view === 'templates' && (
                    <Suspense fallback={null}>
                        <LazyTemplatesView
                            onSelectTemplate={onSelectTemplate}
                            onClose={onClose}
                            handleBack={handleBack}
                        />
                    </Suspense>
                )}
                {view === 'layout' && (
                    <Suspense fallback={null}>
                        <LazyLayoutView
                            onLayout={onLayout}
                            onClose={onClose}
                            handleBack={handleBack}
                        />
                    </Suspense>
                )}
                {view === 'search' && (
                    <Suspense fallback={null}>
                        <LazySearchView
                            nodes={nodes}
                            onClose={onClose}
                            handleBack={handleBack}
                        />
                    </Suspense>
                )}
                {view === 'assets' && (
                    <Suspense fallback={null}>
                        <LazyAssetsView
                            onClose={onClose}
                            handleBack={handleBack}
                            onAddAnnotation={() => onAddAnnotation?.()}
                            onAddSection={() => onAddSection?.()}
                            onAddText={() => onAddText?.()}
                            onAddJourney={() => onAddJourney?.()}
                            onAddMindmap={() => onAddMindmap?.()}
                            onAddArchitecture={() => onAddArchitecture?.()}
                            onAddImage={(imageUrl) => onAddImage?.(imageUrl)}
                            onAddBrowserWireframe={() => onAddBrowserWireframe?.()}
                            onAddMobileWireframe={() => onAddMobileWireframe?.()}
                            onAddDomainLibraryItem={(item) => onAddDomainLibraryItem?.(item)}
                        />
                    </Suspense>
                )}
                {view === 'layers' && (
                    <Suspense fallback={null}>
                        <LazyLayersView
                            onClose={onClose}
                            handleBack={handleBack}
                        />
                    </Suspense>
                )}
                {view === 'pages' && (
                    <Suspense fallback={null}>
                        <LazyPagesView
                            onClose={onClose}
                            handleBack={handleBack}
                        />
                    </Suspense>
                )}
                {/* Footer (only show on root?) */}
                {view === 'root' && (
                    <div className="flex items-center justify-between border-t border-slate-200/60 bg-slate-50/70 px-4 py-2.5 text-[11px] font-medium text-slate-500">
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1.5">
                                <span className="flex h-5 min-w-5 items-center justify-center rounded-md border border-slate-200 bg-white px-1 text-[10px] text-slate-500 shadow-sm">↵</span>
                                <span>Select</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="flex h-5 min-w-5 items-center justify-center rounded-md border border-slate-200 bg-white px-1 text-[10px] text-slate-500 shadow-sm">↑↓</span>
                                <span>Navigate</span>
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-md border border-slate-200 bg-white px-1.5 text-[10px] text-slate-500 shadow-sm">Esc</span>
                            <span>Close</span>
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
