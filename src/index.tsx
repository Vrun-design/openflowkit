import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RouteLoadingFallback } from './components/app/RouteLoadingFallback';
import { ToastProvider } from './components/ui/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import {
  captureAppOpened,
  captureSessionStarted,
  initializeAnalytics,
} from './services/analytics/analytics';
import { ensureLocalFirstPersistenceReady } from './services/storage/localFirstRuntime';
import { installStorageTelemetrySink } from './services/storage/storageTelemetrySink';
import { registerAppShellServiceWorker } from './services/offline/registerAppShellServiceWorker';
import './index.css';

initializeAnalytics();
captureAppOpened();
captureSessionStarted();
installStorageTelemetrySink();
registerAppShellServiceWorker();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);

function BootstrapApp(): React.ReactElement {
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    let isDisposed = false;

    void ensureLocalFirstPersistenceReady()
      .catch(() => undefined)
      .finally(() => {
        if (!isDisposed) {
          setIsReady(true);
        }
      });

    return () => {
      isDisposed = true;
    };
  }, []);

  if (!isReady) {
    return (
      <RouteLoadingFallback
        title="Restoring your workspace"
        description="Loading your diagrams, chat history, and local settings."
      />
    );
  }

  return <App />;
}

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <BootstrapApp />
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
