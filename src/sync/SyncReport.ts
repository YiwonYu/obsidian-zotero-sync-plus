import type { SyncReport } from '../types';

export function createSyncReport(): SyncReport {
  return {
    startedAt: new Date().toISOString(),
    itemsLoaded: 0,
    notesCreated: 0,
    notesUpdated: 0,
    notesSkipped: 0,
    conflicts: [],
    warnings: [],
    errors: [],
    missingCapabilities: [],
  };
}

export function finishSyncReport(report: SyncReport): SyncReport {
  report.finishedAt = new Date().toISOString();
  return report;
}
