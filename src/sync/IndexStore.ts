import type { App, TFile } from 'obsidian';
import type { IndexedItem, ZoteroIndex, ZoteroItem, ZoteroSyncPlusSettings } from '../types';
import { joinPath, normalizeTitleForMatch } from '../utils/sanitize';

export class IndexStore {
  constructor(private readonly app: App, private readonly settings: ZoteroSyncPlusSettings) {}

  get indexPath(): string {
    return joinPath(this.settings.internalMetadataFolder, 'index.json');
  }

  async load(): Promise<ZoteroIndex> {
    try {
      const text = await this.app.vault.adapter.read(this.indexPath);
      return JSON.parse(text) as ZoteroIndex;
    } catch {
      return { items: {} };
    }
  }

  async save(index: ZoteroIndex): Promise<void> {
    await ensureFolder(this.app, this.settings.internalMetadataFolder);
    await this.app.vault.adapter.write(this.indexPath, `${JSON.stringify(index, null, 2)}\n`);
  }

  async updateItem(item: ZoteroItem, path: string): Promise<void> {
    const index = await this.load();
    index.items[item.zoteroKey] = {
      citekey: item.citekey,
      path,
      lastSynced: new Date().toISOString(),
      title: item.title,
      doi: item.doi,
    };
    await this.save(index);
  }

  async rebuild(): Promise<{ index: ZoteroIndex; conflicts: string[] }> {
    const index: ZoteroIndex = { items: {} };
    const conflicts: string[] = [];
    const seenByZotero = new Map<string, string>();
    const files = this.app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(`${this.settings.rootOutputFolder}/`) || file.path === this.settings.rootOutputFolder);
    for (const file of files) {
      const fm = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
      const zoteroKey = readString(fm[this.settings.zoteroItemKeyFieldName]);
      if (!zoteroKey) continue;
      if (seenByZotero.has(zoteroKey)) {
        conflicts.push(`Multiple notes match Zotero item ${zoteroKey}: ${seenByZotero.get(zoteroKey)} and ${file.path}`);
        continue;
      }
      seenByZotero.set(zoteroKey, file.path);
      index.items[zoteroKey] = {
        citekey: readString(fm[this.settings.citationKeyFieldName]),
        path: file.path,
        lastSynced: new Date().toISOString(),
        title: readString(fm.title) ?? file.basename,
        doi: readString(fm[this.settings.doiFieldName]),
      };
    }
    await this.save(index);
    return { index, conflicts };
  }
}

export function buildFileLookup(app: App, settings: ZoteroSyncPlusSettings): Map<string, TFile[]> {
  const lookup = new Map<string, TFile[]>();
  for (const file of app.vault.getMarkdownFiles()) {
    if (!file.path.startsWith(`${settings.rootOutputFolder}/`)) continue;
    const fm = app.metadataCache.getFileCache(file)?.frontmatter ?? {};
    add(lookup, `zotero:${readString(fm[settings.zoteroItemKeyFieldName])}`, file);
    add(lookup, `citekey:${readString(fm[settings.citationKeyFieldName])}`, file);
    add(lookup, `doi:${readString(fm[settings.doiFieldName])?.toLowerCase()}`, file);
    add(lookup, `title:${normalizeTitleForMatch(readString(fm.title) ?? file.basename)}`, file);
  }
  return lookup;
}

function add(lookup: Map<string, TFile[]>, key: string, file: TFile): void {
  if (key.endsWith(':') || key.endsWith(':undefined')) return;
  lookup.set(key, [...(lookup.get(key) ?? []), file]);
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export async function ensureFolder(app: App, folder: string): Promise<void> {
  const segments = folder.split('/').filter(Boolean);
  let current = '';
  for (const segment of segments) {
    current = current ? `${current}/${segment}` : segment;
    if (!(await app.vault.adapter.exists(current))) await app.vault.createFolder(current);
  }
}
