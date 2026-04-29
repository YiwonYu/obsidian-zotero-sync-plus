import type { ZoteroAnnotation, ZoteroItem, ZoteroNote } from '../types';

export type CollectionPathMap = Map<string, string>;

export function getField<T = unknown>(obj: unknown, possibleNames: string[]): T | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  const record = obj as Record<string, unknown>;
  for (const name of possibleNames) {
    if (record[name] !== undefined && record[name] !== null) return record[name] as T;
  }
  return undefined;
}

export function normalizeCreators(creators: unknown): string[] {
  if (!Array.isArray(creators)) return [];
  return creators.map((creator) => {
    if (typeof creator === 'string') return creator;
    if (!creator || typeof creator !== 'object') return '';
    const c = creator as Record<string, unknown>;
    const name = c.name ?? [c.firstName, c.lastName].filter(Boolean).join(' ');
    return String(name ?? '').trim();
  }).filter(Boolean);
}

export function normalizeTags(tags: unknown): string[] | undefined {
  if (!Array.isArray(tags)) return undefined;
  return tags.map((tag) => {
    if (typeof tag === 'string') return tag;
    if (tag && typeof tag === 'object') return String((tag as Record<string, unknown>).tag ?? '').trim();
    return '';
  }).filter(Boolean);
}

export function normalizeCollections(collections: unknown, collectionPaths?: CollectionPathMap): string[] {
  const values = Array.isArray(collections) ? collections : typeof collections === 'string' && collections.trim() ? [collections] : [];
  return values.map((collection) => {
    const keyOrPath = typeof collection === 'string' ? collection : String(getField(collection, ['path', 'name', 'key']) ?? '');
    return collectionPaths?.get(keyOrPath) ?? keyOrPath;
  }).filter(Boolean);
}

export function normalizeYear(date: unknown): string | undefined {
  if (date === undefined || date === null) return undefined;
  const text = String(date);
  const match = text.match(/\b(15|16|17|18|19|20|21)\d{2}\b/u);
  return match?.[0];
}

export function normalizeZoteroApiItem(raw: unknown, collectionPaths: CollectionPathMap = new Map(), children: unknown[] = []): ZoteroItem | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const record = raw as Record<string, unknown>;
  const data = (record.data && typeof record.data === 'object' ? record.data : record) as Record<string, unknown>;
  const key = String(record.key ?? data.key ?? data.itemKey ?? '').trim();
  const title = String(data.title ?? '').trim();
  if (!key || !title) return undefined;

  const childNotes: ZoteroNote[] = [];
  const annotations: ZoteroAnnotation[] = [];
  for (const child of children) {
    if (!child || typeof child !== 'object') continue;
    const childRecord = child as Record<string, unknown>;
    const childData = (childRecord.data && typeof childRecord.data === 'object' ? childRecord.data : childRecord) as Record<string, unknown>;
    const itemType = String(childData.itemType ?? '');
    const childKey = String(childRecord.key ?? childData.key ?? childData.itemKey ?? Math.random().toString(36));
    if (itemType === 'note') {
      childNotes.push({
        id: childKey,
        html: typeof childData.note === 'string' ? childData.note : undefined,
        text: typeof childData.note === 'string' ? stripHtml(childData.note) : undefined,
        dateModified: getString(childData, 'dateModified'),
      });
    }
    if (itemType === 'annotation') {
      annotations.push({
        id: childKey,
        page: typeof childData.annotationPageLabel === 'string' ? Number.parseInt(childData.annotationPageLabel, 10) || undefined : undefined,
        color: getString(childData, 'annotationColor'),
        text: getString(childData, 'annotationText'),
        comment: getString(childData, 'annotationComment'),
        dateModified: getString(childData, 'dateModified'),
        zoteroUri: getString(childData, 'uri'),
      });
    }
  }

  return {
    zoteroKey: key,
    citekey: getString(data, 'citationKey') ?? getExtraCitationKey(data.extra),
    title,
    itemType: getString(data, 'itemType'),
    year: normalizeYear(data.date),
    authors: normalizeCreators(data.creators),
    doi: getString(data, 'DOI') ?? getString(data, 'doi'),
    url: getString(data, 'url'),
    abstractNote: getString(data, 'abstractNote'),
    publicationTitle: getString(data, 'publicationTitle') ?? getString(data, 'bookTitle') ?? getString(data, 'proceedingsTitle'),
    collections: normalizeCollections(data.collections, collectionPaths),
    tags: normalizeTags(data.tags),
    notes: childNotes,
    annotations,
    raw,
  };
}

export function stripHtml(html: string): string {
  return html.replace(/<br\s*\/?>/giu, '\n').replace(/<\/p>/giu, '\n\n').replace(/<[^>]+>/gu, '').replace(/&nbsp;/gu, ' ').replace(/&amp;/gu, '&').trim();
}

function getString(obj: Record<string, unknown>, key: string): string | undefined {
  const value = obj[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function getExtraCitationKey(extra: unknown): string | undefined {
  if (typeof extra !== 'string') return undefined;
  return extra.match(/^Citation Key:\s*(.+)$/imu)?.[1]?.trim();
}
