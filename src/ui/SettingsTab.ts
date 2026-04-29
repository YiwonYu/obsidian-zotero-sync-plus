import { Notice, PluginSettingTab, Setting } from 'obsidian';
import type { App } from 'obsidian';
import type ZoteroSyncPlusPlugin from '../main';
import type { CitationFormat, DataSourceMode, ZoteroLibraryType } from '../types';

export class ZoteroSyncPlusSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: ZoteroSyncPlusPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Zotero Sync Plus' });
    this.dataSourceSettings(containerEl);
    this.outputSettings(containerEl);
    this.fieldSettings(containerEl);
    this.citationSettings(containerEl);
    this.syncSettings(containerEl);
    this.capabilities(containerEl);
  }

  private dataSourceSettings(el: HTMLElement): void {
    el.createEl('h3', { text: 'Data source settings' });
    new Setting(el).setName('Data source mode').addDropdown((dd) => dd.addOptions({ zoteroApi: 'Zotero Web API', localApi: 'Zotero local API', hybrid: 'Hybrid', localExport: 'Local export JSON' }).setValue(this.plugin.settings.dataSourceMode).onChange(async (value) => { this.plugin.settings.dataSourceMode = value as DataSourceMode; await this.save(); }));
    new Setting(el).setName('Zotero library type').addDropdown((dd) => dd.addOptions({ user: 'User', group: 'Group' }).setValue(this.plugin.settings.libraryType).onChange(async (value) => { this.plugin.settings.libraryType = value as ZoteroLibraryType; await this.save(); }));
    this.text(el, 'Zotero library ID', 'libraryId');
    this.text(el, 'Zotero API key', 'apiKey');
    this.text(el, 'Zotero local API endpoint', 'localApiEndpoint');
    this.text(el, 'Better BibTeX JSON-RPC endpoint', 'betterBibTeXEndpoint');
    this.text(el, 'Local export JSON path', 'localExportJsonPath');
  }

  private outputSettings(el: HTMLElement): void {
    el.createEl('h3', { text: 'Output settings' });
    this.text(el, 'Root output folder', 'rootOutputFolder');
    this.text(el, 'Internal metadata folder', 'internalMetadataFolder');
    this.toggle(el, 'Create collection folders', 'createCollectionFolders');
    this.toggle(el, 'Create missing markdown notes', 'createMissingMarkdownNotes');
    this.toggle(el, 'Update existing markdown frontmatter', 'updateExistingMarkdownFrontmatter');
    this.toggle(el, 'Move existing notes when Zotero collection changes', 'moveExistingNotes');
    this.toggle(el, 'Preserve note body', 'preserveNoteBody');
  }

  private fieldSettings(el: HTMLElement): void {
    el.createEl('h3', { text: 'Field settings' });
    this.text(el, 'Citation key field name', 'citationKeyFieldName');
    this.text(el, 'Zotero item key field name', 'zoteroItemKeyFieldName');
    this.text(el, 'DOI field name', 'doiFieldName');
    this.text(el, 'Collection field name', 'collectionFieldName');
    this.text(el, 'Tag prefix', 'tagPrefix');
    this.toggle(el, 'Preserve non-Zotero tags', 'preserveNonZoteroTags');
  }

  private citationSettings(el: HTMLElement): void {
    el.createEl('h3', { text: 'Citation settings' });
    new Setting(el).setName('Citation format').addDropdown((dd) => dd.addOptions({ pandoc: 'Pandoc', latex: 'LaTeX', plain: 'Plain' }).setValue(this.plugin.settings.citationFormat).onChange(async (value) => { this.plugin.settings.citationFormat = value as CitationFormat; await this.save(); }));
    this.text(el, 'Default pandoc format', 'defaultPandocFormat');
    this.text(el, 'Default latex format', 'defaultLatexFormat');
  }

  private syncSettings(el: HTMLElement): void {
    el.createEl('h3', { text: 'Sync settings' });
    new Setting(el).setName('Sync interval in seconds').addText((text) => text.setValue(String(this.plugin.settings.syncIntervalSeconds)).onChange(async (value) => { this.plugin.settings.syncIntervalSeconds = Number.parseInt(value, 10) || 30; await this.save(); }));
    this.toggle(el, 'Auto-sync enabled', 'autoSyncEnabled');
    this.toggle(el, 'Debounce sync', 'debounceSync');
    this.toggle(el, 'Sync on Obsidian startup', 'syncOnStartup');
    new Setting(el).setName('Manual sync').addButton((button) => button.setButtonText('Sync Library').setCta().onClick(() => this.plugin.engine.syncLibrary()));
    new Setting(el).setName('Test Zotero connection').addButton((button) => button.setButtonText('Test').onClick(async () => new Notice(await this.plugin.engine.testConnection())));
    new Setting(el).setName('Rebuild index').addButton((button) => button.setButtonText('Rebuild').onClick(() => this.plugin.engine.rebuildIndex()));
  }

  private async capabilities(el: HTMLElement): Promise<void> {
    el.createEl('h3', { text: 'Capability indicator' });
    const holder = el.createDiv({ text: 'Loading capabilities...' });
    try {
      const caps = await this.plugin.createDataSource().getCapabilities();
      holder.empty();
      for (const [key, value] of Object.entries(caps)) holder.createDiv({ text: `${key}: ${value ? 'yes' : 'no'}` });
    } catch (error) {
      holder.setText(`Unable to load capabilities: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private text<K extends keyof ZoteroSyncPlusPlugin['settings']>(el: HTMLElement, name: string, key: K): void {
    new Setting(el).setName(name).addText((text) => text.setValue(String(this.plugin.settings[key] ?? '')).onChange(async (value) => { (this.plugin.settings[key] as string) = value; await this.save(); }));
  }

  private toggle<K extends keyof ZoteroSyncPlusPlugin['settings']>(el: HTMLElement, name: string, key: K): void {
    new Setting(el).setName(name).addToggle((toggle) => toggle.setValue(Boolean(this.plugin.settings[key])).onChange(async (value) => { (this.plugin.settings[key] as boolean) = value; await this.save(); }));
  }

  private async save(): Promise<void> {
    await this.plugin.saveSettings();
    this.display();
  }
}
