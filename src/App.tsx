import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import 'reactflow/dist/style.css';
import { ReactFlowProvider } from 'reactflow';

import { useFlowStore } from './store';
import { useBrandTheme } from './hooks/useBrandTheme';

import { FlowEditor } from './components/FlowEditor';
import { HomePage } from './components/HomePage';
import { LandingPage } from './components/LandingPage';
import { DocsLayout } from './components/docs/DocsLayout';
import { DocsPage } from './components/docs/DocsPage';

import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { initAnalytics } from './lib/analytics';

// Initialize analytics once
initAnalytics();

function FlowEditorWrapper({ onGoHome }: { onGoHome: () => void }): React.JSX.Element {
  return <FlowEditor onGoHome={onGoHome} />;
}

function LandingPageRoute(): React.JSX.Element {
  const navigate = useNavigate();
  return <LandingPage onLaunch={() => navigate('/home', { replace: true })} />;
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

  return <FlowEditor onGoHome={() => navigate('/home')} />;
}

function HomePageRoute(): React.JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab = location.pathname === '/settings' ? 'settings' : 'home';

  const handleLaunch = () => {
    navigate('/canvas');
  };

  const handleRestore = (snapshot: any) => {
    const { setNodes, setEdges } = useFlowStore.getState();
    // Deep copy to prevent state mutation issues if snapshot is just a ref
    const nodesCopy = JSON.parse(JSON.stringify(snapshot.nodes));
    const edgesCopy = JSON.parse(JSON.stringify(snapshot.edges));
    setNodes(nodesCopy);
    setEdges(edgesCopy);
    navigate('/canvas');
  };

  return (
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
          <Route path="/home" element={<HomePageRoute />} />
          <Route path="/settings" element={<HomePageRoute />} />
          <Route path="/canvas" element={<FlowCanvasRoute />} />
          <Route path="/flow/:flowId" element={<FlowCanvasRoute />} />
          <Route path="/docs" element={<DocsLayout />}>
            <Route path=":slug" element={<DocsPage />} />
          </Route>
        </Routes>

        <KeyboardShortcutsModal />
      </ReactFlowProvider>
    </Router>
  );
}

export default App;