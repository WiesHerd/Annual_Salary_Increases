/**
 * Custom data stream: user-defined upload with optional provider or standalone link.
 * Used for additional hospital data (e.g. risk, quality) without changing core provider/market/eval types.
 */

/** How this stream links to the app: by provider Employee_ID or standalone by a key column. */
export type CustomStreamLinkType = 'provider' | 'standalone';

/** One row of custom stream data (display column name → value). */
export type CustomStreamRow = Record<string, string | number | undefined>;

/** Column mapping: logical/display name → source file column name. */
export interface CustomStreamColumnMapping {
  /** For provider-linked: must map to Employee_ID. For standalone: user-chosen key column. */
  [logicalName: string]: string | undefined;
}

/** Stream definition (metadata). */
export interface CustomStreamDefinition {
  id: string;
  label: string;
  linkType: CustomStreamLinkType;
  /** For standalone: logical name of the key column used to identify rows. */
  keyColumn?: string;
}

/** Parsed result of a custom stream file upload. */
export interface CustomStreamUploadResult {
  rows: CustomStreamRow[];
  errors: string[];
  mapping: CustomStreamColumnMapping;
  /** Column names in output order (from mapping keys). */
  columnOrder: string[];
}
