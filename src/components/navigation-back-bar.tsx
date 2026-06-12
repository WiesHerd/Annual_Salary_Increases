import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavigationBackBarProps {
  returnLabel: string | null;
  onBack: () => void;
}

export function NavigationBackBar({ returnLabel, onBack }: NavigationBackBarProps) {
  if (!returnLabel) return null;

  return (
    <div className="mb-4 flex items-center">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="-ml-2 gap-1.5 text-slate-600 hover:text-indigo-700"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to {returnLabel}
      </Button>
    </div>
  );
}
