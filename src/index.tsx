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
import { discardPendingCrashRecovery, ensureLocalFirstPersistenceReady,
  getPendingCrashRecovery, restorePendingCrashRecovery } from './services/storage/localFirstRuntime';
import { installStorageTelemetrySink } from './services/storage/storageTelemetrySink';
import { reportStorageTelemetry } from './services/storage/storageTelemetry';
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
  const [recoveryAvailable, setRecoveryAvailable] = React.useState(false);

  React.useEffect(() => {
    let isDisposed = false;

    void ensureLocalFirstPersistenceReady()
      .catch((error) => {
        reportStorageTelemetry({
          area: 'runtime',
          code: 'BOOTSTRAP_PERSISTENCE_READY_FAILED',
          severity: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Local-first persistence bootstrap failed.',
        });
      })
      .finally(() => {
        if (!isDisposed) {
          setRecoveryAvailable(Boolean(getPendingCrashRecovery()));
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

  return <>
    {recoveryAvailable ? <section role="alertdialog" aria-label="Recover unsaved work">
      <h1>Recover unsaved work?</h1>
      <p>A newer local edit journal was found after the previous session ended.</p>
      <button type="button" onClick={() => { restorePendingCrashRecovery(); setRecoveryAvailable(false); }}>
        Recover work
      </button>
      <button type="button" onClick={() => { discardPendingCrashRecovery(); setRecoveryAvailable(false); }}>
        Discard recovery
      </button>
    </section> : null}
    <App />
  </>;
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
