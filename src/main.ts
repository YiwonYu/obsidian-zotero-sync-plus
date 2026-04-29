import { Notice, Plugin } from 'obsidian';
import { registerCommands } from './commands/registerCommands';
import { DEFAULT_SETTINGS, normalizeSettings } from './settings';
import { SyncEngine } from './sync/SyncEngine';
import type { ZoteroSyncPlusSettings } from './types';
import { ZoteroSyncPlusSettingTab } from './ui/SettingsTab';
import { LocalExportDataSource } from './zotero/LocalExportDataSource';
import { HybridDataSource, LocalZoteroDataSource, ZoteroApiDataSource } from './zotero/ZoteroApiDataSource';
import type { ZoteroDataSource } from './zotero/ZoteroDataSource';

export default class ZoteroSyncPlusPlugin extends Plugin {
  settings: ZoteroSyncPlusSettings = DEFAULT_SETTINGS;
  engine!: SyncEngine;
  private intervalId: number | undefined;
  private debouncedSync: (() => void) | undefined;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.engine = new SyncEngine(this.app, this.settings, () => this.createDataSource());
    registerCommands(this);
    this.addSettingTab(new ZoteroSyncPlusSettingTab(this.app, this));
    this.configureAutoSync();
    if (this.settings.syncOnStartup) {
      this.app.workspace.onLayoutReady(() => void this.engine.syncLibrary());
    }
  }

  onunload(): void {
    if (this.intervalId !== undefined) window.clearInterval(this.intervalId);
  }

  async loadSettings(): Promise<void> {
    this.settings = normalizeSettings(await this.loadData() as Partial<ZoteroSyncPlusSettings> | null);
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    if (this.engine) this.engine = new SyncEngine(this.app, this.settings, () => this.createDataSource());
    this.configureAutoSync();
  }

  createDataSource(): ZoteroDataSource {
    switch (this.settings.dataSourceMode) {
      case 'localApi':
        return new LocalZoteroDataSource(this.settings);
      case 'hybrid':
        return new HybridDataSource(this.settings);
      case 'localExport':
        return new LocalExportDataSource(this.app, this.settings);
      case 'zoteroApi':
      default:
        return new ZoteroApiDataSource(this.settings);
    }
  }

  private configureAutoSync(): void {
    if (this.intervalId !== undefined) window.clearInterval(this.intervalId);
    this.intervalId = undefined;
    this.debouncedSync = debounce(() => void this.engine.syncLibrary(), 1000);
    if (!this.settings.autoSyncEnabled) return;
    const intervalMs = Math.max(5, this.settings.syncIntervalSeconds) * 1000;
    this.intervalId = window.setInterval(() => {
      if (this.settings.debounceSync) this.debouncedSync?.();
      else void this.engine.syncLibrary();
    }, intervalMs);
    this.registerInterval(this.intervalId);
    new Notice('Zotero Sync Plus: auto-sync enabled.');
  }
}

function debounce(fn: () => void, delayMs: number): () => void {
  let timeout: number | undefined;
  return () => {
    if (timeout !== undefined) window.clearTimeout(timeout);
    timeout = window.setTimeout(fn, delayMs);
  };
}
