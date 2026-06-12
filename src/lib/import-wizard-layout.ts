export type ImportWizardLayout = 'modal' | 'page';

export function mappingGridClass(layout: ImportWizardLayout = 'page'): string {
  return layout === 'page'
    ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3'
    : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-64 overflow-y-auto pr-1';
}
