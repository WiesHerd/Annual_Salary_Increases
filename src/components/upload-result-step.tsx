/**
 * Step-4 success banner (footer actions live in ImportWizardShell).
 */

interface UploadResultStepProps {
  count: number;
  note?: string;
}

export function UploadResultStep({
  count,
  note = 'You can view and edit your data in the Data browser.',
}: UploadResultStepProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      </span>
      <div>
        <p className="text-sm font-semibold text-emerald-800">
          Imported {count} row{count !== 1 ? 's' : ''}.
        </p>
        {note && <p className="mt-0.5 text-sm text-emerald-700">{note}</p>}
      </div>
    </div>
  );
}
