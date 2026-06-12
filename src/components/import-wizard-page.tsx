/**
 * Full-page shell for import wizards — matches import hub premium layout.
 */

import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImportWizardPageProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  children: ReactNode;
}

export function ImportWizardPage({ title, subtitle, onBack, children }: ImportWizardPageProps) {
  return (
    <div className="import-hub import-hub-wizard">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-4 flex items-start gap-2 sm:mb-5 sm:gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="-ml-2 shrink-0 gap-1.5 text-slate-600 hover:text-[var(--meritly-green-dark)]"
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <div className="min-w-0 pt-0.5">
            <h1 className="font-meritly text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              {title}
            </h1>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
        </div>
        <div className="import-wizard-panel">{children}</div>
      </div>
    </div>
  );
}
