import { requestUrl } from 'obsidian';
import type { ZoteroLibraryType } from '../types';

export interface ZoteroApiClientOptions {
  libraryType: ZoteroLibraryType;
  libraryId: string;
  apiKey?: string;
  endpoint?: string;
}

export class ZoteroApiClient {
  private readonly baseUrl: string;
  private readonly prefix: string;
  private readonly apiKey?: string;
  private readonly localRequest: boolean;

  constructor(options: ZoteroApiClientOptions) {
    this.baseUrl = (options.endpoint ?? 'https://api.zotero.org').replace(/\/$/u, '');
    this.prefix = `${options.libraryType === 'group' ? 'groups' : 'users'}/${options.libraryId}`;
    this.apiKey = options.apiKey || undefined;
    this.localRequest = /^https?:\/\/(127\.0\.0\.1|localhost)(?::|\/|$)/u.test(this.baseUrl);
  }

  async getTopLevelItems(): Promise<unknown[]> {
    return this.getPaginated(`${this.prefix}/items/top`, { format: 'json' });
  }

  async getCollections(): Promise<unknown[]> {
    return this.getPaginated(`${this.prefix}/collections`, { format: 'json' });
  }

  async getItemChildren(itemKey: string): Promise<unknown[]> {
    return this.getPaginated(`${this.prefix}/items/${encodeURIComponent(itemKey)}/children`, { format: 'json' });
  }

  async getBibliography(itemKey: string, style = 'apa', locale = 'en-US'): Promise<string> {
    return this.getText(`${this.prefix}/items/${encodeURIComponent(itemKey)}`, { format: 'bib', style, locale });
  }

  async test(): Promise<string> {
    await this.getPaginated(`${this.prefix}/items/top`, { format: 'json', limit: '1' }, 1);
    return 'Zotero API connection succeeded.';
  }

  async getPaginated(path: string, params: Record<string, string> = {}, requestedLimit = 100): Promise<unknown[]> {
    const limit = Math.min(requestedLimit, 100);
    const out: unknown[] = [];
    let start = 0;
    let total: number | undefined;
    for (;;) {
      const response = await this.getJson(path, { ...params, limit: String(limit), start: String(start) });
      const items = Array.isArray(response.data) ? response.data : [response.data];
      out.push(...items);
      total = parseHeaderNumber(response.headers, 'Total-Results') ?? total;
      if (items.length < limit) break;
      start += items.length;
      if (total !== undefined && start >= total) break;
    }
    return out;
  }

  private async getJson(path: string, params: Record<string, string>): Promise<{ data: unknown; headers: Record<string, string> }> {
    const url = this.url(path, params);
    const response = await requestUrl({ url, method: 'GET', headers: this.headers() });
    if (response.status < 200 || response.status >= 300) throw new Error(`Zotero API request failed (${response.status}) for ${path}`);
    return { data: response.json, headers: response.headers ?? {} };
  }

  private async getText(path: string, params: Record<string, string>): Promise<string> {
    const response = await requestUrl({ url: this.url(path, params), method: 'GET', headers: this.headers() });
    if (response.status < 200 || response.status >= 300) throw new Error(`Zotero API request failed (${response.status}) for ${path}`);
    return response.text;
  }

  private url(path: string, params: Record<string, string>): string {
    const url = new URL(`${this.baseUrl}/${path.replace(/^\//u, '')}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    return url.toString();
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { 'Zotero-API-Version': '3' };
    if (this.apiKey) headers['Zotero-API-Key'] = this.apiKey;
    if (this.localRequest) headers['Zotero-Allowed-Request'] = '1';
    return headers;
  }
}

function parseHeaderNumber(headers: Record<string, string>, name: string): number | undefined {
  const found = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];
  const parsed = found ? Number.parseInt(found, 10) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}
