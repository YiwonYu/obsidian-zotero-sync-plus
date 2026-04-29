import type { App } from 'obsidian';
import type { ZoteroItem, ZoteroSyncPlusSettings } from '../types';
import { joinPath, sanitizeFileName, sanitizePathSegment } from '../utils/sanitize';
import { ensureFolder } from './IndexStore';

export class FolderMapper {
  constructor(private readonly app: App, private readonly settings: ZoteroSyncPlusSettings) {}

  folderFor(item: ZoteroItem, collectionsAvailable: boolean): { folder: string; warning?: string } {
    if (!this.settings.createCollectionFolders) return { folder: this.settings.rootOutputFolder };
    if (!collectionsAvailable) return { folder: this.settings.rootOutputFolder, warning: 'The selected data source does not contain Zotero collections. Collection folder sync was skipped.' };
    const primary = item.collections[0];
    if (!primary) return { folder: this.settings.rootOutputFolder };
    const collectionPath = primary.split('/').map((segment) => sanitizePathSegment(segment)).join('/');
    return { folder: joinPath(this.settings.rootOutputFolder, collectionPath) };
  }

  desiredPath(item: ZoteroItem, collectionsAvailable: boolean): string {
    const { folder } = this.folderFor(item, collectionsAvailable);
    const base = sanitizeFileName(item.citekey || item.title || item.zoteroKey, item.zoteroKey);
    return joinPath(folder, `${base}.md`);
  }

  async targetPath(item: ZoteroItem, collectionsAvailable: boolean): Promise<string> {
    const { folder } = this.folderFor(item, collectionsAvailable);
    await ensureFolder(this.app, folder);
    const base = sanitizeFileName(item.citekey || item.title || item.zoteroKey, item.zoteroKey);
    let candidate = joinPath(folder, `${base}.md`);
    let counter = 2;
    while (await this.app.vault.adapter.exists(candidate)) {
      candidate = joinPath(folder, `${base}-${counter}.md`);
      counter += 1;
    }
    return candidate;
  }
}
