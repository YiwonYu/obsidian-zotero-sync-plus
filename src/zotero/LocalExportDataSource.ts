import type { App } from 'obsidian';
import type { DataSourceCapabilities, ZoteroItem, ZoteroSyncPlusSettings } from '../types';
import { detectCapabilities } from './CapabilityDetector';
import { getField, normalizeCollections, normalizeCreators, normalizeTags, normalizeYear } from './ZoteroNormalizer';
import type { ZoteroDataSource } from './ZoteroDataSource';

export class LocalExportDataSource implements ZoteroDataSource {
  private capabilities: DataSourceCapabilities | undefined;
  private raw: unknown;

  constructor(private readonly app: App, private readonly settings: ZoteroSyncPlusSettings) {}

  async getCapabilities(): Promise<DataSourceCapabilities> {
    await this.ensureLoaded();
    return this.capabilities!;
  }

  async loadItems(): Promise<ZoteroItem[]> {
    await this.ensureLoaded();
    const items = extractItems(this.raw);
    return items.map((entry, index) => normalizeLocalExportItem(entry, index)).filter((item): item is ZoteroItem => Boolean(item));
  }

  async testConnection(): Promise<string> {
    await this.ensureLoaded();
    return `Loaded local export JSON with ${extractItems(this.raw).length} candidate items.`;
  }

  private async ensureLoaded(): Promise<void> {
    if (this.raw !== undefined) return;
    if (!this.settings.localExportJsonPath) throw new Error('Local export JSON path is required.');
    const text = await readPath(this.app, this.settings.localExportJsonPath);
    this.raw = JSON.parse(text) as unknown;
    this.capabilities = detectCapabilities(this.raw);
  }
}

function extractItems(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'object') return [];
  const record = raw as Record<string, unknown>;
  for (const key of ['items', 'references', 'library', 'data']) {
    if (Array.isArray(record[key])) return record[key];
  }
  return [];
}

function normalizeLocalExportItem(raw: unknown, index: number): ZoteroItem | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const record = raw as Record<string, unknown>;
  const data = (record.data && typeof record.data === 'object' ? record.data : record) as Record<string, unknown>;
  const title = String(getField(data, ['title', 'Title']) ?? '').trim();
  if (!title) return undefined;
  const key = String(getField(data, ['key', 'itemKey', 'zoteroKey', 'id', 'ID']) ?? `local-${index + 1}`).trim();
  const notes = Array.isArray(data.notes)
    ? data.notes.map((note, i) => ({ id: `${key}-note-${i + 1}`, markdown: typeof note === 'string' ? note : String(getField(note, ['markdown', 'text', 'note']) ?? '') }))
    : undefined;
  const annotations = Array.isArray(data.annotations)
    ? data.annotations.map((annotation, i) => ({
      id: `${key}-annotation-${i + 1}`,
      page: typeof getField(annotation, ['page']) === 'number' ? getField<number>(annotation, ['page']) : undefined,
      color: stringField(annotation, ['color']),
      text: stringField(annotation, ['text', 'annotationText']),
      comment: stringField(annotation, ['comment', 'annotationComment']),
      zoteroUri: stringField(annotation, ['zoteroUri', 'uri']),
    }))
    : undefined;
  return {
    zoteroKey: key,
    citekey: stringField(data, ['citationKey', 'citekey', 'key']),
    title,
    itemType: stringField(data, ['itemType', 'type']),
    year: normalizeYear(getField(data, ['date', 'year', 'issued'])),
    authors: normalizeCreators(getField(data, ['creators', 'authors', 'author'])),
    doi: stringField(data, ['DOI', 'doi']),
    url: stringField(data, ['url', 'URL']),
    abstractNote: stringField(data, ['abstractNote', 'abstract']),
    publicationTitle: stringField(data, ['publicationTitle', 'container-title', 'journal', 'bookTitle', 'proceedingsTitle']),
    collections: normalizeCollections(getField(data, ['collectionPaths', 'collections', 'collection'])),
    tags: normalizeTags(getField(data, ['tags', 'Tags'])),
    notes,
    annotations,
    raw,
  };
}

async function readPath(app: App, path: string): Promise<string> {
  if (!path.startsWith('/')) return app.vault.adapter.read(path);
  const fs = require('fs/promises') as typeof import('fs/promises');
  return fs.readFile(path, 'utf8');
}

function stringField(obj: unknown, names: string[]): string | undefined {
  const value = getField(obj, names);
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
