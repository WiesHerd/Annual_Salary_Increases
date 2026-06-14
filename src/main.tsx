import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AppErrorBoundary } from './components/app-error-boundary';
import { AuditActorSync } from './components/audit-actor-sync';
import { StorageFailureBanner } from './components/storage-failure-banner';
import { AuthenticatedShell, MeritlyAppGate } from './components/meritly-app-gate';
import { ParametersStateProvider } from './hooks/use-parameters-state';
import { AppStateProvider } from './hooks/use-app-state';
import { SelectedCycleProvider } from './context/selected-cycle-context';
import { SupabaseAuthProvider } from './context/supabase-auth-context';
import { ToastProvider } from './components/ui/toast';
import { initErrorLogging } from './lib/error-log';

initErrorLogging();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <SupabaseAuthProvider>
        <AuditActorSync />
        <MeritlyAppGate>
          <AuthenticatedShell>
            <ToastProvider>
              <ParametersStateProvider>
                <SelectedCycleProvider>
                  <AppStateProvider>
                    <StorageFailureBanner />
                    <App />
                  </AppStateProvider>
                </SelectedCycleProvider>
              </ParametersStateProvider>
            </ToastProvider>
          </AuthenticatedShell>
        </MeritlyAppGate>
      </SupabaseAuthProvider>
    </AppErrorBoundary>
  </React.StrictMode>
);
