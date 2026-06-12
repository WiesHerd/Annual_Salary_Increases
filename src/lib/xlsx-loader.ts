/**
 * Lazy-load the xlsx parser so it is not in the initial app bundle.
 */

let xlsxModule: typeof import('xlsx') | null = null;

export async function loadXlsx(): Promise<typeof import('xlsx')> {
  if (!xlsxModule) {
    xlsxModule = await import('xlsx');
  }
  return xlsxModule;
}
