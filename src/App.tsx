import React, { lazy, Suspense, useEffect } from 'react';
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  useParams,
} from 'react-router-dom';
import { ReactFlowProvider } from '@/lib/reactflowCompat';
import {
  createFlowEditorAIRouteState,
  createFlowEditorInitialTemplateRouteState,
  createFlowEditorImportRouteState,
  createFlowEditorTemplatesRouteState,
} from '@/app/routeState';
import { DocsSiteRedirect } from '@/components/app/DocsSiteRedirect';
import { RouteLoadingFallback } from '@/components/app/RouteLoadingFallback';
import { MobileWorkspaceGate } from '@/components/app/MobileWorkspaceGate';
import { CinematicExportProvider } from '@/context/CinematicExportContext';
import { HomePage } from '@/components/HomePage';

import { useFlowStore } from './store';
import { useEditorPageActions } from '@/store/editorPageHooks';
import { useWorkspaceDocumentActions, useWorkspaceRouteResolver } from '@/store/documentHooks';
import { useShortcutHelpOpen } from '@/store/viewHooks';

// Import i18n configuration
import './i18n/config';

async function loadFlowEditorModule() {
  const module = await import('./components/FlowEditor');
  return { default: module.FlowEditor };
}

const FlowEditor = lazy(loadFlowEditorModule);

const LazyKeyboardShortcutsModal = lazy(async () => {
  const module = await import('./components/KeyboardShortcutsModal');
  return { default: module.KeyboardShortcutsModal };
});

const LazyDiagramViewer = lazy(async () => {
  const module = await import('./components/DiagramViewer');
  return { default: module.DiagramViewer };
});

function FlowCanvasRoute(): React.JSX.Element {
  const { flowId } = useParams();
  const navigate = useNavigate();
  const { setActiveDocumentId } = useWorkspaceDocumentActions();
  const { setActivePageId } = useEditorPageActions();
  const { resolveTarget } = useWorkspaceRouteResolver();

  useEffect(() => {
    if (flowId) {
      const target = resolveTarget(flowId);
      if (!target) {
        return;
      }

      setActiveDocumentId(target.documentId);
      setActivePageId(target.pageId);
    }
  }, [flowId, resolveTarget, setActiveDocumentId, setActivePageId]);

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <ReactFlowProvider>
        <CinematicExportProvider>
          <FlowEditor onGoHome={() => navigate('/home')} />
        </CinematicExportProvider>
      </ReactFlowProvider>
    </Suspense>
  );
}

function HomePageRoute(): React.JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { createDocument } = useWorkspaceDocumentActions();

  const activeTab = location.pathname === '/settings'
    ? 'settings'
    : location.pathname === '/templates'
      ? 'templates'
      : 'home';

  useEffect(() => {
    void loadFlowEditorModule();
  }, []);

  const handleLaunch = () => {
    const newDocumentId = createDocument();
    navigate(`/flow/${newDocumentId}`);
  };

  const handleLaunchWithTemplates = () => {
    const newDocumentId = createDocument();
    navigate(`/flow/${newDocumentId}`, { state: createFlowEditorTemplatesRouteState() });
  };

  const handleLaunchWithAI = () => {
    const newDocumentId = createDocument();
    navigate(`/flow/${newDocumentId}`, { state: createFlowEditorAIRouteState() });
  };

  const handleLaunchWithInitialTemplate = (templateId: string) => {
    const newDocumentId = createDocument();
    navigate(`/flow/${newDocumentId}`, { state: createFlowEditorInitialTemplateRouteState(templateId) });
  };

  return (
    <HomePage
      onLaunch={handleLaunch}
      onLaunchWithTemplates={handleLaunchWithTemplates}
      onLaunchWithTemplate={handleLaunchWithInitialTemplate}
      onLaunchWithAI={handleLaunchWithAI}
      onImportJSON={() => {
        navigate('/canvas', {
          state: createFlowEditorImportRouteState(),
        });
      }}
      onOpenFlow={(flowId) => navigate(`/flow/${flowId}`)}
      activeTab={activeTab}
      onSwitchTab={(tab) => navigate(
        tab === 'settings'
          ? '/settings'
          : tab === 'templates'
            ? '/templates'
            : '/home'
      )}
    />
  );
}

function EditorRouteGate({ children }: { children: React.ReactNode }): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <MobileWorkspaceGate onOpenDocs={() => navigate('/docs')} onGoHome={() => navigate('/home')}>
      {children}
    </MobileWorkspaceGate>
  );
}

function App(): React.JSX.Element {
  const { setShortcutsHelpOpen } = useFlowStore();
  const isShortcutsHelpOpen = useShortcutHelpOpen();
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const activeElement = document.activeElement as HTMLElement | null;
      const isInput =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement?.isContentEditable;

      if (isInput) return;

      const isQuestionMark = e.key === '?';
      const isCmdSlash = (e.metaKey || e.ctrlKey) && e.key === '/';

      if (isQuestionMark || isCmdSlash) {
        if (isCmdSlash) e.preventDefault();
        const { isShortcutsHelpOpen } = useFlowStore.getState().viewSettings;
        setShortcutsHelpOpen(!isShortcutsHelpOpen);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setShortcutsHelpOpen]);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-slate-900 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Skip to content
      </a>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route
            path="/view"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <LazyDiagramViewer />
              </Suspense>
            }
          />
          <Route path="/home" element={<HomePageRoute />} />
          <Route path="/templates" element={<HomePageRoute />} />
          <Route path="/settings" element={<HomePageRoute />} />
          <Route
            path="/canvas"
            element={
              <EditorRouteGate>
                <FlowCanvasRoute />
              </EditorRouteGate>
            }
          />
          <Route
            path="/flow/:flowId"
            element={
              <EditorRouteGate>
                <FlowCanvasRoute />
              </EditorRouteGate>
            }
          />
          <Route path="/docs" element={<DocsSiteRedirect />} />
          <Route path="/docs/:slug" element={<DocsSiteRedirect />} />
          <Route path="/docs/:lang/:slug" element={<DocsSiteRedirect />} />
        </Routes>

        {isShortcutsHelpOpen ? (
          <Suspense fallback={null}>
            <LazyKeyboardShortcutsModal />
          </Suspense>
        ) : null}
      </Router>
    </>
  );
}

export default App;
