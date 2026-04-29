import type { DataSourceCapabilities } from '../types';
import { EMPTY_CAPABILITIES } from './ZoteroDataSource';

export function detectCapabilities(rawJson: unknown): DataSourceCapabilities {
  const items = Array.isArray(rawJson)
    ? rawJson
    : Array.isArray((rawJson as Record<string, unknown> | undefined)?.items)
      ? ((rawJson as Record<string, unknown>).items as unknown[])
      : [];

  const has = (predicate: (item: Record<string, unknown>, data: Record<string, unknown>) => boolean): boolean =>
    items.some((item) => {
      if (!item || typeof item !== 'object') return false;
      const record = item as Record<string, unknown>;
      const data = (record.data && typeof record.data === 'object' ? record.data : record) as Record<string, unknown>;
      return predicate(record, data);
    });

  return {
    ...EMPTY_CAPABILITIES,
    citationMetadata: has((_item, data) => Boolean(data.title)),
    zoteroItemKeys: has((item, data) => Boolean(item.key ?? data.key ?? data.itemKey)),
    citekeys: has((_item, data) => Boolean(data.citationKey) || (typeof data.extra === 'string' && /Citation Key:/iu.test(data.extra))),
    tags: has((_item, data) => Array.isArray(data.tags)),
    collections: has((_item, data) => Array.isArray(data.collections) || Array.isArray(data.collectionPaths) || typeof data.collection === 'string'),
    notes: has((_item, data) => Array.isArray(data.notes) || typeof data.note === 'string'),
    annotations: has((_item, data) => Array.isArray(data.annotations) || data.itemType === 'annotation'),
    bibliographyFormatting: false,
  };
}
