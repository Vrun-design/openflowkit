import React, { Suspense, lazy, useState, useEffect, useRef, useCallback } from 'react';
import { CommandBarProps, CommandView } from './command-bar/types';

import { RootView } from './command-bar/RootView';
import { useCommandBarCommands } from './command-bar/useCommandBarCommands';

const LazyImportView = lazy(async () => {
  const module = await import('./command-bar/ImportView');
  return { default: module.ImportView };
});

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
  onOpenStudioOpenFlow,
  onOpenStudioMermaid,
  initialView = 'root',
  onAddAnnotation: _onAddAnnotation,
  onAddSection: _onAddSection,
  onAddText: _onAddText,
  onAddJourney: _onAddJourney,
  onAddMindmap: _onAddMindmap,
  onAddArchitecture: _onAddArchitecture,
  onAddSequence: _onAddSequence,
  onAddClassNode: _onAddClassNode,
  onAddEntityNode: _onAddEntityNode,
  onAddImage: _onAddImage,
  onAddBrowserWireframe: _onAddBrowserWireframe,
  onAddMobileWireframe: _onAddMobileWireframe,
  onAddDomainLibraryItem,
  onCodeAnalysis,
  onSqlAnalysis,
  onTerraformAnalysis,
  onOpenApiAnalysis,
  onApplyDsl,
  onCodebaseAnalysis,
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

  const hasImport = Boolean(
    onCodeAnalysis ?? onSqlAnalysis ?? onTerraformAnalysis ?? onOpenApiAnalysis
  );

  const commands = useCommandBarCommands({
    settings,
    onUndo,
    onRedo,
    onOpenStudioAI,
    onOpenStudioOpenFlow,
    onOpenStudioMermaid,
    hasImport,
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
        aria-describedby="command-bar-description"
        className="pointer-events-auto flex h-[500px] w-[640px] flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-brand-border)]/80 bg-[var(--brand-surface)]/96 shadow-[var(--shadow-overlay)] ring-1 ring-black/5 backdrop-blur-2xl animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <p id="command-bar-description" className="sr-only">
          Search quick actions, templates, layout tools, and editor commands.
        </p>
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
            <LazyDesignSystemView onClose={onClose} handleBack={handleBack} />
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
            <LazyLayoutView onLayout={onLayout} onClose={onClose} handleBack={handleBack} />
          </Suspense>
        )}
        {view === 'search' && (
          <Suspense fallback={null}>
            <LazySearchView nodes={nodes} onClose={onClose} handleBack={handleBack} />
          </Suspense>
        )}
        {view === 'assets' && (
          <Suspense fallback={null}>
            <LazyAssetsView
              onClose={onClose}
              handleBack={handleBack}
              onAddDomainLibraryItem={(item) => onAddDomainLibraryItem?.(item)}
            />
          </Suspense>
        )}
        {view === 'layers' && (
          <Suspense fallback={null}>
            <LazyLayersView onClose={onClose} handleBack={handleBack} />
          </Suspense>
        )}
        {view === 'pages' && (
          <Suspense fallback={null}>
            <LazyPagesView onClose={onClose} handleBack={handleBack} />
          </Suspense>
        )}
        {view === 'import' && (
          <Suspense fallback={null}>
            <LazyImportView
              onClose={onClose}
              handleBack={handleBack}
              onCodeAnalysis={onCodeAnalysis}
              onSqlAnalysis={onSqlAnalysis}
              onTerraformAnalysis={onTerraformAnalysis}
              onOpenApiAnalysis={onOpenApiAnalysis}
              onApplyDsl={onApplyDsl}
              onCodebaseAnalysis={onCodebaseAnalysis}
            />
          </Suspense>
        )}
        {/* Footer (only show on root?) */}
        {view === 'root' && (
          <div className="flex items-center justify-between border-t border-[var(--color-brand-border)]/80 bg-[var(--brand-background)]/70 px-4 py-2.5 text-[11px] font-medium text-[var(--brand-secondary)]">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="flex h-5 min-w-5 items-center justify-center rounded-md border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-1 text-[10px] text-[var(--brand-secondary)] shadow-sm">
                  ↵
                </span>
                <span>Select</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="flex h-5 min-w-5 items-center justify-center rounded-md border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-1 text-[10px] text-[var(--brand-secondary)] shadow-sm">
                  ↑↓
                </span>
                <span>Navigate</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="flex h-5 min-w-5 items-center justify-center rounded-md border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-1.5 text-[10px] text-[var(--brand-secondary)] shadow-sm">
                Esc
              </span>
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
