import type { DataSourceCapabilities, ZoteroItem, ZoteroSyncPlusSettings } from '../types';
import { BetterBibTeXClient } from './BetterBibTeXClient';
import { ZoteroApiClient } from './ZoteroApiClient';
import { normalizeZoteroApiItem } from './ZoteroNormalizer';
import type { ZoteroDataSource } from './ZoteroDataSource';

export class ZoteroApiDataSource implements ZoteroDataSource {
  protected readonly client: ZoteroApiClient;
  protected readonly bbt: BetterBibTeXClient;

  constructor(protected readonly settings: ZoteroSyncPlusSettings, endpoint?: string) {
    this.client = new ZoteroApiClient({
      libraryType: settings.libraryType,
      libraryId: settings.libraryId,
      apiKey: settings.apiKey,
      endpoint,
    });
    this.bbt = new BetterBibTeXClient(settings.betterBibTeXEndpoint);
  }

  getCapabilities(): DataSourceCapabilities {
    return {
      citationMetadata: true,
      zoteroItemKeys: true,
      citekeys: true,
      tags: true,
      collections: true,
      notes: true,
      annotations: true,
      bibliographyFormatting: true,
    };
  }

  async loadItems(): Promise<ZoteroItem[]> {
    if (!this.settings.libraryId) throw new Error('Zotero library ID is required for Zotero API mode.');
    const collections = await this.client.getCollections();
    const collectionPaths = buildCollectionPaths(collections);
    const rawItems = await this.client.getTopLevelItems();
    const childrenByKey = new Map<string, unknown[]>();
    for (const raw of rawItems) {
      const key = getRawKey(raw);
      if (key) {
        try {
          const children = await this.client.getItemChildren(key);
          const attachmentAnnotationChildren: unknown[] = [];
          for (const child of children) {
            if (getRawItemType(child) === 'attachment') {
              const childKey = getRawKey(child);
              if (childKey) {
                try {
                  attachmentAnnotationChildren.push(...await this.client.getItemChildren(childKey));
                } catch {
                  // Some Zotero sources do not expose attachment children; keep syncing available data.
                }
              }
            }
          }
          childrenByKey.set(key, [...children, ...attachmentAnnotationChildren]);
        } catch {
          childrenByKey.set(key, []);
        }
      }
    }
    const items = rawItems
      .map((raw) => normalizeZoteroApiItem(raw, collectionPaths, childrenByKey.get(getRawKey(raw) ?? '') ?? []))
      .filter((item): item is ZoteroItem => Boolean(item));

    await this.applyBetterBibTeXCitekeys(items);
    return items;
  }

  async testConnection(): Promise<string> {
    return this.client.test();
  }

  async getCitekey(item: ZoteroItem): Promise<string | undefined> {
    if (item.citekey) return item.citekey;
    try {
      if (!(await this.bbt.isAvailable())) return undefined;
      const keys = await this.bbt.citationKeys([this.bbtItemKey(item)]);
      return keys[this.bbtItemKey(item)] ?? keys[item.zoteroKey];
    } catch {
      return undefined;
    }
  }

  async getBibliography(item: ZoteroItem): Promise<string | undefined> {
    const citekey = item.citekey ?? await this.getCitekey(item);
    try {
      if (citekey && await this.bbt.isAvailable()) return await this.bbt.bibliography([citekey]);
    } catch {
      // Better BibTeX is optional; fall through to Zotero API bibliography.
    }
    try {
      return await this.client.getBibliography(item.zoteroKey);
    } catch {
      return undefined;
    }
  }

  protected async applyBetterBibTeXCitekeys(items: ZoteroItem[]): Promise<void> {
    try {
      if (!(await this.bbt.isAvailable())) return;
      const lookupKeys = items.map((item) => this.bbtItemKey(item));
      const citekeys = await this.bbt.citationKeys(lookupKeys);
      for (const item of items) item.citekey = item.citekey ?? citekeys[this.bbtItemKey(item)] ?? citekeys[item.zoteroKey];
    } catch {
      // Better BibTeX enrichment is optional; Zotero API metadata sync must continue without it.
    }
  }

  protected bbtItemKey(item: ZoteroItem): string {
    return this.settings.libraryId ? `${this.settings.libraryId}:${item.zoteroKey}` : item.zoteroKey;
  }
}

export class LocalZoteroDataSource extends ZoteroApiDataSource {
  constructor(settings: ZoteroSyncPlusSettings) {
    super(settings, settings.localApiEndpoint);
  }

  override async testConnection(): Promise<string> {
    await this.loadItems();
    return 'Local Zotero API connection succeeded.';
  }
}

export class HybridDataSource extends ZoteroApiDataSource {
  constructor(settings: ZoteroSyncPlusSettings) {
    super(settings);
  }
}

function buildCollectionPaths(collections: unknown[]): Map<string, string> {
  const rawByKey = new Map<string, Record<string, unknown>>();
  for (const collection of collections) {
    if (!collection || typeof collection !== 'object') continue;
    const record = collection as Record<string, unknown>;
    const data = (record.data && typeof record.data === 'object' ? record.data : record) as Record<string, unknown>;
    const key = String(record.key ?? data.key ?? '').trim();
    if (key) rawByKey.set(key, data);
  }
  const memo = new Map<string, string>();
  const resolve = (key: string): string => {
    if (memo.has(key)) return memo.get(key)!;
    const data = rawByKey.get(key);
    if (!data) return key;
    const name = String(data.name ?? key).trim();
    const parent = typeof data.parentCollection === 'string' && data.parentCollection ? resolve(data.parentCollection) : '';
    const path = parent ? `${parent}/${name}` : name;
    memo.set(key, path);
    return path;
  };
  for (const key of rawByKey.keys()) resolve(key);
  return memo;
}

function getRawKey(raw: unknown): string | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const record = raw as Record<string, unknown>;
  const data = (record.data && typeof record.data === 'object' ? record.data : record) as Record<string, unknown>;
  const key = record.key ?? data.key;
  return typeof key === 'string' ? key : undefined;
}

function getRawItemType(raw: unknown): string | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const record = raw as Record<string, unknown>;
  const data = (record.data && typeof record.data === 'object' ? record.data : record) as Record<string, unknown>;
  const itemType = data.itemType;
  return typeof itemType === 'string' ? itemType : undefined;
}
