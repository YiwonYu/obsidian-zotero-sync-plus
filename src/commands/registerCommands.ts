import { Notice } from 'obsidian';
import type ZoteroSyncPlusPlugin from '../main';
import { ZoteroSearchModal } from '../ui/ZoteroSearchModal';

export function registerCommands(plugin: ZoteroSyncPlusPlugin): void {
  plugin.addCommand({
    id: 'sync-library',
    name: 'Zotero Sync Plus: Sync Library',
    callback: () => void plugin.engine.syncLibrary(),
  });
  plugin.addCommand({
    id: 'sync-current-note',
    name: 'Zotero Sync Plus: Sync Current Note',
    callback: () => void plugin.engine.syncCurrentNote(),
  });
  plugin.addCommand({
    id: 'rebuild-index',
    name: 'Zotero Sync Plus: Rebuild Index',
    callback: () => void plugin.engine.rebuildIndex(),
  });
  plugin.addCommand({
    id: 'search-zotero-items',
    name: 'Zotero Sync Plus: Search Zotero Items',
    editorCallback: (editor) => new ZoteroSearchModal(plugin.app, plugin, 'actions', editor).open(),
  });
  plugin.addCommand({
    id: 'insert-citation',
    name: 'Zotero Sync Plus: Insert Citation',
    editorCallback: (editor) => new ZoteroSearchModal(plugin.app, plugin, 'citation', editor).open(),
  });
  plugin.addCommand({
    id: 'insert-bibliography',
    name: 'Zotero Sync Plus: Insert Bibliography',
    editorCallback: (editor) => new ZoteroSearchModal(plugin.app, plugin, 'bibliography', editor).open(),
  });
  plugin.addCommand({
    id: 'import-notes-current-note',
    name: 'Zotero Sync Plus: Import Notes for Current Note',
    callback: () => void plugin.engine.importNotesForCurrentNote().catch((error: unknown) => new Notice(error instanceof Error ? error.message : String(error))),
  });
  plugin.addCommand({
    id: 'import-annotations-current-note',
    name: 'Zotero Sync Plus: Import Annotations for Current Note',
    callback: () => void plugin.engine.importAnnotationsForCurrentNote().catch((error: unknown) => new Notice(error instanceof Error ? error.message : String(error))),
  });
  plugin.addCommand({
    id: 'test-zotero-connection',
    name: 'Zotero Sync Plus: Test Zotero Connection',
    callback: () => void plugin.engine.testConnection().then((message) => new Notice(message)).catch((error: unknown) => new Notice(`Zotero Sync Plus: ${error instanceof Error ? error.message : String(error)}`)),
  });
}
