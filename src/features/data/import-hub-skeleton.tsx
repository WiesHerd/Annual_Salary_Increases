/**
 * Placeholder for the import hub while app state hydrates from storage.
 * Uses the same .import-hub background so the screen never flashes plain layout behind it.
 */

function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />;
}

export function ImportHubSkeleton() {
  return (
    <div className="import-hub" aria-busy="true" aria-label="Loading import data">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="import-hub-header space-y-2">
          <Pulse className="h-8 w-44" />
          <Pulse className="h-4 w-56" />
        </header>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="flex min-h-[9.5rem] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
            >
              <div className="flex flex-1 gap-3.5 p-5">
                <Pulse className="h-11 w-11 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2.5 pt-0.5">
                  <Pulse className="h-5 w-32" />
                  <Pulse className="h-4 w-full max-w-[16rem]" />
                  <Pulse className="h-4 w-4/5 max-w-[14rem]" />
                </div>
              </div>
              <div className="flex h-10 items-center gap-3 border-t border-slate-100 bg-slate-50/80 px-4">
                <Pulse className="h-3 w-20" />
                <Pulse className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
