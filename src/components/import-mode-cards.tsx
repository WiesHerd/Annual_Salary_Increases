/**
 * Import mode — card tiles; the whole card is the control (no separate radio dots).
 */

import { ArrowDownToLine, Replace } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

export type UploadMode = 'replace' | 'add';

interface ImportModeCardsProps {
  value: UploadMode;
  onChange: (mode: UploadMode) => void;
  name: string;
  className?: string;
}

const OPTIONS: {
  value: UploadMode;
  label: string;
  detail: string;
  icon: typeof Replace;
}[] = [
  { value: 'replace', label: 'Replace all', detail: 'Overwrite existing', icon: Replace },
  { value: 'add', label: 'Add to existing', detail: 'Append to roster', icon: ArrowDownToLine },
];

export function ImportModeCards({ value, onChange, name, className = '' }: ImportModeCardsProps) {
  return (
    <fieldset className={className}>
      <legend className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Import mode
      </legend>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as UploadMode)}
        className="grid grid-cols-2 gap-2.5"
        aria-label="Import mode"
      >
        {OPTIONS.map((opt) => {
          const selected = value === opt.value;
          const inputId = `${name}-${opt.value}`;
          const Icon = opt.icon;
          return (
            <RadioGroupItem key={opt.value} value={opt.value} id={inputId} asChild>
              <button
                type="button"
                className={cn(
                  'flex h-full min-h-[4.5rem] w-full cursor-pointer flex-col justify-center gap-2 rounded-xl border px-3.5 py-3 text-left transition-all duration-200 outline-none',
                  'hover:border-border hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50',
                  selected
                    ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                    : 'border-border bg-background',
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                      selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    <Icon className="size-4" strokeWidth={2} />
                  </span>
                  <span className={cn('text-sm font-medium', selected ? 'text-foreground' : 'text-foreground/90')}>
                    {opt.label}
                  </span>
                </div>
                <span className="pl-[2.625rem] text-xs leading-snug text-muted-foreground">{opt.detail}</span>
              </button>
            </RadioGroupItem>
          );
        })}
      </RadioGroup>
    </fieldset>
  );
}
