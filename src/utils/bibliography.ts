import type { ZoteroItem, CitationFormat } from '../types';

export function formatCitation(citekey: string, format: CitationFormat, pandocTemplate: string, latexTemplate: string): string {
  if (format === 'latex') return latexTemplate.replace(/citekey/g, citekey);
  if (format === 'plain') return citekey;
  return pandocTemplate.replace(/citekey/g, citekey);
}

export function simpleBibliography(item: ZoteroItem): string {
  const authors = item.authors.length > 0 ? item.authors.join(', ') : 'Unknown author';
  const year = item.year ? ` (${item.year}).` : '.';
  const title = item.title ? ` ${item.title}.` : '';
  const venue = item.publicationTitle ? ` ${item.publicationTitle}.` : '';
  const doiOrUrl = item.doi ? ` DOI: ${item.doi}.` : item.url ? ` ${item.url}` : '';
  return `${authors}${year}${title}${venue}${doiOrUrl}`.replace(/\s+/g, ' ').trim();
}
