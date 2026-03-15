import { useEffect, useState } from 'react';
import { Layout, type AppView } from './components/layout';
import { DataPage, type DataTab } from './features/data/data-page';
import { SalaryReviewPage } from './features/review/salary-review-page';
import { CompareScenariosPage } from './features/compare/compare-scenarios-page';
import { ParametersPage } from './features/parameters/parameters-page';
import { PolicyHelpPage } from './features/help';

const VIEWS: AppView[] = ['import', 'data-browser', 'specialty-map', 'salary-review', 'compare', 'parameters', 'help'];

function getInitialView(): AppView {
  const hash = window.location.hash.slice(1);
  if (hash && VIEWS.includes(hash as AppView)) return hash as AppView;
  return 'import';
}

function App() {
  const [view, setView] = useState<AppView>(getInitialView);
  const [dataBrowserTab, setDataBrowserTab] = useState<DataTab>('provider');
  const [salaryReviewFullScreen, setSalaryReviewFullScreen] = useState(false);

  useEffect(() => {
    const hash = '#' + view;
    if (window.location.hash !== hash) window.location.hash = hash;
  }, [view]);

  useEffect(() => {
    if (view !== 'salary-review') setSalaryReviewFullScreen(false);
  }, [view]);

  useEffect(() => {
    const onHashChange = () => {
      const h = window.location.hash.slice(1);
      if (h && VIEWS.includes(h as AppView)) setView(h as AppView);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleNavigateToBrowser = (tab?: DataTab) => {
    if (tab) setDataBrowserTab(tab);
    setView('data-browser');
  };

  const sidebarHidden = view === 'salary-review' && salaryReviewFullScreen;
  const contentNoPadding = sidebarHidden;

  return (
    <Layout currentView={view} onNavigate={setView} sidebarHidden={sidebarHidden} contentNoPadding={contentNoPadding}>
      {view === 'import' && <DataPage focus="import" onNavigateToBrowser={handleNavigateToBrowser} />}
      {view === 'data-browser' && <DataPage focus="browse" initialTab={dataBrowserTab} />}
      {view === 'specialty-map' && <DataPage focus="browse" standaloneTab="specialty-map" />}
      {view === 'salary-review' && (
        <SalaryReviewPage
          onNavigateToImport={() => setView('import')}
          fullScreen={salaryReviewFullScreen}
          onFullScreenChange={setSalaryReviewFullScreen}
        />
      )}
      {view === 'parameters' && <ParametersPage onNavigateToHelp={() => setView('help')} />}
      {view === 'help' && <PolicyHelpPage onNavigateToParameters={() => setView('parameters')} />}
      {view === 'compare' && <CompareScenariosPage />}
    </Layout>
  );
}

export default App;
