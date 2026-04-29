import type { ZoteroSyncPlusSettings } from './types';

export const DEFAULT_SETTINGS: ZoteroSyncPlusSettings = {
  dataSourceMode: 'zoteroApi',
  libraryType: 'user',
  libraryId: '',
  apiKey: '',
  localApiEndpoint: 'http://127.0.0.1:23119/api',
  betterBibTeXEndpoint: 'http://localhost:23119/better-bibtex/json-rpc',
  localExportJsonPath: '',

  rootOutputFolder: 'Papers',
  internalMetadataFolder: '_zotero',
  createCollectionFolders: true,
  createMissingMarkdownNotes: true,
  updateExistingMarkdownFrontmatter: true,
  moveExistingNotes: false,
  preserveNoteBody: true,

  citationKeyFieldName: 'citekey',
  zoteroItemKeyFieldName: 'zoteroKey',
  doiFieldName: 'doi',
  collectionFieldName: 'collections',
  tagPrefix: 'Zotero/',
  preserveNonZoteroTags: true,

  citationFormat: 'pandoc',
  defaultPandocFormat: '[@citekey]',
  defaultLatexFormat: '\\cite{citekey}',

  syncIntervalSeconds: 30,
  autoSyncEnabled: false,
  debounceSync: true,
  syncOnStartup: false,
};

export function normalizeSettings(data: Partial<ZoteroSyncPlusSettings> | null | undefined): ZoteroSyncPlusSettings {
  return { ...DEFAULT_SETTINGS, ...(data ?? {}) };
}
