import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AppErrorBoundary } from './components/app-error-boundary';
import { StorageFailureBanner } from './components/storage-failure-banner';
import { ParametersStateProvider } from './hooks/use-parameters-state';
import { AppStateProvider } from './hooks/use-app-state';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <ParametersStateProvider>
        <AppStateProvider>
          <StorageFailureBanner />
          <App />
        </AppStateProvider>
      </ParametersStateProvider>
    </AppErrorBoundary>
  </React.StrictMode>
);
