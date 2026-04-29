import type { App, TFile } from 'obsidian';
import type { MatchResult, ZoteroItem, ZoteroSyncPlusSettings } from '../types';
import { normalizeTitleForMatch } from '../utils/sanitize';
import { buildFileLookup } from './IndexStore';

export class NoteMatcher {
  constructor(private readonly app: App, private readonly settings: ZoteroSyncPlusSettings) {}

  match(item: ZoteroItem): MatchResult {
    const lookup = buildFileLookup(this.app, this.settings);
    const candidates = [
      `zotero:${item.zoteroKey}`,
      item.citekey ? `citekey:${item.citekey}` : undefined,
      item.doi ? `doi:${item.doi.toLowerCase()}` : undefined,
      `title:${normalizeTitleForMatch(item.title)}`,
    ].filter((key): key is string => Boolean(key));

    for (const key of candidates) {
      const files = lookup.get(key) ?? [];
      if (files.length > 1) return { conflict: `Multiple markdown notes match ${key}: ${files.map((file) => file.path).join(', ')}` };
      if (files.length === 1) return { file: files[0], path: files[0].path };
    }
    return {};
  }
}
