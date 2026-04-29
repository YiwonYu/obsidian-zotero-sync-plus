import { requestUrl } from 'obsidian';

interface JsonRpcResponse<T> {
  result?: T;
  error?: { message?: string };
}

export class BetterBibTeXClient {
  constructor(private readonly endpoint: string) {}

  async isAvailable(): Promise<boolean> {
    try {
      await this.call('api.ready', []);
      return true;
    } catch {
      return false;
    }
  }

  async citationKeys(itemKeys: string[]): Promise<Record<string, string>> {
    return this.call<Record<string, string>>('item.citationkey', [itemKeys]);
  }

  async bibliography(citekeys: string[], format = { contentType: 'text', id: 'apa', locale: 'en-US', quickCopy: false }): Promise<string> {
    return this.call<string>('item.bibliography', [citekeys, format]);
  }

  async search(terms: string): Promise<unknown[]> {
    const result = await this.call<unknown>('item.search', [terms]);
    return Array.isArray(result) ? result : [];
  }

  private async call<T>(method: string, params: unknown[]): Promise<T> {
    const response = await requestUrl({
      url: this.endpoint,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
    });
    if (response.status < 200 || response.status >= 300) throw new Error(`Better BibTeX request failed (${response.status})`);
    const json = response.json as JsonRpcResponse<T>;
    if (json.error) throw new Error(json.error.message ?? 'Better BibTeX JSON-RPC error');
    if (json.result === undefined) throw new Error('Better BibTeX returned no result');
    return json.result;
  }
}
