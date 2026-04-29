import { Modal, Notice, Setting, SuggestModal } from 'obsidian';
import type { App, Editor } from 'obsidian';
import type { ZoteroItem } from '../types';
import { formatCitation } from '../utils/bibliography';
import type ZoteroSyncPlusPlugin from '../main';

export type SearchMode = 'actions' | 'open' | 'citation' | 'bibliography';

export class ZoteroSearchModal extends SuggestModal<ZoteroItem> {
  private items: ZoteroItem[] = [];

  constructor(app: App, private readonly plugin: ZoteroSyncPlusPlugin, private readonly mode: SearchMode, private readonly editor?: Editor) {
    super(app);
    this.setPlaceholder('Search Zotero items by title, author, year, citekey, DOI, or tag...');
  }

  override async onOpen(): Promise<void> {
    super.onOpen();
    try {
      this.items = await this.plugin.engine.loadItems();
    } catch (error) {
      new Notice(`Zotero Sync Plus: failed to load items: ${error instanceof Error ? error.message : String(error)}`);
      this.close();
    }
  }

  getSuggestions(query: string): ZoteroItem[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.items.slice(0, 50);
    return this.items.filter((item) => searchableText(item).includes(q)).slice(0, 50);
  }

  renderSuggestion(item: ZoteroItem, el: HTMLElement): void {
    el.createEl('div', { text: item.title });
    el.createEl('small', { text: [item.authors.join(', '), item.year, item.citekey, item.itemType].filter(Boolean).join(' · ') });
  }

  async onChooseSuggestion(item: ZoteroItem): Promise<void> {
    if (this.mode === 'open') {
      await this.plugin.engine.createOrOpenNote(item);
      return;
    }
    if (this.mode === 'citation') {
      await this.insertCitation(item);
      return;
    }
    if (this.mode === 'bibliography') {
      await this.insertBibliography(item);
      return;
    }
    new ZoteroItemActionModal(this.app, this.plugin, item, this.editor).open();
  }

  private async insertCitation(item: ZoteroItem): Promise<void> {
    if (!this.editor) return;
    const result = await this.plugin.engine.getCitationKey(item);
    if (result.warning) new Notice(result.warning);
    this.editor.replaceSelection(formatCitation(result.key, this.plugin.settings.citationFormat, this.plugin.settings.defaultPandocFormat, this.plugin.settings.defaultLatexFormat));
  }

  private async insertBibliography(item: ZoteroItem): Promise<void> {
    if (!this.editor) return;
    this.editor.replaceSelection(await this.plugin.engine.getBibliography(item));
  }
}

class ZoteroItemActionModal extends Modal {
  constructor(app: App, private readonly plugin: ZoteroSyncPlusPlugin, private readonly item: ZoteroItem, private readonly editor?: Editor) {
    super(app);
  }

  onOpen(): void {
    this.contentEl.empty();
    this.contentEl.createEl('h2', { text: this.item.title });
    this.contentEl.createEl('p', { text: [this.item.authors.join(', '), this.item.year, this.item.citekey].filter(Boolean).join(' · ') });
    new Setting(this.contentEl).setName('Open or create note').addButton((button) => button.setButtonText('Open/Create').setCta().onClick(async () => { await this.plugin.engine.createOrOpenNote(this.item); this.close(); }));
    new Setting(this.contentEl).setName('Insert citation').addButton((button) => button.setButtonText('Insert').onClick(async () => { if (this.editor) { const result = await this.plugin.engine.getCitationKey(this.item); this.editor.replaceSelection(formatCitation(result.key, this.plugin.settings.citationFormat, this.plugin.settings.defaultPandocFormat, this.plugin.settings.defaultLatexFormat)); } this.close(); }));
    new Setting(this.contentEl).setName('Insert bibliography').addButton((button) => button.setButtonText('Insert').onClick(async () => { if (this.editor) this.editor.replaceSelection(await this.plugin.engine.getBibliography(this.item)); this.close(); }));
    new Setting(this.contentEl).setName('Import Zotero notes').addButton((button) => button.setButtonText('Import for current note').onClick(async () => { await this.plugin.engine.importNotesForCurrentNote(); this.close(); }));
    new Setting(this.contentEl).setName('Import PDF annotations').addButton((button) => button.setButtonText('Import for current note').onClick(async () => { await this.plugin.engine.importAnnotationsForCurrentNote(); this.close(); }));
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

function searchableText(item: ZoteroItem): string {
  return [item.title, item.authors.join(' '), item.year, item.citekey, item.doi, ...(item.tags ?? [])].filter(Boolean).join(' ').toLowerCase();
}
