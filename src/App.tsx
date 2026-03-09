import { useState } from 'react';
import { Layout, type AppView } from './components/layout';
import { DataPage } from './features/data/data-page';
import { SalaryReviewPage } from './features/review/salary-review-page';
import { ParametersPage } from './features/parameters/parameters-page';

function App() {
  const [view, setView] = useState<AppView>('import');

  return (
    <Layout currentView={view} onNavigate={setView}>
      {view === 'import' && <DataPage />}
      {view === 'data-browser' && <DataPage />}
      {view === 'salary-review' && (
        <SalaryReviewPage onNavigateToImport={() => setView('import')} />
      )}
      {view === 'parameters' && <ParametersPage />}
      {view === 'compare' && (
        <div className="bg-white rounded-2xl border border-indigo-100 p-10 text-center text-slate-600">
          <p>Compare scenarios — coming soon.</p>
        </div>
      )}
    </Layout>
  );
}

export default App;
