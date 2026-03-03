import React, { lazy, Suspense, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import 'reactflow/dist/style.css';
import { ReactFlowProvider } from 'reactflow';
import { Monitor, ArrowLeft } from 'lucide-react';
import { OpenFlowLogo } from './components/icons/OpenFlowLogo';

import { useFlowStore } from './store';
import { useBrandTheme } from './hooks/useBrandTheme';

import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { initAnalytics } from './lib/analytics';
import { FlowSnapshot } from './lib/types';

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

function RouteLoadingFallback(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-[var(--brand-background)] flex items-center justify-center text-[var(--brand-secondary)]">
      Loading...
    </div>
  );
}

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
  const { setActiveTabId } = useFlowStore();

  useEffect(() => {
    if (flowId) {
      setActiveTabId(flowId);
    }
  }, [flowId, setActiveTabId]);

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <FlowEditor onGoHome={() => navigate('/home')} />
    </Suspense>
  );
}

function HomePageRoute(): React.JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab = location.pathname === '/settings' ? 'settings' : 'home';

  const handleLaunch = () => {
    navigate('/canvas');
  };

  const handleRestore = (snapshot: FlowSnapshot) => {
    const { setNodes, setEdges } = useFlowStore.getState();
    // Deep copy to prevent state mutation issues if snapshot is just a ref
    const nodesCopy = JSON.parse(JSON.stringify(snapshot.nodes));
    const edgesCopy = JSON.parse(JSON.stringify(snapshot.edges));
    setNodes(nodesCopy);
    setEdges(edgesCopy);
    navigate('/canvas');
  };

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <HomePage
        onLaunch={handleLaunch}
        onImportJSON={() => {
          navigate('/canvas');
          setTimeout(() => {
            document.getElementById('json-import-input')?.click();
          }, 100);
        }}
        onRestoreSnapshot={handleRestore}
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
      <div className="md:hidden fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center px-8 text-center">
        <div className="w-14 h-14 bg-brand-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-primary/20 mb-8 ring-1 ring-white/20">
          <OpenFlowLogo className="w-8 h-8 text-white" />
        </div>

        <div className="w-12 h-12 rounded-full bg-brand-primary/5 flex items-center justify-center mb-6">
          <Monitor className="w-6 h-6 text-brand-primary" />
        </div>

        <h2 className="text-2xl font-bold text-brand-dark mb-3 tracking-tight">
          Designed for larger screens
        </h2>

        <p className="text-brand-secondary text-base leading-relaxed max-w-sm mb-10">
          OpenFlowKit diagram editor needs a desktop or tablet-sized screen for the best experience. Please open this on a larger device.
        </p>

        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-primary hover:text-brand-primary/80 transition-colors px-5 py-2.5 rounded-full border border-brand-primary/20 hover:bg-brand-primary/5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>
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
      <ReactFlowProvider>
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

        <KeyboardShortcutsModal />
      </ReactFlowProvider>
    </Router>
  );
}

export default App;
