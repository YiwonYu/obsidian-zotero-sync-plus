export function normalizeZoteroTag(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/\//g, '-')
    .replace(/[^\p{L}\p{N}_-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function zoteroTagsToObsidian(tags: string[] | undefined, prefix: string): string[] {
  return Array.from(new Set((tags ?? [])
    .map(normalizeZoteroTag)
    .filter(Boolean)
    .map((tag) => `${prefix}${tag}`)));
}

export function mergeFrontmatterTags(options: {
  existing: unknown;
  zoteroTags: string[] | undefined;
  zoteroTagsAvailable: boolean;
  prefix: string;
  preserveNonZoteroTags: boolean;
}): string[] | undefined {
  const existing = coerceTags(options.existing);
  if (!options.zoteroTagsAvailable) return existing.length > 0 ? existing : undefined;

  const userTags = options.preserveNonZoteroTags
    ? existing.filter((tag) => !tag.startsWith(options.prefix))
    : [];
  const syncedTags = zoteroTagsToObsidian(options.zoteroTags, options.prefix);
  return Array.from(new Set([...userTags, ...syncedTags]));
}

export function coerceTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string') return value.split(/[\s,]+/).map((tag) => tag.trim()).filter(Boolean);
  return [];
}
