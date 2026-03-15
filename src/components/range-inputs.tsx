/**
 * Compact inline min–max inputs for YOE, percentiles, etc.
 * Single row: "Label  [min] – [max]  [Clear]"
 */

export interface RangeInputsProps {
  valueMin: number | undefined;
  valueMax: number | undefined;
  onChange: (min: number | undefined, max: number | undefined) => void;
  label?: string;
  /** When 'top', label is above the inputs; when 'left', label is to the left (default). */
  labelPosition?: 'left' | 'top';
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export function RangeInputs({
  valueMin,
  valueMax,
  onChange,
  label,
  labelPosition = 'left',
  placeholder = '—',
  min = 0,
  max = 50,
  step = 1,
  className = '',
}: RangeInputsProps) {
  const hasFilter = valueMin != null || valueMax != null;

  const parse = (v: string) => {
    const n = Number(v);
    return v === '' || !Number.isFinite(n) ? undefined : Math.max(min, Math.min(max, n));
  };

  const inputsRow = (
    <>
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={valueMin ?? ''}
          onChange={(e) => onChange(parse(e.target.value), valueMax)}
          placeholder={placeholder}
          className="flex-1 min-w-0 px-1.5 py-1 text-sm border border-slate-300 rounded bg-white text-center tabular-nums"
          aria-label={`${label ?? 'Min'} min`}
        />
        <span className="text-slate-400 text-sm shrink-0">–</span>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={valueMax ?? ''}
          onChange={(e) => onChange(valueMin, parse(e.target.value))}
          placeholder={placeholder}
          className="flex-1 min-w-0 px-1.5 py-1 text-sm border border-slate-300 rounded bg-white text-center tabular-nums"
          aria-label={`${label ?? 'Max'} max`}
        />
      </div>
      {hasFilter && (
        <button
          type="button"
          onClick={() => onChange(undefined, undefined)}
          className="text-slate-400 hover:text-slate-600 text-xs"
          aria-label="Clear"
        >
          ×
        </button>
      )}
    </>
  );

  if (labelPosition === 'top' && label != null) {
    return (
      <div className={`flex flex-col gap-1.5 w-full min-w-0 text-center ${className}`}>
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <div className="flex items-center gap-2 min-w-0">
          {inputsRow}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 w-full min-w-0 ${className}`}>
      {label != null && (
        <span className="text-xs text-slate-500 shrink-0 w-16">{label}</span>
      )}
      {inputsRow}
    </div>
  );
}
