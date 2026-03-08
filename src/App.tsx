import React, { lazy, Suspense, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import { ReactFlowProvider } from '@/lib/reactflowCompat';
import { Monitor, ArrowLeft } from 'lucide-react';
import { createFlowEditorImportRouteState } from '@/app/routeState';
import { RouteLoadingFallback } from '@/components/app/RouteLoadingFallback';
import { OpenFlowLogo } from './components/icons/OpenFlowLogo';

import { useFlowStore } from './store';
import { useActiveTabId, useTabActions } from '@/store/tabHooks';
import { useBrandTheme } from './hooks/useBrandTheme';

import { initAnalytics } from './lib/analytics';
import { FlowSnapshot } from './lib/types';
import { useShortcutHelpOpen } from '@/store/viewHooks';

// Import i18n configuration
import './i18n/config';

// Initialize analytics once
initAnalytics();

const FlowEditor = lazy(async () => {
  const module = await import('./components/FlowEditor');
  return { default: module.FlowEditor };
});

const HomePage = lazy(async () => {
  const module = await import('./components/HomePage');
  return { default: module.HomePage };
});

const LandingPage = lazy(async () => {
  const module = await import('./components/LandingPage');
  return { default: module.LandingPage };
});

const DocsLayout = lazy(async () => {
  const module = await import('./components/docs/DocsLayout');
  return { default: module.DocsLayout };
});

const DocsPage = lazy(async () => {
  const module = await import('./components/docs/DocsPage');
  return { default: module.DocsPage };
});

const LazyKeyboardShortcutsModal = lazy(async () => {
  const module = await import('./components/KeyboardShortcutsModal');
  return { default: module.KeyboardShortcutsModal };
});

function LandingPageRoute(): React.JSX.Element {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <LandingPage onLaunch={() => navigate('/home', { replace: true })} />
    </Suspense>
  );
}

// Backwards-compatibility redirect: /docs/:slug → /docs/en/:slug
function DocsSlugRedirect(): React.JSX.Element {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/docs/en/${slug}`} replace />;
}

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
  const activeTabId = useActiveTabId();
  const { addTab } = useTabActions();

  const activeTab = location.pathname === '/settings' ? 'settings' : 'home';

  const handleLaunch = () => {
    const newTabId = addTab();
    navigate(`/flow/${newTabId}`);
  };

  const handleRestore = (snapshot: FlowSnapshot) => {
    const { setNodes, setEdges, updateTab } = useFlowStore.getState();
    // Deep copy to prevent state mutation issues if snapshot is just a ref
    const nodesCopy = JSON.parse(JSON.stringify(snapshot.nodes));
    const edgesCopy = JSON.parse(JSON.stringify(snapshot.edges));
    setNodes(nodesCopy);
    setEdges(edgesCopy);
    updateTab(activeTabId, { name: snapshot.name });
    navigate(`/flow/${activeTabId}`);
  };

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
                    <HomePage
                        onLaunch={handleLaunch}
                        onImportJSON={() => {
                            navigate('/canvas', {
                              state: createFlowEditorImportRouteState(),
                            });
                        }}
                        onRestoreSnapshot={handleRestore}
                        onOpenFlow={(flowId) => navigate(`/flow/${flowId}`)}
                        activeTab={activeTab}
                        onSwitchTab={(tab) => navigate(tab === 'settings' ? '/settings' : '/home')}
                    />
    </Suspense>
  );
}

// Mobile gate — shows a friendly message on screens < md (768px)
function MobileGate({ children }: { children: React.ReactNode }): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <>
      {/* Mobile: Friendly message */}
      <div className="md:hidden fixed inset-0 z-[100] flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_45%),linear-gradient(180deg,_white,_#f8fafc)] px-6 text-center">
        <div className="w-full max-w-sm rounded-[28px] border border-slate-200/80 bg-white/90 px-6 py-8 shadow-2xl shadow-slate-200/70 backdrop-blur-md">
          <div className="mx-auto mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-primary text-white shadow-xl shadow-brand-primary/20 ring-1 ring-white/20">
            <OpenFlowLogo className="h-8 w-8 text-white" />
          </div>

          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary/5">
            <Monitor className="h-6 w-6 text-brand-primary" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-brand-dark">
            Editing works best on larger screens
          </h2>

          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-brand-secondary">
            The canvas editor is tuned for desktop and large-tablet layouts. On this device, docs and product overview pages will work better than the full editing workspace.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Recommended
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Open the editor on a laptop or larger tablet for canvas controls, panels, and collaboration tools.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <button
              onClick={() => navigate('/docs')}
              className="inline-flex items-center justify-center rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-primary/15 transition-colors hover:brightness-110"
            >
              Open Docs Instead
            </button>

            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-primary/20 px-5 py-2.5 text-sm font-medium text-brand-primary transition-colors hover:bg-brand-primary/5"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </button>
          </div>
        </div>
      </div>

      {/* Desktop: Normal content */}
      <div className="hidden md:contents">
        {children}
      </div>
    </>
  );
}

function App(): React.JSX.Element {
  const { setShortcutsHelpOpen } = useFlowStore();
  const isShortcutsHelpOpen = useShortcutHelpOpen();
  useBrandTheme();

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
        <Route path="/" element={<LandingPageRoute />} />
        <Route path="/home" element={<MobileGate><HomePageRoute /></MobileGate>} />
        <Route path="/settings" element={<MobileGate><HomePageRoute /></MobileGate>} />
        <Route path="/canvas" element={<MobileGate><FlowCanvasRoute /></MobileGate>} />
        <Route path="/flow/:flowId" element={<MobileGate><FlowCanvasRoute /></MobileGate>} />
        <Route
          path="/docs"
          element={(
            <Suspense fallback={<RouteLoadingFallback />}>
              <DocsLayout />
            </Suspense>
          )}
        >
          <Route index element={<Navigate to="en/introduction" replace />} />
          <Route path=":slug" element={<DocsSlugRedirect />} />
          <Route
            path=":lang/:slug"
            element={(
              <Suspense fallback={<RouteLoadingFallback />}>
                <DocsPage />
              </Suspense>
            )}
          />
        </Route>
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
