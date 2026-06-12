import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface ImportWizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ariaLabel: string;
  maxWidth?: 'xl' | '2xl';
  children: ReactNode;
}

export function ImportWizardModal({
  open,
  onOpenChange,
  ariaLabel,
  maxWidth = 'xl',
  children,
}: ImportWizardModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          'flex max-h-[min(90vh,640px)] flex-col gap-0 overflow-hidden border-0 p-0 shadow-xl ring-1 ring-border/80 sm:max-w-xl',
          maxWidth === '2xl' && 'sm:max-w-2xl',
        )}
      >
        <DialogTitle className="sr-only">{ariaLabel}</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
}
