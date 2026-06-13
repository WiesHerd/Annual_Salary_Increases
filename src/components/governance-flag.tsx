export type GovernanceFlagKind = 'manual-review' | 'fmv' | 'blocked';

const STYLES: Record<GovernanceFlagKind, string> = {
  'manual-review': 'bg-amber-50 text-amber-900 ring-amber-200/90',
  fmv: 'bg-red-50 text-red-800 ring-red-200/90',
  blocked: 'bg-slate-100 text-slate-800 ring-slate-200/90',
};

const LABELS: Record<GovernanceFlagKind, string> = {
  'manual-review': 'Manual review',
  fmv: 'FMV check',
  blocked: 'Blocked',
};

export function GovernanceFlag({ kind }: { kind: GovernanceFlagKind }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${STYLES[kind]}`}
    >
      {LABELS[kind]}
    </span>
  );
}
