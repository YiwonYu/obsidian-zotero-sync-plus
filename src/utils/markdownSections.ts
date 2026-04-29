export const NOTES_START = '<!-- ZOTERO_SYNC_NOTES_START -->';
export const NOTES_END = '<!-- ZOTERO_SYNC_NOTES_END -->';
export const ANNOTATIONS_START = '<!-- ZOTERO_SYNC_ANNOTATIONS_START -->';
export const ANNOTATIONS_END = '<!-- ZOTERO_SYNC_ANNOTATIONS_END -->';

export function ensureSectionDelimiters(content: string, sectionName: string, startMarker: string, endMarker: string): string {
  const start = content.lastIndexOf(startMarker);
  const end = start === -1 ? -1 : content.indexOf(endMarker, start + startMarker.length);
  if (start !== -1 && end !== -1) return content;
  const suffix = `\n\n## ${sectionName}\n\n${startMarker}\n${endMarker}\n`;
  return `${content.replace(/\s*$/u, '')}${suffix}`;
}

export function replaceBetweenMarkers(content: string, startMarker: string, endMarker: string, newContent: string): string {
  const start = content.lastIndexOf(startMarker);
  const end = start === -1 ? -1 : content.indexOf(endMarker, start + startMarker.length);
  if (start === -1 || end === -1) {
    throw new Error(`Cannot replace section; markers ${startMarker} and ${endMarker} were not found in order.`);
  }
  const before = content.slice(0, start + startMarker.length);
  const after = content.slice(end);
  const body = newContent.trim().length > 0 ? `\n${newContent.trim()}\n` : '\n';
  return `${before}${body}${after}`;
}
