import React, { lazy, Suspense, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { ReactFlowProvider } from '@/lib/reactflowCompat';
import { createFlowEditorImportRouteState, createFlowEditorTemplatesRouteState } from '@/app/routeState';
import { DocsSiteRedirect } from '@/components/app/DocsSiteRedirect';
import { RouteLoadingFallback } from '@/components/app/RouteLoadingFallback';
import { MobileWorkspaceGate } from '@/components/app/MobileWorkspaceGate';

import { useFlowStore } from './store';
import { useTabActions } from '@/store/tabHooks';
import { useShortcutHelpOpen } from '@/store/viewHooks';

// Import i18n configuration
import './i18n/config';


const FlowEditor = lazy(async () => {
  const module = await import('./components/FlowEditor');
  return { default: module.FlowEditor };
});

const HomePage = lazy(async () => {
  const module = await import('./components/HomePage');
  return { default: module.HomePage };
});

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
  const { setActiveTabId } = useTabActions();

  useEffect(() => {
    if (flowId) {
      setActiveTabId(flowId);
    }
  }, [flowId, setActiveTabId]);

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <ReactFlowProvider>
        <FlowEditor onGoHome={() => navigate('/home')} />
      </ReactFlowProvider>
    </Suspense>
  );
}

function HomePageRoute(): React.JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { addTab } = useTabActions();

  const activeTab = location.pathname === '/settings' ? 'settings' : 'home';

  const handleLaunch = () => {
    const newTabId = addTab();
    navigate(`/flow/${newTabId}`);
  };

  const handleLaunchWithTemplates = () => {
    const newTabId = addTab();
    navigate(`/flow/${newTabId}`, { state: createFlowEditorTemplatesRouteState() });
  };

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
                    <HomePage
                        onLaunch={handleLaunch}
                        onLaunchWithTemplates={handleLaunchWithTemplates}
                        onImportJSON={() => {
                            navigate('/canvas', {
                              state: createFlowEditorImportRouteState(),
                            });
                        }}
                        onOpenFlow={(flowId) => navigate(`/flow/${flowId}`)}
                        activeTab={activeTab}
                        onSwitchTab={(tab) => navigate(tab === 'settings' ? '/settings' : '/home')}
                    />
    </Suspense>
  );
}

function EditorRouteGate({ children }: { children: React.ReactNode }): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <MobileWorkspaceGate
      onOpenDocs={() => navigate('/docs')}
      onGoHome={() => navigate('/home')}
    >
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
      const isInput = activeElement instanceof HTMLInputElement ||
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
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route
          path="/view"
          element={(
            <Suspense fallback={<RouteLoadingFallback />}>
              <LazyDiagramViewer />
            </Suspense>
          )}
        />
        <Route path="/home" element={<HomePageRoute />} />
        <Route path="/settings" element={<HomePageRoute />} />
        <Route path="/canvas" element={<EditorRouteGate><FlowCanvasRoute /></EditorRouteGate>} />
        <Route path="/flow/:flowId" element={<EditorRouteGate><FlowCanvasRoute /></EditorRouteGate>} />
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
  );
}

export default App;
