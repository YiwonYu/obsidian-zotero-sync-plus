import type { App, TFile } from 'obsidian';

export type DataSourceMode = 'zoteroApi' | 'localApi' | 'hybrid' | 'localExport';
export type ZoteroLibraryType = 'user' | 'group';
export type CitationFormat = 'pandoc' | 'latex' | 'plain';

export interface ZoteroItem {
  zoteroKey: string;
  citekey?: string;
  title: string;
  itemType?: string;
  year?: string;
  authors: string[];
  doi?: string;
  url?: string;
  abstractNote?: string;
  publicationTitle?: string;
  collections: string[];
  tags?: string[];
  notes?: ZoteroNote[];
  annotations?: ZoteroAnnotation[];
  raw?: unknown;
}

export interface ZoteroNote {
  id: string;
  html?: string;
  markdown?: string;
  text?: string;
  dateModified?: string;
}

export interface ZoteroAnnotation {
  id: string;
  page?: number;
  color?: string;
  text?: string;
  comment?: string;
  dateModified?: string;
  zoteroUri?: string;
}

export interface DataSourceCapabilities {
  citationMetadata: boolean;
  zoteroItemKeys: boolean;
  citekeys: boolean;
  tags: boolean;
  collections: boolean;
  notes: boolean;
  annotations: boolean;
  bibliographyFormatting: boolean;
}

export interface SyncReport {
  startedAt: string;
  finishedAt?: string;
  itemsLoaded: number;
  notesCreated: number;
  notesUpdated: number;
  notesSkipped: number;
  conflicts: string[];
  warnings: string[];
  errors: string[];
  missingCapabilities: string[];
}

export interface ZoteroSyncPlusSettings {
  dataSourceMode: DataSourceMode;
  libraryType: ZoteroLibraryType;
  libraryId: string;
  apiKey: string;
  localApiEndpoint: string;
  betterBibTeXEndpoint: string;
  localExportJsonPath: string;

  rootOutputFolder: string;
  internalMetadataFolder: string;
  createCollectionFolders: boolean;
  createMissingMarkdownNotes: boolean;
  updateExistingMarkdownFrontmatter: boolean;
  moveExistingNotes: boolean;
  preserveNoteBody: boolean;

  citationKeyFieldName: string;
  zoteroItemKeyFieldName: string;
  doiFieldName: string;
  collectionFieldName: string;
  tagPrefix: string;
  preserveNonZoteroTags: boolean;

  citationFormat: CitationFormat;
  defaultPandocFormat: string;
  defaultLatexFormat: string;

  syncIntervalSeconds: number;
  autoSyncEnabled: boolean;
  debounceSync: boolean;
  syncOnStartup: boolean;
}

export interface IndexedItem {
  citekey?: string;
  path: string;
  lastSynced: string;
  title: string;
  doi?: string;
}

export interface ZoteroIndex {
  items: Record<string, IndexedItem>;
}

export interface MatchResult {
  file?: TFile;
  path?: string;
  conflict?: string;
}

export interface ZoteroSyncPlusContext {
  app: App;
  settings: ZoteroSyncPlusSettings;
  saveSettings: () => Promise<void>;
}
