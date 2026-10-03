import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { runV1Import } from './services/storage/v2/v1Import';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element to mount to');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// After first paint, so the canvas never waits on bringing v1 diagrams over.
requestAnimationFrame(() => setTimeout(() => {
  runV1Import().catch((error: unknown) => console.warn('v1 import did not run:', error));
}));
