import { Layout } from './components/layout';
import { NavigationBackBar } from './components/navigation-back-bar';
import { AppNavigationProvider, useAppNavigation } from './context/app-navigation-context';
import { DataPage } from './features/data/data-page';
import { SalaryReviewPage } from './features/review/salary-review-page';
import { CompareScenariosPage } from './features/compare/compare-scenarios-page';
import { ParametersPage } from './features/parameters/parameters-page';
import { PolicyHelpPage } from './features/help';
import { useEffect, useState } from 'react';

function AppRoutes() {
  const { location, returnLabel, goBack, navigate, openProviderTypeSurvey } = useAppNavigation();
  const [salaryReviewFullScreen, setSalaryReviewFullScreen] = useState(false);

  useEffect(() => {
    if (location.view !== 'salary-review') setSalaryReviewFullScreen(false);
  }, [location.view]);

  const sidebarHidden = location.view === 'salary-review' && salaryReviewFullScreen;
  const contentNoPadding = sidebarHidden;

  return (
    <Layout
      currentView={location.view}
      onNavigate={(view) => navigate({ view })}
      sidebarHidden={sidebarHidden}
      contentNoPadding={contentNoPadding}
    >
      {!contentNoPadding && <NavigationBackBar returnLabel={returnLabel} onBack={goBack} />}

      {location.view === 'import' && <DataPage focus="import" />}
      {location.view === 'data-browser' && (
        <DataPage focus="browse" onOpenProviderTypeSurvey={() => openProviderTypeSurvey()} />
      )}
      {location.view === 'specialty-map' && (
        <DataPage
          focus="browse"
          standaloneTab="specialty-map"
          onOpenProviderTypeSurvey={() => openProviderTypeSurvey()}
        />
      )}
      {location.view === 'salary-review' && (
        <SalaryReviewPage
          fullScreen={salaryReviewFullScreen}
          onFullScreenChange={setSalaryReviewFullScreen}
        />
      )}
      {location.view === 'parameters' && <ParametersPage />}
      {location.view === 'help' && <PolicyHelpPage />}
      {location.view === 'compare' && <CompareScenariosPage />}
    </Layout>
  );
}

function App() {
  return (
    <AppNavigationProvider>
      <AppRoutes />
    </AppNavigationProvider>
  );
}

export default App;
