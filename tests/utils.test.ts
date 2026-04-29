import { describe, expect, it } from 'vitest';
import { detectCapabilities } from '../src/zotero/CapabilityDetector';
import { normalizeZoteroApiItem } from '../src/zotero/ZoteroNormalizer';
import { sanitizeFileName, sanitizePathSegment } from '../src/utils/sanitize';
import { mergeFrontmatterTags, normalizeZoteroTag } from '../src/utils/tags';
import { ensureSectionDelimiters, replaceBetweenMarkers } from '../src/utils/markdownSections';
import { simpleBibliography } from '../src/utils/bibliography';

describe('tag normalization', () => {
  it('normalizes Zotero tags to Obsidian-safe suffixes', () => {
    expect(normalizeZoteroTag(' Diffusion / 360 Panorama!! ')).toBe('diffusion-360-panorama');
  });

  it('preserves non-Zotero tags and replaces only prefixed tags when source tags are available', () => {
    expect(mergeFrontmatterTags({
      existing: ['Paper', 'ToRead', 'Zotero/old-tag'],
      zoteroTags: ['diffusion', 'robotics'],
      zoteroTagsAvailable: true,
      prefix: 'Zotero/',
      preserveNonZoteroTags: true,
    })).toEqual(['Paper', 'ToRead', 'Zotero/diffusion', 'Zotero/robotics']);
  });

  it('does not remove existing Zotero-prefixed tags when tags are unavailable', () => {
    expect(mergeFrontmatterTags({
      existing: ['Paper', 'Zotero/old-tag'],
      zoteroTags: undefined,
      zoteroTagsAvailable: false,
      prefix: 'Zotero/',
      preserveNonZoteroTags: true,
    })).toEqual(['Paper', 'Zotero/old-tag']);
  });
});

describe('filename sanitization', () => {
  it('removes invalid path characters and replaces slashes', () => {
    expect(sanitizeFileName('A/B: <Paper>?*')).toBe('A-B Paper');
    expect(sanitizePathSegment(' 360 / Panorama ')).toBe('360 - Panorama');
  });
});

describe('markdown markers', () => {
  it('replaces only content between markers', () => {
    expect(replaceBetweenMarkers('A\n<!-- S -->\nold\n<!-- E -->\nB', '<!-- S -->', '<!-- E -->', 'new'))
      .toBe('A\n<!-- S -->\nnew\n<!-- E -->\nB');
  });
});

describe('capability detection', () => {
  it('detects tags collections notes and annotations defensively', () => {
    const caps = detectCapabilities([{ key: 'A', data: { title: 'Paper', tags: [{ tag: 'x' }], collections: ['C'], notes: ['n'], annotations: [{ text: 'a' }] } }]);
    expect(caps.tags).toBe(true);
    expect(caps.collections).toBe(true);
    expect(caps.notes).toBe(true);
    expect(caps.annotations).toBe(true);
  });
});

describe('Zotero normalization', () => {
  it('maps Zotero API data and collection paths', () => {
    const item = normalizeZoteroApiItem({ key: 'ABCD1234', data: { title: 'Paper Title', creators: [{ firstName: 'Jane', lastName: 'Lee' }], date: '2024-03-01', DOI: '10/test', tags: [{ tag: 'Diffusion' }], collections: ['COLL'] } }, new Map([['COLL', 'Diffusion/360 Panorama']]));
    expect(item?.zoteroKey).toBe('ABCD1234');
    expect(item?.authors).toEqual(['Jane Lee']);
    expect(item?.year).toBe('2024');
    expect(item?.collections).toEqual(['Diffusion/360 Panorama']);
  });
});

describe('bibliography fallback', () => {
  it('generates a robust simple bibliography', () => {
    expect(simpleBibliography({ zoteroKey: 'A', title: 'Title', year: '2024', authors: ['A Author'], collections: [] }))
      .toContain('A Author (2024). Title.');
  });
});

describe('safety regressions', () => {
  it('uses the appended complete marker pair when an old malformed start marker exists', () => {
    const malformed = 'user text\n<!-- S -->\nimportant body\n';
    const content = ensureSectionDelimiters(malformed, 'Imported', '<!-- S -->', '<!-- E -->');
    expect(replaceBetweenMarkers(content, '<!-- S -->', '<!-- E -->', 'managed'))
      .toBe('user text\n<!-- S -->\nimportant body\n\n## Imported\n\n<!-- S -->\nmanaged\n<!-- E -->\n');
  });

  it('preserves prefixed tags for an item whose source tags are unavailable even if source generally supports tags', () => {
    expect(mergeFrontmatterTags({
      existing: ['Paper', 'Zotero/old-tag'],
      zoteroTags: undefined,
      zoteroTagsAvailable: false,
      prefix: 'Zotero/',
      preserveNonZoteroTags: true,
    })).toEqual(['Paper', 'Zotero/old-tag']);
  });
});
