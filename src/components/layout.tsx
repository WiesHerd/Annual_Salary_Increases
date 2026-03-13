import { type ReactNode, useState } from 'react';
import { useParametersState } from '../hooks/use-parameters-state';
import { useSelectedCycle } from '../hooks/use-selected-cycle';

export type AppView = 'import' | 'data-browser' | 'specialty-map' | 'salary-review' | 'compare' | 'parameters' | 'help';

interface LayoutProps {
  children: ReactNode;
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  sidebarHidden?: boolean;
  contentNoPadding?: boolean;
}

const navSections: {
  label: string;
  items: {
    label: string;
    id?: AppView;
    icon: string;
    expandable?: boolean;
  }[];
}[] = [
  {
    label: 'GET STARTED',
    items: [
      { label: 'Import data', id: 'import', icon: 'upload' },
      { label: 'Data browser', id: 'data-browser', icon: 'grid' },
      { label: 'Specialty map', id: 'specialty-map', icon: 'map' },
    ],
  },
  {
    label: 'REVIEW',
    items: [{ label: 'Salary review', id: 'salary-review', icon: 'person' }],
  },
  {
    label: 'CONFIGURATION',
    items: [
      { label: 'Controls', id: 'parameters', icon: 'settings' },
      { label: 'Policy help', id: 'help', icon: 'help' },
    ],
  },
  {
    label: 'OUTPUT',
    items: [{ label: 'Compare scenarios', id: 'compare', icon: 'compare', expandable: true }],
  },
];

function NavIcon({ name }: { name: string }) {
  const cls = 'w-5 h-5 shrink-0 text-slate-500';
  switch (name) {
    case 'upload':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      );
    case 'grid':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      );
    case 'person':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    case 'compare':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      );
    case 'settings':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'map':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      );
    case 'help':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return null;
  }
}

export function Layout({ children, currentView, onNavigate, sidebarHidden = false, contentNoPadding = false }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { cycles } = useParametersState();
  const [selectedCycleId, setSelectedCycleId] = useSelectedCycle(cycles);

  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      {!sidebarHidden && (
        <aside
          className={`sticky top-0 self-start h-screen flex flex-col bg-white border-r border-slate-200 shadow-sm transition-[width] duration-200 ${
            collapsed ? 'w-[72px]' : 'w-64'
          }`}
        >
        {/* Header: logo + title */}
        <div className="p-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">ASI</span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <h1 className="text-sm font-semibold text-slate-900 truncate">Annual Salary Increases</h1>
                <p className="text-xs text-slate-500 truncate">Compensation planning</p>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 min-h-0">
          {navSections.map((section) => (
            <div key={section.label} className={collapsed ? 'mb-2' : 'mb-4'}>
              {!collapsed && (
                <div className="px-4 py-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  {section.label}
                </div>
              )}
              {section.items.map((item) => {
                const isActive = item.id != null && currentView === item.id;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => item.id != null && onNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                      isActive
                        ? 'bg-slate-100 text-slate-900 font-medium'
                        : 'text-slate-700 hover:bg-slate-50'
                    } ${collapsed ? 'justify-center' : ''}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <NavIcon name={item.icon} />
                    {!collapsed && (
                      <>
                        <span className="truncate flex-1">{item.label}</span>
                        {item.expandable && (
                          <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer: budget cycle, collapse toggle + tagline */}
        <div className="shrink-0 border-t border-slate-100 flex flex-col">
          {!collapsed && (
            <div className="border-b border-slate-100 px-4 py-3">
              {cycles.length > 0 && (
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Budget cycle
                  </span>
                  <select
                    value={selectedCycleId || (cycles[0]?.id ?? '')}
                    onChange={(e) => setSelectedCycleId(e.target.value)}
                    className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-w-0"
                    aria-label="Select budget cycle"
                  >
                    {cycles.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className={`flex items-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors ${collapsed ? 'justify-center py-3' : 'gap-3 px-4 py-2.5'}`}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            )}
          </button>
          {!collapsed && (
            <div className="px-4 pb-3">
              <p className="text-xs text-slate-400 text-center">Annual salary increase modeler</p>
            </div>
          )}
        </div>
      </aside>
      )}

      <main className={`flex-1 min-h-0 flex flex-col overflow-auto ${contentNoPadding ? 'p-0' : 'p-6'}`}>{children}</main>
    </div>
  );
}
