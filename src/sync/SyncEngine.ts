import { Notice, TFile } from 'obsidian';
import type { App } from 'obsidian';
import type { DataSourceCapabilities, SyncReport, ZoteroItem, ZoteroSyncPlusSettings } from '../types';
import type { ZoteroDataSource } from '../zotero/ZoteroDataSource';
import { createSyncReport, finishSyncReport } from './SyncReport';
import { FolderMapper } from './FolderMapper';
import { FrontmatterUpdater } from './FrontmatterUpdater';
import { ensureFolder, IndexStore } from './IndexStore';
import { NoteMatcher } from './NoteMatcher';
import { ANNOTATIONS_END, ANNOTATIONS_START, ensureSectionDelimiters, NOTES_END, NOTES_START, replaceBetweenMarkers } from '../utils/markdownSections';
import { simpleBibliography } from '../utils/bibliography';
import { stripHtml } from '../zotero/ZoteroNormalizer';

export class SyncEngine {
  private running = false;

  constructor(
    private readonly app: App,
    private readonly settings: ZoteroSyncPlusSettings,
    private readonly dataSourceFactory: () => ZoteroDataSource,
  ) {}

  async syncLibrary(): Promise<SyncReport> {
    if (this.running) {
      const report = createSyncReport();
      report.warnings.push('A sync is already running. Skipped duplicate request.');
      return finishSyncReport(report);
    }
    this.running = true;
    const report = createSyncReport();
    new Notice('Zotero Sync Plus: sync started.');
    try {
      const dataSource = this.dataSourceFactory();
      const capabilities = await dataSource.getCapabilities();
      addCapabilityWarnings(report, capabilities);
      const items = await dataSource.loadItems();
      report.itemsLoaded = items.length;
      const matcher = new NoteMatcher(this.app, this.settings);
      const mapper = new FolderMapper(this.app, this.settings);
      const updater = new FrontmatterUpdater(this.app, this.settings);
      const indexStore = new IndexStore(this.app, this.settings);

      for (const item of items) {
        try {
          const mapping = mapper.folderFor(item, capabilities.collections);
          if (mapping.warning && !report.warnings.includes(mapping.warning)) report.warnings.push(mapping.warning);
          const match = matcher.match(item);
          if (match.conflict) {
            report.conflicts.push(match.conflict);
            report.notesSkipped += 1;
            continue;
          }
          if (match.file) {
            let fileToUpdate = match.file;
            if (this.settings.moveExistingNotes && capabilities.collections) {
              const desiredPath = mapper.desiredPath(item, capabilities.collections);
              if (fileToUpdate.path !== desiredPath && !(await this.app.vault.adapter.exists(desiredPath))) {
                await ensureFolder(this.app, desiredPath.split('/').slice(0, -1).join('/'));
                await this.app.vault.rename(fileToUpdate, desiredPath);
                const moved = this.app.vault.getAbstractFileByPath(desiredPath);
                if (moved instanceof TFile) fileToUpdate = moved;
              }
            }
            if (this.settings.updateExistingMarkdownFrontmatter) {
              await updater.update(fileToUpdate, item, capabilities);
              await indexStore.updateItem(item, fileToUpdate.path);
              report.notesUpdated += 1;
            } else {
              report.notesSkipped += 1;
            }
            continue;
          }
          if (!this.settings.createMissingMarkdownNotes) {
            report.notesSkipped += 1;
            continue;
          }
          const path = await mapper.targetPath(item, capabilities.collections);
          await this.app.vault.create(path, updater.initialMarkdown(item, capabilities));
          await indexStore.updateItem(item, path);
          report.notesCreated += 1;
        } catch (error) {
          report.errors.push(`${item.title}: ${errorMessage(error)}`);
        }
      }
    } catch (error) {
      report.errors.push(errorMessage(error));
    } finally {
      this.running = false;
      finishSyncReport(report);
    }
    notifyReport(report);
    return report;
  }

  async syncCurrentNote(): Promise<SyncReport> {
    const report = createSyncReport();
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      report.errors.push('No active markdown note.');
      return finishSyncReport(report);
    }
    try {
      const dataSource = this.dataSourceFactory();
      const capabilities = await dataSource.getCapabilities();
      const item = await this.findItemForFile(file, dataSource);
      if (!item) throw new Error('Could not match current note to a Zotero item.');
      await new FrontmatterUpdater(this.app, this.settings).update(file, item, capabilities);
      await new IndexStore(this.app, this.settings).updateItem(item, file.path);
      report.itemsLoaded = 1;
      report.notesUpdated = 1;
    } catch (error) {
      report.errors.push(errorMessage(error));
    }
    notifyReport(finishSyncReport(report));
    return report;
  }

  async rebuildIndex(): Promise<SyncReport> {
    const report = createSyncReport();
    const { conflicts } = await new IndexStore(this.app, this.settings).rebuild();
    report.conflicts.push(...conflicts);
    notifyReport(finishSyncReport(report));
    return report;
  }

  async loadItems(): Promise<ZoteroItem[]> {
    return this.dataSourceFactory().loadItems();
  }

  async testConnection(): Promise<string> {
    return this.dataSourceFactory().testConnection();
  }

  async createOrOpenNote(item: ZoteroItem): Promise<TFile | undefined> {
    const dataSource = this.dataSourceFactory();
    const capabilities = await dataSource.getCapabilities();
    const match = new NoteMatcher(this.app, this.settings).match(item);
    if (match.file) {
      await this.app.workspace.getLeaf().openFile(match.file);
      return match.file;
    }
    const mapper = new FolderMapper(this.app, this.settings);
    const path = await mapper.targetPath(item, capabilities.collections);
    const file = await this.app.vault.create(path, new FrontmatterUpdater(this.app, this.settings).initialMarkdown(item, capabilities));
    await new IndexStore(this.app, this.settings).updateItem(item, path);
    await this.app.workspace.getLeaf().openFile(file);
    return file;
  }

  async getCitationKey(item: ZoteroItem): Promise<{ key: string; warning?: string }> {
    if (item.citekey) return { key: item.citekey };
    const dataSource = this.dataSourceFactory();
    const citekey = await dataSource.getCitekey?.(item);
    if (citekey) return { key: citekey };
    return { key: item.zoteroKey, warning: 'Citation key is unavailable; inserted Zotero item key instead.' };
  }

  async getBibliography(item: ZoteroItem): Promise<string> {
    const formatted = await this.dataSourceFactory().getBibliography?.(item);
    return formatted?.replace(/<[^>]+>/gu, '').trim() || simpleBibliography(item);
  }

  async importNotesForCurrentNote(): Promise<void> {
    const file = this.requireActiveFile();
    const dataSource = this.dataSourceFactory();
    const capabilities = await dataSource.getCapabilities();
    if (!capabilities.notes) {
      new Notice('Zotero notes are not available from the current data source. Enable Zotero API or a full export source.');
      return;
    }
    const item = await this.findItemForFile(file, dataSource);
    if (!item) throw new Error('Could not match current note to a Zotero item.');
    const rendered = (item.notes ?? []).map((note) => note.markdown ?? note.text ?? (note.html ? stripHtml(note.html) : '')).filter(Boolean).join('\n\n---\n\n');
    await this.updateDelimitedSection(file, 'Imported Zotero Notes', NOTES_START, NOTES_END, rendered);
    new Notice('Zotero Sync Plus: imported Zotero notes.');
  }

  async importAnnotationsForCurrentNote(): Promise<void> {
    const file = this.requireActiveFile();
    const dataSource = this.dataSourceFactory();
    const capabilities = await dataSource.getCapabilities();
    if (!capabilities.annotations) {
      new Notice('PDF annotations are not available from the current data source. Enable Zotero API/local Zotero support.');
      return;
    }
    const item = await this.findItemForFile(file, dataSource);
    if (!item) throw new Error('Could not match current note to a Zotero item.');
    const rendered = (item.annotations ?? []).map((annotation) => {
      const page = annotation.page ? `### Page ${annotation.page}` : '### Annotation';
      const quote = annotation.text ? `\n> ${annotation.text.replace(/\n/g, '\n> ')}\n` : '';
      const comment = annotation.comment ? `\nComment: ${annotation.comment}\n` : '';
      const color = annotation.color ? `\nColor: ${annotation.color}\n` : '';
      const uri = annotation.zoteroUri ? `\nZotero URI: ${annotation.zoteroUri}\n` : '';
      return `${page}${quote}${comment}${color}${uri}`.trim();
    }).join('\n\n');
    await this.updateDelimitedSection(file, 'Imported PDF Annotations', ANNOTATIONS_START, ANNOTATIONS_END, rendered);
    new Notice('Zotero Sync Plus: imported PDF annotations.');
  }

  private async findItemForFile(file: TFile, dataSource: ZoteroDataSource): Promise<ZoteroItem | undefined> {
    const fm = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
    const zoteroKey = readString(fm[this.settings.zoteroItemKeyFieldName]);
    const citekey = readString(fm[this.settings.citationKeyFieldName]);
    const doi = readString(fm[this.settings.doiFieldName]);
    const title = readString(fm.title);
    const items = await dataSource.loadItems();
    return items.find((item) => item.zoteroKey === zoteroKey)
      ?? items.find((item) => citekey && item.citekey === citekey)
      ?? items.find((item) => doi && item.doi?.toLowerCase() === doi.toLowerCase())
      ?? items.find((item) => title && item.title.toLowerCase().trim() === title.toLowerCase().trim());
  }

  private requireActiveFile(): TFile {
    const file = this.app.workspace.getActiveFile();
    if (!file) throw new Error('No active markdown note.');
    return file;
  }

  private async updateDelimitedSection(file: TFile, sectionName: string, start: string, end: string, body: string): Promise<void> {
    const original = await this.app.vault.read(file);
    const withMarkers = ensureSectionDelimiters(original, sectionName, start, end);
    await this.app.vault.modify(file, replaceBetweenMarkers(withMarkers, start, end, body));
  }
}

function addCapabilityWarnings(report: SyncReport, capabilities: DataSourceCapabilities): void {
  const messages: Record<keyof DataSourceCapabilities, string> = {
    citationMetadata: 'Citation metadata is unavailable from the current data source.',
    zoteroItemKeys: 'Zotero item keys are unavailable from the current data source.',
    citekeys: 'Citekeys are unavailable; Zotero item keys may be used as fallbacks.',
    tags: 'The selected export file does not contain Zotero tags. Tag sync was skipped. Use Zotero API or a full Zotero JSON export.',
    collections: 'The selected export file does not contain Zotero collections. Collection folder sync was skipped.',
    notes: 'Zotero notes are not available from the current data source.',
    annotations: 'PDF annotations are not available from the current data source.',
    bibliographyFormatting: 'Formatted bibliography support is unavailable; simple bibliography fallback will be used.',
  };
  for (const [key, supported] of Object.entries(capabilities) as [keyof DataSourceCapabilities, boolean][]) {
    if (!supported) {
      report.missingCapabilities.push(key);
      report.warnings.push(messages[key]);
    }
  }
}

function notifyReport(report: SyncReport): void {
  if (report.errors.length > 0) new Notice(`Zotero Sync Plus: sync completed with ${report.errors.length} error(s).`);
  else new Notice(`Zotero Sync Plus: sync completed. Created ${report.notesCreated}, updated ${report.notesUpdated}, skipped ${report.notesSkipped}.`);
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
