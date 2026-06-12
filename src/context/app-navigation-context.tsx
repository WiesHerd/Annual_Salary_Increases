import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppView } from '../components/layout';
import type { ControlsTabId } from '../lib/controls-tab-url';
import {
  appLocationForDataBrowser,
  appLocationFromViewTab,
  applyAppLocationToHistory,
  navigateAppLocation,
  parseAppLocation,
  readNavReturnLabel,
  type AppLocation,
  type DataBrowserTab,
  type NavigateOptions,
} from '../lib/app-navigation';

interface AppNavigationContextValue {
  location: AppLocation;
  returnLabel: string | null;
  navigate: (target: AppLocation, options?: NavigateOptions) => void;
  navigateToView: (view: AppView, options?: NavigateOptions) => void;
  navigateWorkflow: (view: AppView, tab?: ControlsTabId) => void;
  navigateToDataBrowser: (dataTab?: DataBrowserTab, options?: NavigateOptions) => void;
  openControls: (controlsTab: ControlsTabId, focus?: string, options?: NavigateOptions) => void;
  openProviderTypeSurvey: (options?: NavigateOptions) => void;
  goBack: () => void;
}

const AppNavigationContext = createContext<AppNavigationContextValue | null>(null);

export function AppNavigationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<AppLocation>(() => parseAppLocation());
  const [returnLabel, setReturnLabel] = useState<string | null>(() => readNavReturnLabel());

  const syncFromUrl = useCallback(() => {
    setLocation(parseAppLocation());
    setReturnLabel(readNavReturnLabel());
  }, []);

  useEffect(() => {
    const parsed = parseAppLocation();
    applyAppLocationToHistory(parsed, 'replace', window.history.state);
    syncFromUrl();
  }, [syncFromUrl]);

  useEffect(() => {
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, [syncFromUrl]);

  const navigate = useCallback((target: AppLocation, options?: NavigateOptions) => {
    navigateAppLocation(target, options);
    syncFromUrl();
  }, [syncFromUrl]);

  const navigateToView = useCallback(
    (view: AppView, options?: NavigateOptions) => {
      navigate({ view }, options);
    },
    [navigate]
  );

  const navigateWorkflow = useCallback(
    (view: AppView, tab?: ControlsTabId) => {
      navigate(appLocationFromViewTab(view, tab), { returnToCurrent: true });
    },
    [navigate]
  );

  const navigateToDataBrowser = useCallback(
    (dataTab?: DataBrowserTab, options?: NavigateOptions) => {
      navigate(appLocationForDataBrowser(dataTab), options);
    },
    [navigate]
  );

  const openControls = useCallback(
    (controlsTab: ControlsTabId, focus?: string, options?: NavigateOptions) => {
      navigate(
        {
          view: 'parameters',
          controlsTab,
          ...(focus ? { focus } : {}),
        },
        { returnToCurrent: true, ...options }
      );
    },
    [navigate]
  );

  const openProviderTypeSurvey = useCallback(
    (options?: NavigateOptions) => {
      openControls('provider-type-survey', undefined, { returnToCurrent: true, ...options });
    },
    [openControls]
  );

  const goBack = useCallback(() => {
    window.history.back();
  }, []);

  const value = useMemo(
    () => ({
      location,
      returnLabel,
      navigate,
      navigateToView,
      navigateWorkflow,
      navigateToDataBrowser,
      openControls,
      openProviderTypeSurvey,
      goBack,
    }),
    [
      location,
      returnLabel,
      navigate,
      navigateToView,
      navigateWorkflow,
      navigateToDataBrowser,
      openControls,
      openProviderTypeSurvey,
      goBack,
    ]
  );

  return <AppNavigationContext.Provider value={value}>{children}</AppNavigationContext.Provider>;
}

export function useAppNavigation(): AppNavigationContextValue {
  const ctx = useContext(AppNavigationContext);
  if (!ctx) {
    throw new Error('useAppNavigation must be used within AppNavigationProvider');
  }
  return ctx;
}
