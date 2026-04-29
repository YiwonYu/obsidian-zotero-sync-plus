const INVALID_FILE_CHARS = /[<>:"\\|?*\u0000-\u001F]/g;

export function sanitizePathSegment(input: string, fallback = 'Untitled'): string {
  const cleaned = input
    .replace(INVALID_FILE_CHARS, '')
    .replace(/\//g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '')
    .slice(0, 120);
  return cleaned.length > 0 ? cleaned : fallback;
}

export function sanitizeFileName(input: string, fallback = 'Untitled'): string {
  return sanitizePathSegment(input, fallback).replace(/#+/g, '').trim() || fallback;
}

export function joinPath(...parts: string[]): string {
  return parts
    .flatMap((part) => part.split('/'))
    .map((part) => part.trim())
    .filter(Boolean)
    .join('/');
}

export function basenameWithoutExtension(path: string): string {
  const base = path.split('/').pop() ?? path;
  return base.replace(/\.md$/i, '');
}

export function normalizeTitleForMatch(title: string): string {
  return title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}
