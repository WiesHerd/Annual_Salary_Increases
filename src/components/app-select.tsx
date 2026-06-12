/**
 * Radix Select wrapper — animated dropdown, checkmarks, keyboard nav.
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { FormField } from './form-field';

export interface AppSelectOption {
  value: string;
  label: string;
}

interface AppSelectProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: AppSelectOption[];
  label?: string;
  hint?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Compact width for short values (e.g. cycle). `header` fits inline in modal title row. */
  size?: 'default' | 'compact' | 'header';
}

const WIDTH_CLASS: Record<NonNullable<AppSelectProps['size']>, string> = {
  default: 'w-full',
  compact: 'w-[10.5rem]',
  header: 'w-[8.25rem]',
};

export function AppSelect({
  id,
  value,
  onChange,
  options,
  label,
  hint,
  placeholder,
  disabled = false,
  size = 'default',
}: AppSelectProps) {
  const widthClass = WIDTH_CLASS[size];
  const fieldClass = size !== 'default' ? 'w-fit' : '';

  const resolvedValue = options.find((opt) => opt.value === value)?.value ?? options[0]?.value;

  if (!resolvedValue) {
    return (
      <span className="text-sm text-muted-foreground" id={id}>
        No options
      </span>
    );
  }

  const control = (
    <Select value={resolvedValue} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        id={id}
        size={size === 'header' ? 'sm' : 'default'}
        className={cn(
          widthClass,
          'bg-background font-medium shadow-sm',
          size === 'header' && 'h-9 rounded-xl border-input',
          size === 'compact' && 'rounded-xl',
        )}
      >
        <SelectValue placeholder={placeholder ?? 'Select…'} />
      </SelectTrigger>
      <SelectContent position="popper" className="min-w-[var(--radix-select-trigger-width)]">
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (!label) return control;

  return (
    <FormField label={label} htmlFor={id} hint={hint} className={fieldClass}>
      {control}
    </FormField>
  );
}
