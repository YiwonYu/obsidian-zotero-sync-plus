import type { App, TFile } from 'obsidian';
import type { DataSourceCapabilities, ZoteroItem, ZoteroSyncPlusSettings } from '../types';
import { frontmatterToMarkdown } from '../utils/yaml';
import { mergeFrontmatterTags } from '../utils/tags';

export class FrontmatterUpdater {
  constructor(private readonly app: App, private readonly settings: ZoteroSyncPlusSettings) {}

  async update(file: TFile, item: ZoteroItem, capabilities: DataSourceCapabilities): Promise<void> {
    await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
      applyManagedFields(frontmatter, item, this.settings, capabilities);
    });
  }

  initialMarkdown(item: ZoteroItem, capabilities: DataSourceCapabilities): string {
    const fm: Record<string, unknown> = {};
    applyManagedFields(fm, item, this.settings, capabilities);
    return `${frontmatterToMarkdown(fm)}\n\n# ${item.title}\n\n## Summary\n\n## Method\n\n## Key Results\n\n## Notes\n\n## Imported Zotero Notes\n\n<!-- ZOTERO_SYNC_NOTES_START -->\n<!-- ZOTERO_SYNC_NOTES_END -->\n\n## Imported PDF Annotations\n\n<!-- ZOTERO_SYNC_ANNOTATIONS_START -->\n<!-- ZOTERO_SYNC_ANNOTATIONS_END -->\n`;
  }
}

export function applyManagedFields(frontmatter: Record<string, unknown>, item: ZoteroItem, settings: ZoteroSyncPlusSettings, capabilities: DataSourceCapabilities): void {
  frontmatter.title = item.title;
  if (item.citekey) frontmatter[settings.citationKeyFieldName] = item.citekey;
  frontmatter[settings.zoteroItemKeyFieldName] = item.zoteroKey;
  if (item.year) frontmatter.year = item.year;
  frontmatter.authors = item.authors;
  if (item.doi) frontmatter[settings.doiFieldName] = item.doi;
  if (item.url) frontmatter.url = item.url;
  if (item.itemType) frontmatter.itemType = item.itemType;
  if (item.publicationTitle) frontmatter.publicationTitle = item.publicationTitle;
  if (capabilities.collections) frontmatter[settings.collectionFieldName] = item.collections;
  const mergedTags = mergeFrontmatterTags({
    existing: frontmatter.tags,
    zoteroTags: item.tags,
    zoteroTagsAvailable: capabilities.tags && item.tags !== undefined,
    prefix: settings.tagPrefix,
    preserveNonZoteroTags: settings.preserveNonZoteroTags,
  });
  if (mergedTags !== undefined) frontmatter.tags = mergedTags;
}
