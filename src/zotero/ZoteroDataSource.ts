import type { DataSourceCapabilities, ZoteroItem } from '../types';

export interface ZoteroDataSource {
  getCapabilities(): Promise<DataSourceCapabilities> | DataSourceCapabilities;
  loadItems(): Promise<ZoteroItem[]>;
  testConnection(): Promise<string>;
  getCitekey?(item: ZoteroItem): Promise<string | undefined>;
  getBibliography?(item: ZoteroItem): Promise<string | undefined>;
}

export const EMPTY_CAPABILITIES: DataSourceCapabilities = {
  citationMetadata: false,
  zoteroItemKeys: false,
  citekeys: false,
  tags: false,
  collections: false,
  notes: false,
  annotations: false,
  bibliographyFormatting: false,
};
